export function AuthWaitMessage({ message }: { message?: string }) {
  return message ? <p id="auth-wait-status" className="login-session-status" role="status" aria-live="polite" aria-atomic="true">{message}</p> : null;
}
