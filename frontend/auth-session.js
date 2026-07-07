(function () {
  const TOKEN_KEYS = ["token", "accessToken", "authToken"];
  const USER_KEYS = ["user", "role", "userRole"];

  const parseJwt = (jwt) => {
    if (!jwt || typeof jwt !== "string") return null;
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;

    try {
      const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  };

  const safeParseJson = (value) => {
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  };

  const getToken = () => {
    for (const key of TOKEN_KEYS) {
      const value = localStorage.getItem(key);
      if (value) return value;
    }
    return null;
  };

  const isTokenExpired = (token) => {
    const payload = parseJwt(token);
    if (!payload?.exp) return false;
    return payload.exp * 1000 <= Date.now();
  };

  const clear = () => {
    [...TOKEN_KEYS, ...USER_KEYS].forEach((key) => localStorage.removeItem(key));
  };

  const getUser = (token = getToken()) => {
    if (!token) return null;

    const storedRole = localStorage.getItem("role") || localStorage.getItem("userRole");
    const storedUser = safeParseJson(localStorage.getItem("user"));
    if (storedUser) {
      if (!storedUser.role && storedRole) storedUser.role = storedRole;
      return storedUser;
    }

    const payload = parseJwt(token);
    if (!payload) return null;

    return {
      name: payload.name || payload.username || payload.email || null,
      email: payload.email || null,
      role: payload.role || payload.userRole || storedRole || null,
    };
  };

  const getSession = ({ clearExpired = true } = {}) => {
    const token = getToken();
    const hasStoredIdentity = USER_KEYS.some((key) => localStorage.getItem(key));

    if (!token) {
      if (clearExpired && hasStoredIdentity) clear();
      return { token: null, user: null, expired: false };
    }

    if (token && isTokenExpired(token)) {
      if (clearExpired) clear();
      return { token: null, user: null, expired: true };
    }
    return { token, user: getUser(token), expired: false };
  };

  const redirectToLogin = () => {
    clear();
    window.location.href = "login.html?expired=1";
  };

  window.AuthSession = {
    clear,
    getSession,
    getToken,
    getUser,
    isTokenExpired,
    parseJwt,
    redirectToLogin,
  };

  // Shared across every page that includes this script: shows the
  // "Dashboard" nav link only for logged-in users (student or landlord).
  document.addEventListener("DOMContentLoaded", () => {
    const dashboardLink = document.getElementById("dashboardNavLink");
    if (!dashboardLink) return;

    const { user: sessionUser } = getSession({ clearExpired: false });
    dashboardLink.style.display = sessionUser ? "" : "none";
  });
}());