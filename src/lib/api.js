// ============================================================
// api.js — All HTTP calls to the WhisperBox backend
//
// WHY STRUCTURED THIS WAY:
// - One place for all API logic — if the base URL changes, change it here
// - Handles token refresh automatically so you don't have to think about it
// - Never leaks tokens or sensitive data to console
// ============================================================

const BASE_URL = "https://whisperbox.koyeb.app";

// ─── TOKEN STORAGE ──────────────────────────────────────────
// Access token: in memory only (most secure — gone on tab close)
// Refresh token: sessionStorage (survives page reload, not cross-tab)
// We do NOT use localStorage because that persists indefinitely
// and is accessible to any JS on the page.

let _accessToken = null;
let _refreshToken = sessionStorage.getItem("wb_refresh") || null;

export function setTokens({ access_token, refresh_token }) {
  _accessToken = access_token;
  if (refresh_token) {
    _refreshToken = refresh_token;
    sessionStorage.setItem("wb_refresh", refresh_token);
  }
}

export function clearTokens() {
  _accessToken = null;
  _refreshToken = null;
  sessionStorage.removeItem("wb_refresh");
}

export function getAccessToken() {
  return _accessToken;
}

export function getRefreshToken() {
  return _refreshToken;
}

export function hasSession() {
  return !!_refreshToken;
}

// ─── CORE FETCH WRAPPER ─────────────────────────────────────
// Automatically:
// - Adds Authorization header
// - Handles 401 by refreshing the token once, then retrying
// - Throws on non-OK responses with the error detail

async function request(path, options = {}, retry = true) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (_accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Token expired — try to refresh once, then retry the original request
  if (res.status === 401 && retry && _refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return request(path, options, false); // retry once
    } else {
      clearTokens();
      throw new Error("SESSION_EXPIRED");
    }
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {}
    throw new Error(detail);
  }

  // 204 No Content — return null
  if (res.status === 204) return null;

  return res.json();
}

// ─── AUTH ────────────────────────────────────────────────────

export async function register({
  username,
  display_name,
  password,
  public_key,
  wrapped_private_key,
  pbkdf2_salt,
}) {
  const data = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      username,
      display_name,
      password,
      public_key,
      wrapped_private_key,
      pbkdf2_salt,
    }),
  });
  setTokens(data);
  return data;
}

export async function login({ username, password }) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setTokens(data);
  return data;
}

export async function logout() {
  try {
    await request("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: _refreshToken }),
    });
  } finally {
    clearTokens();
  }
}

export async function getMe() {
  return request("/auth/me");
}

async function refreshAccessToken() {
  try {
    const data = await request(
      "/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({ refresh_token: _refreshToken }),
      },
      false,
    ); // don't retry refresh itself
    _accessToken = data.access_token;
    return true;
  } catch {
    return false;
  }
}

// ─── USERS ──────────────────────────────────────────────────

export async function searchUsers(query) {
  return request(`/users/search?q=${encodeURIComponent(query)}`);
}

export async function getUserPublicKey(userId) {
  const data = await request(`/users/${userId}/public-key`);
  return data.public_key; // base64 string
}

// ─── CONVERSATIONS & MESSAGES ────────────────────────────────

export async function getConversations() {
  return request("/conversations");
}

export async function getMessages(userId, { limit = 50, before } = {}) {
  let path = `/conversations/${userId}/messages?limit=${limit}`;
  if (before) path += `&before=${encodeURIComponent(before)}`;
  return request(path);
}

export async function sendMessageRest(toUserId, payload) {
  return request("/messages", {
    method: "POST",
    body: JSON.stringify({ to: toUserId, payload }),
  });
}
