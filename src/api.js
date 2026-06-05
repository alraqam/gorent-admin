// api.js — Gorent Admin API client.
//
// Talks to the NestJS backend. Handles token storage, login/logout, and
// `bootstrap()` which loads every dataset the dashboard reads and publishes it
// onto the same `window.*` globals the ported prototype already consumes — so
// the UI components keep working unchanged, now backed by live data.

const BASE =
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
const del = (path) => request(path, { method: 'DELETE' });

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
  const [overview, products, hosts, bookings, reviews, notifs, settings, integrations] = await Promise.all([
    get('/overview'),
    get('/products'),
    get('/hosts'),
    get('/bookings'),
    get('/reviews'),
    get('/notifications'),
    get('/settings'),
    get('/integrations'),
  ]);

  window.SETTINGS = settings;
  window.INTEGRATIONS = integrations;

  // Payouts are platform-only — skip (empty) for host accounts.
  let payouts = [];
  if (role === 'platform') {
    try { payouts = await get('/payouts'); } catch { payouts = []; }
  }

  window.PRODUCTS = products;
  window.HOSTS = hosts;
  window.BOOKINGS = bookings;
  window.REVIEWS = reviews;
  window.PAYOUTS = payouts;
  window.NOTIFS = notifs;

  window.KPIS = overview.kpis;
  window.revenueSeries = overview.revenueSeries;
  window.bookingsSeries = overview.bookingsSeries;
  window.byCategory = overview.byCategory;
  if (overview.totals) {
    window.totalRevenue = overview.totals.totalRevenue;
    window.totalBookings = overview.totals.totalBookings;
    window.activeBookings = overview.totals.activeBookings;
    window.avgOccupancy = overview.totals.avgOccupancy;
    window.pendingApproval = overview.totals.pendingApproval;
    window.avgRating = overview.totals.avgRating;
  }
}

export const api = {
  BASE,
  getToken, setToken, clearToken, currentUser, isAuthed,
  get, post, put, patch, del,
  login, logout, bootstrap,
  ApiError,
};
