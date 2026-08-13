export function stopTutorialNarration() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function pauseTutorialNarration() {
  if ('speechSynthesis' in window && typeof window.speechSynthesis.pause === 'function') window.speechSynthesis.pause();
}

export function resumeTutorialNarration() {
  if ('speechSynthesis' in window && typeof window.speechSynthesis.resume === 'function') window.speechSynthesis.resume();
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
