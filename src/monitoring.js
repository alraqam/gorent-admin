// Error reporting for the admin (Sentry), off unless a DSN is configured.
//
// The DSN comes from the runtime config (env.sh writes SENTRY_DSN_ADMIN into
// /env.js), so turning it on is an EasyPanel env var, not a rebuild. The SDK
// is loaded lazily and only when there is a DSN: an install without one does
// not download it at all.
//
// What is sent: the error, the stack, the screen's URL path, and the user's
// id and role. Not their email or name, and no request bodies: this panel
// handles tenants' passport data and debts.

const config = (typeof window !== 'undefined' && window.__GORENT_CONFIG__) || {};
const DSN = config.sentryDsn || (import.meta.env && import.meta.env.VITE_SENTRY_DSN) || '';

let sentry = null;
const early = []; // errors reported before the SDK finished loading

export const monitoringOn = !!DSN;

if (DSN) {
  import('@sentry/react').then((S) => {
    S.init({
      dsn: DSN,
      environment: config.sentryEnv || 'production',
      release: config.release || undefined,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      // Query strings can carry ids and search terms; the path is enough.
      beforeSend(event) {
        if (event.request?.url) event.request.url = event.request.url.split('?')[0];
        if (event.request) delete event.request.cookies;
        return event;
      },
    });
    sentry = S;
    for (const [error, extra] of early.splice(0)) S.captureException(error, { extra });
  }).catch(() => { /* reporting is best-effort */ });
}

export function reportError(error, extra) {
  if (!DSN) return;
  if (sentry) sentry.captureException(error, { extra });
  else if (early.length < 20) early.push([error, extra]);
}

export function setMonitoringUser(user) {
  if (!sentry) return;
  sentry.setUser(user ? { id: user.id, role: user.role } : null);
}
