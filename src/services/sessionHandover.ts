// #286: entre a confirmação da troca de email (que revoga as sessões antigas) e a restauração da sessão nova pelo
// cookie, um 401 do token antigo não pode encerrar a sessão. O prazo evita que a pausa fique presa.
const HANDOVER_MAX_MS = 20_000;
let activeUntil = 0;

export function beginSessionHandover() {
  activeUntil = Date.now() + HANDOVER_MAX_MS;
}

export function endSessionHandover() {
  activeUntil = 0;
}

export function isSessionHandoverActive() {
  return Date.now() < activeUntil;
}
