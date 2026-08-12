export function stopTutorialNarration() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function speakTutorialNarration(text: string) {
  if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return false;
  stopTutorialNarration();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = 0.96;
  const voice = window.speechSynthesis.getVoices().find((candidate) => candidate.lang.toLowerCase() === 'pt-br');
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
  return true;
}

