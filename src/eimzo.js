// eimzo.js — minimal client for the local E-IMZO (CAPIWS) desktop/browser agent
// used to sign ESF documents before they're submitted to didox.uz.
//
// The agent listens on https://127.0.0.1:64443 (self-signed cert — the browser
// must trust it once, see e-imzo.uz setup docs) and speaks a simple
// {plugin, name, arguments} JSON protocol over POST /frontend.
//
// NOTE: this protocol has NOT been exercised against a real E-IMZO agent in
// this environment. The plugin/method names and argument order below follow
// the documented CAPIWS contract (pfx.list_all_certificates, pfx.load_key,
// pkcs7.create_pkcs7), but CONFIRM end-to-end with a real agent + certificate
// before relying on this for production signing.

const CAPIWS_URL = 'https://127.0.0.1:64443/frontend';

async function call(plugin, name, args = []) {
  let res;
  try {
    res = await fetch(CAPIWS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plugin, name, arguments: args }),
    });
  } catch {
    throw new Error("E-IMZO agenti topilmadi. E-IMZO dasturi ishga tushirilganini tekshiring.");
  }
  if (!res.ok) throw new Error(`E-IMZO agenti xatosi: HTTP ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.reason || "E-IMZO: noma'lum xatolik");
  return data;
}

// Pings the agent. Returns false if E-IMZO isn't running locally.
export async function isAvailable() {
  try {
    await call('pfx', 'list_all_certificates');
    return true;
  } catch {
    return false;
  }
}

// Returns the list of certificates available in the agent (each with
// {disk, path, name, alias, serialNumber, validTo, ...}).
export async function listCertificates() {
  const data = await call('pfx', 'list_all_certificates');
  return data.certificates || [];
}

// Signs `base64` (a base64-encoded document) with `cert` (an entry returned
// by listCertificates) and returns the resulting PKCS7 signature, base64
// encoded — this is what gets posted to POST /invoices/:id/sign.
export async function signBase64(base64, cert) {
  const loaded = await call('pfx', 'load_key', [cert.disk, cert.path, cert.name, cert.alias]);
  const keyId = loaded.keyId ?? loaded.id;
  const signed = await call('pkcs7', 'create_pkcs7', [base64, keyId, true]);
  return signed.pkcs7_64;
}

export const eimzo = { isAvailable, listCertificates, signBase64 };
