import { hasPreferenceConsent } from '../../shared/privacy/consentStorage';

const COMPLETED_KEY = 'hemodinks.tutorials.completed';
const HIDDEN_KEY = 'hemodinks.tutorials.hidden';
const NARRATION_KEY = 'hemodinks.tutorials.narration-enabled';

function readIds(key: string) {
  if (!hasPreferenceConsent()) return new Set<string>();
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '[]');
    return new Set(Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

function writeIds(key: string, ids: Set<string>) {
  if (!hasPreferenceConsent()) return;
  localStorage.setItem(key, JSON.stringify([...ids]));
}

export function getCompletedTutorials() {
  return readIds(COMPLETED_KEY);
}

export function markTutorialCompleted(id: string) {
  const ids = readIds(COMPLETED_KEY);
  ids.add(id);
  writeIds(COMPLETED_KEY, ids);
}

export function isTutorialHidden(id: string) {
  return readIds(HIDDEN_KEY).has(id);
}

export function setTutorialHidden(id: string, hidden: boolean) {
  const ids = readIds(HIDDEN_KEY);
  if (hidden) ids.add(id);
  else ids.delete(id);
  writeIds(HIDDEN_KEY, ids);
}

export function isTutorialNarrationEnabled() {
  if (!hasPreferenceConsent()) return true;
  return localStorage.getItem(NARRATION_KEY) !== 'false';
}

export function setTutorialNarrationEnabled(enabled: boolean) {
  if (!hasPreferenceConsent()) return;
  localStorage.setItem(NARRATION_KEY, String(enabled));
}
