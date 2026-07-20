const ACCESS_TOKEN_KEY = "refind_access_token";
const REFRESH_TOKEN_KEY = "refind_refresh_token";

type AuthChangeListener = () => void;
const authListeners = new Set<AuthChangeListener>();

function emitAuthChange(): void {
  authListeners.forEach((listener) => listener());
}

export function subscribeAuthChange(listener: AuthChangeListener): () => void {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  emitAuthChange();
}

export function clearTokens(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  emitAuthChange();
}

export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}
