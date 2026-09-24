// api.js — Gorent Admin API client.
//
// Talks to the NestJS backend. Handles token storage, login/logout, and
// `bootstrap()` which loads every dataset the dashboard reads and publishes it
// onto the same `window.*` globals the ported prototype already consumes — so
// the UI components keep working unchanged, now backed by live data.

const BASE =
  // Runtime (EasyPanel env var API_URL → written by env.sh → loaded as /env.js).
  (typeof window !== 'undefined' && window.__GORENT_CONFIG__?.apiUrl) ||
  // Build-time fallback (Vite dev server / local npm run dev).
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  'http://localhost:3001/api';

const TOKEN_KEY = 'gorent_token';
const USER_KEY = 'gorent_user';

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function setToken(t) {
  try { localStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ }
}
function currentUser() {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
}
function isAuthed() {
  return !!getToken();
}
function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); } catch { /* ignore */ }
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Resources written since the last refresh ("payments", "contracts", …) — so a
// refresh can reload what those writes can have changed instead of all of it.
const touched = new Set();
const resourceOf = (path) => (String(path).split('?')[0].split('/').filter(Boolean)[0] || '');

async function request(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET') touched.add(resourceOf(path));
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const res = await fetch(BASE + path, { ...options, headers });
  if (res.status === 204) return null;

  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || res.statusText || 'Xatolik';
    throw new ApiError(Array.isArray(msg) ? msg.join(', ') : msg, res.status);
  }
  return data;
}

const get = (path) => request(path);
const post = (path, body) => request(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
const put = (path, body) => request(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
const patch = (path, body) => request(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
// A body on DELETE is unusual but the collection notes need one: removing a
// note records WHY, and the reason has nowhere else to travel.
const del = (path, body) => request(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined });

// Multipart upload — must NOT set Content-Type (the browser adds the boundary).
//
// `fields` rides alongside the file for endpoints that need both. The bank
// statement import is the reason: the operator's row-to-tenant choices travel
// with the statement itself, so the server can re-read every amount from the
// bank's own file instead of trusting numbers posted back by the browser.
// Objects and arrays are JSON-encoded — multipart carries only strings.
async function upload(path, file, fields = null, fieldName = 'file') {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const fd = new FormData();
  fd.append(fieldName, file);
  for (const [k, v] of Object.entries(fields || {})) {
    if (v === undefined || v === null) continue;
    fd.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  const res = await fetch(BASE + path, { method: 'POST', headers, body: fd });
  const text = await res.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || res.statusText || 'Xatolik';
    throw new ApiError(Array.isArray(msg) ? msg.join(', ') : msg, res.status);
  }
  return data;
}

// Fetch an auth-gated file as a blob URL (an <a href>/<img src> can't send the
// bearer token, so we fetch then hand back an object URL the caller can open).
async function fileBlobUrl(path) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { headers });
  if (!res.ok) {
    // The case documents refuse with a reason ("Avval talabnoma qadamini
    // kiriting"); show that rather than a generic line when the body has it.
    let msg = 'Faylni yuklab bo‘lmadi';
    try {
      const d = JSON.parse(await res.text());
      if (d && d.message) msg = Array.isArray(d.message) ? d.message.join(', ') : d.message;
    } catch { /* not JSON — keep the generic line */ }
    throw new ApiError(msg, res.status);
  }
  return URL.createObjectURL(await res.blob());
}

// Save an auth-gated endpoint straight to the user's downloads. An <a href>
// can't carry the bearer token, so fetch it, hand the blob to a synthetic
// link, and let the server's Content-Disposition name it (falling back to
// `filename` when the header isn't readable).
async function downloadFile(path, filename) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { headers });
  if (!res.ok) {
    let msg = res.statusText || 'Yuklab bo‘lmadi';
    try {
      const d = JSON.parse(await res.text());
      if (d && d.message) msg = Array.isArray(d.message) ? d.message.join(', ') : d.message;
    } catch { /* not JSON — keep the status text */ }
    throw new ApiError(msg, res.status);
  }
  const cd = res.headers.get('Content-Disposition') || '';
  const m = /filename="?([^"]+)"?/.exec(cd);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = (m && m[1]) || filename || 'export.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in Safari; a tick is enough.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Broker authority (a rendering hint, never the authority) ─────────
//
// What the logged-in broker may do, and for which owner. Loaded once by
// bootstrap() from `/agents/me/hosts`, which reports the mandates the server
// resolved for that very request.
//
// This decides only what to DRAW. The authority is AgentGuard + canActFor on
// the server, which re-reads live mandates on every single call precisely so a
// revocation bites immediately — a copy cached in a browser tab is exactly the
// thing that reasoning refuses to trust, and nothing here asks it to be
// trusted. Which is also why a failed load fails OPEN: a broker shown a button
// they may not use gets a clear refusal from the server, where a broker whose
// screen went read-only because of one flaky request has no idea what happened.
let mandate = null; // { union, byHost } for an agent · null for everyone else

async function loadMandate() {
  mandate = null;
  if (currentUser()?.role !== 'agent') return;
  try {
    const r = await get('/agents/me/hosts');
    mandate = {
      union: new Set(r.capabilities || []),
      byHost: new Map((r.hosts || []).map((h) => [h.hostId, new Set(h.capabilities || [])])),
    };
  } catch { mandate = null; /* fail open — see above */ }
}

// May the current user do `cap`? Pass `hostId` to ask about one owner's
// property; without it the answer is the union across every live mandate,
// which is the most an honest answer can be when the caller has no owner in
// hand. Always true for platform and host accounts — mandates do not narrow
// them, and their own access is settled by role and host scope as before.
function can(cap, hostId) {
  if (!mandate) return true;
  if (hostId) return !!mandate.byHost.get(hostId)?.has(cap);
  return mandate.union.has(cap);
}

async function login(email, password) {
  const res = await post('/auth/login', { email, password });
  setToken(res.accessToken);
  try { localStorage.setItem(USER_KEY, JSON.stringify(res.user)); } catch { /* ignore */ }
  return res.user;
}

function logout() {
  clearToken();
  if (typeof location !== 'undefined') location.reload();
}

// Load all datasets the dashboard renders, then publish onto window globals.
const EMPTY_DEBTORS = { totals: { outstanding: 0, prepaid: 0, prepaidCount: 0, debtorCount: 0 }, rows: [], prepaid: [] };

// Every dataset the dashboard reads, by name: how to fetch it and where it
// goes. They load IN PARALLEL — the platform-only lists and /debtors used to
// wait one after another behind everything else.
//
// Platform-only endpoints (settings carry commission rates and the seller's
// bank requisites; hosts, payouts, invoices and companies are platform lists)
// resolve to a fallback for everyone else — a 403 must never break a host's
// bootstrap. The notification feed is scoped per host on the server.
function loaders(role) {
  const platform = role === 'platform';
  const only = (path, fallback) => (platform ? get(path).catch(() => fallback) : Promise.resolve(fallback));
  return {
    overview: async () => {
      const overview = await get('/overview');
      window.KPIS = overview.kpis;
      window.COUNTS = overview.counts || null;
      window.revenueSeries = overview.revenueSeries;
      window.bookingsSeries = overview.bookingsSeries;
      window.byCategory = overview.byCategory;
      if (overview.totals) {
        window.totalRevenue = overview.totals.totalRevenue;
        window.totalBookings = overview.totals.totalBookings;
        window.activeBookings = overview.totals.activeBookings;
        window.avgOccupancy = overview.totals.avgOccupancy;
        window.spaceOccupancy = overview.totals.spaceOccupancy || null;
        window.pendingApproval = overview.totals.pendingApproval;
        window.avgRating = overview.totals.avgRating;
      }
    },
    meta: async () => { window.META = await get('/meta').catch(() => null); },
    buildings: async () => { window.BUILDINGS = await get('/buildings'); },  // each includes offerings
    products: async () => { window.PRODUCTS = await get('/products'); },     // global catalog + own offerings
    units: async () => { window.UNITS = await get('/units'); },              // + offering, effectivePrice
    bookings: async () => { window.BOOKINGS = await get('/bookings'); },
    reviews: async () => { window.REVIEWS = await get('/reviews'); },
    notifs: async () => { window.NOTIFS = await get('/notifications').catch(() => []); },
    settings: async () => { window.SETTINGS = await only('/settings', null); },
    integrations: async () => { window.INTEGRATIONS = await get('/integrations').catch(() => []); },
    hosts: async () => { window.HOSTS = await only('/hosts', []); },
    payouts: async () => { window.PAYOUTS = await only('/payouts', []); },
    invoices: async () => { window.INVOICES = await only('/invoices', []); },
    companies: async () => { window.COMPANIES = await only('/companies', []); },
    // Receivables for Qarzdorlik + the nav badge; host-scoped on the server.
    debtors: async () => { window.DEBTORS = await get('/debtors').catch(() => EMPTY_DEBTORS); },
  };
}

// Which datasets a write to each resource can change. A resource missing
// from this map reloads EVERYTHING — the safe answer for a write nobody
// thought about, so a new endpoint can make a refresh slower but never stale.
const MONEY = ['debtors', 'overview', 'notifs'];
const AFFECTS = {
  bookings: ['bookings', 'units', 'buildings', 'overview', 'debtors', 'invoices', 'notifs'],
  contracts: ['bookings', 'debtors', 'invoices', 'notifs'],
  payments: [...MONEY, 'invoices', 'bookings'],
  charges: [...MONEY, 'invoices', 'bookings'],
  invoices: ['invoices', ...MONEY],
  bank: [...MONEY, 'invoices', 'companies', 'bookings'],
  collection: MONEY,
  'debt-notes': MONEY,
  blacklist: ['companies', 'debtors', 'bookings'],
  companies: ['companies', 'bookings', 'debtors'],
  buildings: ['buildings', 'products', 'units', 'overview'],
  offerings: ['buildings', 'products', 'units', 'overview'],
  units: ['units', 'buildings', 'products', 'overview'],
  products: ['products', 'buildings', 'units', 'overview'],
  reviews: ['reviews', 'overview'],
  hosts: ['hosts', 'buildings'],
  payouts: ['payouts'],
  'payout-statements': ['payouts'],
  settings: ['settings'],
  integrations: ['integrations'],
  notifications: ['notifs'],
  users: [],
  agents: ['hosts'],
  sms: ['notifs'],
};

/**
 * Load datasets onto the window globals the screens read. With no argument,
 * all of them (sign-in, reload). With a list, only those.
 */
async function bootstrap(only) {
  // Before anything renders — the UI asks `can()` while drawing its first frame.
  await loadMandate();
  const all = loaders(currentUser()?.role);
  const names = only ? only.filter((n) => all[n]) : Object.keys(all);
  await Promise.all(names.map((n) => all[n]()));
  touched.clear();
}

/** Reload what the writes since the last refresh can have changed. */
async function refreshTouched() {
  const resources = [...touched];
  if (!resources.length) return bootstrap();
  if (resources.some((r) => !(r in AFFECTS))) return bootstrap();
  const names = [...new Set(resources.flatMap((r) => AFFECTS[r]))];
  if (!names.length) { touched.clear(); return; }
  return bootstrap(names);
}

export const api = {
  // Public: service status, incl. whether this install is the demo.
  health: () => get('/health'),
  BASE,
  getToken, setToken, clearToken, currentUser, isAuthed,
  get, post, put, patch, del, upload, fileBlobUrl, downloadFile,
  login, logout, bootstrap, refreshTouched,
  can,
  ApiError,
};
