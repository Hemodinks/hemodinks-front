import { apiClient } from './api';

const SESSION_KEY = 'hemodinks-warmed';
let attempted = false;

/** One best-effort attempt per tab session, independent of auth and clinic context. */
export async function warmupApi(): Promise<void> {
  if (import.meta.env.VITE_WARMUP_ENABLED === 'false' || attempted) return;
  attempted = true;
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    // Record before HTTP, so concurrent calls and reloads cannot duplicate it.
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // Storage may be blocked. The in-memory guard still prevents repeated calls.
  }

  try {
    // Direct client avoids the business helpers that attach clinic/auth headers.
    await apiClient.get('/api/warmup', { timeout: 90_000, withCredentials: false });
  } catch {
    // Keep the attempt flag even on failure; no retries or UI/auth side effects.
  }
}
