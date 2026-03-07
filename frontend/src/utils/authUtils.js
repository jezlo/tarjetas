/**
 * Returns the current user object stored in localStorage, or an empty object
 * if none is found or parsing fails.
 */
export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

/**
 * Returns true if the current user has the admin role.
 */
export function isAdmin() {
  return Boolean(getCurrentUser().is_admin);
}

/**
 * Returns true if the current user has a valid access token stored.
 * Note: Token expiration is enforced server-side; API calls with an
 * expired token will receive a 401 response and redirect to login.
 */
export function isAuthenticated() {
  return Boolean(localStorage.getItem('access_token'));
}
