import { downloadUserArquivo } from '../../services';

export function useUserDocuments(sessionToken: string) {
  return {
    download: (userId: number, arquivoId: number) =>
      downloadUserArquivo(userId, arquivoId, sessionToken),
  };
}
