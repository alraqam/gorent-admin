// eimzo.js — client for the local E-IMZO (CAPIWS) agent, used to sign ESF
// documents before they're submitted to didox.uz.
//
// PROTOCOL (verified against a running agent, 2026-08-01):
//   The agent speaks WEBSOCKET at wss://127.0.0.1:64443/service/cryptapi.
//   It is NOT an HTTP JSON endpoint — POST /frontend returns 404, which is what
//   the previous implementation called, so signing could never have worked.
//
//   Every request is {plugin, name, arguments}; every reply carries `success`
//   and, on failure, `reason` + `status`.
//
// DOMAIN API KEY. Before any operation the agent demands an apikey handshake:
//   {name:'apikey', arguments:[domain1, key1, domain2, key2…]}   <- NO plugin
// The plugin field must be OMITTED here; sending plugin:'apikey' makes the
// agent answer "Функция не найдена или версия E-IMZO устарела", which reads
// like a version problem and isn't one.
//   Without it the agent answers
//     {"success":false,"status":-1022,"reason":"API-key для домена … недействителен"}
//   Keys are issued per domain by E-IMZO — a domain that has not been
//   registered with them cannot sign, no matter what the code does. Populate
//   window.EIMZO_KEYS (see admin/index.html) with the pairs they issue.
//
// The agent's certificate is self-signed, so the browser must trust
// https://127.0.0.1:64443 once — E-IMZO's installer normally handles this.

const CAPIWS_URL = 'wss://127.0.0.1:64443/service/cryptapi';
const TIMEOUT_MS = 15000;

// [domain, key, domain, key, …] — supplied at runtime so a new deployment
// domain doesn't need a rebuild. Empty until E-IMZO issues keys.
function apiKeys() {
  const k = (typeof window !== 'undefined' && window.EIMZO_KEYS) || [];
  return Array.isArray(k) ? k : [];
}

export class EimzoError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code; // 'no-agent' | 'no-apikey' | 'agent-error'
  }
}

// One connection per exchange: the agent is local, so the handshake is cheap,
// and a short-lived socket avoids holding a WebSocket open across a page's life.
function session(run) {
  return new Promise((resolve, reject) => {
    let ws;
    try {
      ws = new WebSocket(CAPIWS_URL);
    } catch {
      reject(new EimzoError(agentMissingMessage(), 'no-agent'));
      return;
    }
    const pending = [];
    let settled = false;
    const finish = (fn, v) => { if (!settled) { settled = true; try { ws.close(); } catch {} fn(v); } };

    const timer = setTimeout(
      () => finish(reject, new EimzoError('E-IMZO agenti javob bermadi (vaqt tugadi).', 'no-agent')),
      TIMEOUT_MS,
    );

    ws.onmessage = (e) => {
      const next = pending.shift();
      if (!next) return;
      let data;
      try { data = JSON.parse(e.data); } catch { next.reject(new EimzoError('E-IMZO: javobni o‘qib bo‘lmadi.', 'agent-error')); return; }
      if (data.success === false) {
        // -1022 is specifically "this domain has no valid API key".
        const isKey = data.status === -1022 || /API-key/i.test(data.reason || '');
        next.reject(new EimzoError(isKey ? apiKeyMessage(data.reason) : (data.reason || 'E-IMZO: noma’lum xatolik'), isKey ? 'no-apikey' : 'agent-error'));
        return;
      }
      next.resolve(data);
    };
    // A refused connection is indistinguishable from a closed one here; both
    // mean the agent isn't reachable.
    ws.onerror = () => finish(reject, new EimzoError(agentMissingMessage(), 'no-agent'));
    ws.onclose = () => { clearTimeout(timer); if (!settled) finish(reject, new EimzoError(agentMissingMessage(), 'no-agent')); };

    // `plugin` omitted entirely when null — the apikey handshake is addressed
    // by name alone and rejects a request carrying a plugin field.
    const call = (plugin, name, args = []) =>
      new Promise((res, rej) => {
        pending.push({ resolve: res, reject: rej });
        const msg = plugin ? { plugin, name, arguments: args } : { name, arguments: args };
        ws.send(JSON.stringify(msg));
      });

    ws.onopen = async () => {
      try {
        const keys = apiKeys();
        if (keys.length) await call(null, 'apikey', keys);
        const out = await run(call);
        clearTimeout(timer);
        finish(resolve, out);
      } catch (err) {
        clearTimeout(timer);
        finish(reject, err);
      }
    };
  });
}

function agentMissingMessage() {
  return "E-IMZO agenti topilmadi. E-IMZO dasturini ishga tushiring va https://127.0.0.1:64443 sertifikatiga ishonch bildirilganini tekshiring.";
}

function apiKeyMessage(reason) {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  return (
    `E-IMZO bu domen uchun ro‘yxatdan o‘tmagan (${host}). ` +
    'E-IMZO dan shu domen uchun API kalit oling va uni sozlamalarga qo‘shing. ' +
    (reason ? `(${reason})` : '')
  );
}

// Pings the agent. Returns false if E-IMZO isn't reachable OR this domain has
// no API key — both mean signing cannot proceed here.
export async function isAvailable() {
  try {
    await listCertificates();
    return true;
  } catch {
    return false;
  }
}

// Certificates in the agent's keystore. `pfx.list_all_certificates` is the
// documented call; `keys.list_all_keys` is the older name some builds expose.
export async function listCertificates() {
  return session(async (call) => {
    let data;
    try {
      data = await call('pfx', 'list_all_certificates');
    } catch (e) {
      if (e.code === 'no-apikey') throw e;
      data = await call('keys', 'list_all_keys');
    }
    return data.certificates || data.keys || [];
  });
}

// The subject DN E-IMZO returns in `alias` is a flat "k=v,k=v" string. The
// fields that matter for picking a signer:
//   1.2.860.3.16.1.1  organisation TIN (absent on a personal certificate)
//   1.2.860.3.16.1.2  individual PINFL
//   o                 organisation name · cn  holder name · validto  expiry
export function parseCert(cert) {
  const a = cert.alias || '';
  const get = (k) => {
    const m = new RegExp(`(?:^|,)${k.replace(/\./g, '\.')}=([^,]*)`).exec(a);
    return m ? m[1].trim() : '';
  };
  const validTo = get('validto');
  return {
    raw: cert,
    tin: get('1\.2\.860\.3\.16\.1\.1'),
    pinfl: get('1\.2\.860\.3\.16\.1\.2'),
    org: get('o'),
    name: get('cn'),
    validTo,
    // "2027.02.26 11:31:37" — not Date-parseable as-is.
    expired: validTo ? new Date(validTo.replace(/\./g, '-').replace(' ', 'T')) < new Date() : false,
  };
}

// The certificate that may sign for `tin`. An ESF must be signed by the
// SELLER's own key: the UI previously took certificates[0], which on a machine
// holding several keys is whichever E-IMZO happened to list first — typically a
// personal certificate belonging to someone else entirely.
export function pickCertificate(certs, tin) {
  const parsed = certs.map(parseCert);
  const usable = parsed.filter((c) => !c.expired);
  const match = usable.find((c) => c.tin && tin && c.tin === String(tin).trim());
  if (match) return match;
  const expiredMatch = parsed.find((c) => c.tin && tin && c.tin === String(tin).trim());
  if (expiredMatch) {
    throw new EimzoError(
      `E-IMZO sertifikati muddati tugagan (${expiredMatch.org || expiredMatch.name}, ${expiredMatch.validTo}).`,
      'cert-expired',
    );
  }
  throw new EimzoError(
    `STIR ${tin} uchun E-IMZO sertifikati topilmadi. Mavjud: ` +
      (parsed.map((c) => c.org || c.name).filter(Boolean).join(', ') || 'yo‘q'),
    'cert-not-found',
  );
}

// Signs `base64` with `cert` and returns the PKCS7 signature (base64) that
// POST /invoices/:id/sign expects. Attached signature (detached = false), since
// didox verifies the document against the signature it carries.
export async function signBase64(base64, cert) {
  return session(async (call) => {
    const loaded = await call('pfx', 'load_key', [cert.disk, cert.path, cert.name, cert.alias]);
    const keyId = loaded.keyId ?? loaded.id;
    const signed = await call('pkcs7', 'create_pkcs7', [base64, keyId, 'no']);
    return signed.pkcs7_64 ?? signed.pkcs7;
  });
}

export const eimzo = { isAvailable, listCertificates, signBase64, parseCert, pickCertificate, EimzoError };
