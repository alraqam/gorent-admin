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

async function request(path, options = {}) {
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
async function upload(path, file, fieldName = 'file') {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const fd = new FormData();
  fd.append(fieldName, file);
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
  if (!res.ok) throw new ApiError('Faylni yuklab bo‘lmadi', res.status);
  return URL.createObjectURL(await res.blob());
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
async function bootstrap() {
  const role = currentUser()?.role;
  const [overview, meta, buildings, products, units, bookings, reviews, notifs, settings, integrations] = await Promise.all([
    get('/overview'),
    get('/meta').catch(() => null),
    get('/buildings'),
    get('/products'),
    get('/units'),
    get('/bookings'),
    get('/reviews'),
    get('/notifications'),
    get('/settings'),
    get('/integrations'),
  ]);

  window.SETTINGS = settings;
  window.INTEGRATIONS = integrations;
  window.META = meta;

  // Hosts directory, payouts, invoices and companies are platform-only —
  // a 403 here must never break the host account's bootstrap.
  let hosts = [];
  let payouts = [];
  let invoices = [];
  let companies = [];
  if (role === 'platform') {
    try { hosts = await get('/hosts'); } catch { hosts = []; }
    try { payouts = await get('/payouts'); } catch { payouts = []; }
    try { invoices = await get('/invoices'); } catch { invoices = []; }
    try { companies = await get('/companies'); } catch { companies = []; }
  }

  // Receivables snapshot for the Qarzdorlik screen + nav badge. Host-scoped
  // server-side, so both platform and host accounts fetch it.
  try {
    window.DEBTORS = await get('/debtors');
  } catch {
    window.DEBTORS = { totals: { outstanding: 0, prepaid: 0, debtorCount: 0 }, rows: [] };
  }

  window.BUILDINGS = buildings;   // each includes offerings: [{product, units, price, status}]
  window.PRODUCTS = products;     // global catalog — each includes offerings + building
  window.UNITS = units;           // each includes offering (product+building) + effectivePrice
  window.HOSTS = hosts;
  window.BOOKINGS = bookings;
  window.REVIEWS = reviews;
  window.PAYOUTS = payouts;
  window.INVOICES = invoices;
  window.COMPANIES = companies;
  window.NOTIFS = notifs;

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
}

export const api = {
  BASE,
  getToken, setToken, clearToken, currentUser, isAuthed,
  get, post, put, patch, del, upload, fileBlobUrl,
  login, logout, bootstrap,
  ApiError,
};
