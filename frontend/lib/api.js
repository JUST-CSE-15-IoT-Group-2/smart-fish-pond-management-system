/**
 * Shared API utility for the FPMS frontend.
 *
 * Two fetch helpers:
 *   apiFetch     — sends cookies (for auth-protected routes)
 *   publicFetch  — no credentials (for public routes; required when CORS origin is *)
 */

const API_URL = typeof window !== 'undefined'
  ? `http://${window.location.hostname}:5000`
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');

// For auth-protected endpoints (cookie-based JWT)
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// For public endpoints — no credentials (compatible with CORS origin: *)
async function publicFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const authApi = {
  me: () => apiFetch('/api/auth/me'),
  logout: () => apiFetch('/api/auth/logout', { method: 'POST' }),
  // googleLoginUrl must be computed at runtime so it uses the correct hostname
  get googleLoginUrl() {
    return typeof window !== 'undefined'
      ? `http://${window.location.hostname}:5000/api/auth/google`
      : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/google`;
  },
  get devLoginUrl() {
    return typeof window !== 'undefined'
      ? `http://${window.location.hostname}:5000/api/auth/dev-login`
      : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/dev-login`;
  },
};

// Sensor endpoints are public — use publicFetch
export const sensorsApi = {
  latest: () => publicFetch('/api/sensors/latest'),
  readings: (type, limit = 24) =>
    publicFetch(`/api/sensors/readings?type=${type}&limit=${limit}`),
};

export const controlsApi = {
  // Feeding — no auth required (backend uses optionalAuth)
  getFeeding: () => publicFetch('/api/controls/feeding'),
  setFeeding: (times) =>
    publicFetch('/api/controls/feeding', {
      method: 'PUT',
      body: JSON.stringify({ times }),
    }),
  setFeedingDuration: (durationMinutes) =>
    publicFetch('/api/controls/feeding/duration', {
      method: 'PUT',
      body: JSON.stringify({ durationMinutes }),
    }),
  setManualMode: (manualMode) =>
    publicFetch('/api/controls/feeding/manual', {
      method: 'PUT',
      body: JSON.stringify({ manualMode }),
    }),
  setManualActive: (manualActive) =>
    publicFetch('/api/controls/feeding/manual/active', {
      method: 'PUT',
      body: JSON.stringify({ manualActive }),
    }),
  // Motor — always public
  getMotor: () => publicFetch('/api/controls/motor'),
  setMotor: (update) =>
    publicFetch('/api/controls/motor', {
      method: 'PUT',
      body: JSON.stringify(update),
    }),
};

export const settingsApi = {
  get: () => apiFetch('/api/settings'),
  save: (data) =>
    apiFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export const accountApi = {
  get: () => apiFetch('/api/account'),
  regenerateKey: () =>
    apiFetch('/api/account/regenerate-key', { method: 'POST' }),
};

export const notificationsApi = {
  getVapidKey: () => publicFetch('/api/notifications/vapid-public-key'),
  subscribe: (subscription) =>
    apiFetch('/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription }),
    }),
};

export default apiFetch;
