import { confirmPasswordReset } from "../../services";

export function usePasswordResetConfirmation() {
  return {
    confirm: (token: string, password: string) =>
      confirmPasswordReset(token, password),
  };
}
