import { setTimeout as delay } from 'node:timers/promises';
import { tutorialVoiceConfig } from '../../src/features/tutorials/tutorialVoiceConfig';

export function requireAzureSpeechEnvironment() {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) throw new Error('Defina AZURE_SPEECH_KEY e AZURE_SPEECH_REGION no ambiente. Nenhuma credencial deve usar prefixo VITE_.');
  return { key, region, voice: process.env.AZURE_SPEECH_VOICE || tutorialVoiceConfig.defaultVoice };
}

function azureError(status: number, detail: string) {
  if (status === 400) return `SSML ou configuração de voz inválida (400): ${detail}`;
  if (status === 401) return 'Credencial do Azure Speech inválida ou expirada (401).';
  if (status === 403) return 'Credencial sem autorização para sintetizar voz (403).';
  if (status === 429) return 'Limite de requisições ou quota do Azure Speech atingido (429).';
  if (status >= 500) return `Serviço Azure Speech indisponível (${status}).`;
  return `Azure Speech respondeu com HTTP ${status}: ${detail}`;
}

export async function synthesizeAzureMp3(ssml: string) {
  const { key, region } = requireAzureSpeechEnvironment();
  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml; charset=utf-8',
        'X-Microsoft-OutputFormat': tutorialVoiceConfig.outputFormat,
        'User-Agent': 'HemoDinks-Tutorial-Audio-Generator',
      }, body: ssml });
      if (response.ok) return Buffer.from(await response.arrayBuffer());
      const detail = (await response.text()).slice(0, 300).replaceAll(key, '[REDACTED]');
      const message = azureError(response.status, detail);
      if (response.status !== 429 && response.status < 500) throw new Error(message);
      lastError = new Error(message);
    } catch (error) {
      lastError = error;
      if (error instanceof Error && /\((400|401|403)\)/.test(error.message)) throw error;
    }
    if (attempt < 3) await delay(500 * (2 ** (attempt - 1)));
  }
  throw new Error(`Falha após 3 tentativas: ${lastError instanceof Error ? lastError.message : 'erro de conectividade'}`);
}
