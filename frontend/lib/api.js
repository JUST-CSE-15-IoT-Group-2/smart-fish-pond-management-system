/**
 * Shared API utility for the FPMS frontend.
 *
 * Two fetch helpers:
 *   apiFetch     — sends cookies (for auth-protected routes)
 *   publicFetch  — no credentials (for public routes; required when CORS origin is *)
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
  googleLoginUrl: `${API_URL}/api/auth/google`,
};

// Sensor endpoints are public — use publicFetch
export const sensorsApi = {
  latest: () => publicFetch('/api/sensors/latest'),
  readings: (type, limit = 24) =>
    publicFetch(`/api/sensors/readings?type=${type}&limit=${limit}`),
};

export const controlsApi = {
  getFeeding: () => apiFetch('/api/controls/feeding'),
  setFeeding: (times) =>
    apiFetch('/api/controls/feeding', {
      method: 'PUT',
      body: JSON.stringify({ times }),
    }),
  // Motor is a public global device — no auth needed
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

export default apiFetch;
