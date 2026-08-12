import { reportsTutorial } from './configs/reportsTutorial';
import type { TutorialConfig } from './tutorialTypes';

export const TUTORIALS = {
  'reports-analytics': reportsTutorial,
} satisfies Record<string, TutorialConfig>;

export type TutorialId = Extract<keyof typeof TUTORIALS, string>;

export function getTutorial(id: string): TutorialConfig | null {
  return id in TUTORIALS ? TUTORIALS[id as TutorialId] : null;
}
