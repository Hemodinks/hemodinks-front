import { ApiError } from '../../services/api';
import { getErrorMessage } from '../../shared/utils/formatters';

export function getLoginErrorMessage(error: unknown) {
  if (error instanceof ApiError && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')) {
    return 'O servidor não respondeu dentro do tempo de espera. Isso não significa que seu e-mail ou senha estejam incorretos. Aguarde alguns instantes e tente entrar novamente.';
  }
  if (error instanceof ApiError && (error.code === 'ERR_NETWORK' || [502, 503, 504].includes(error.status ?? 0))) {
    return 'Não foi possível conectar ao serviço de acesso agora. Ele pode estar iniciando ou temporariamente indisponível. Verifique sua conexão e tente entrar novamente em instantes.';
  }
  return getErrorMessage(error);
}
