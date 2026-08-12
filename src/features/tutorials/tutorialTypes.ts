import type { Alignment, Side } from 'driver.js';
import type { AppView } from '../../appTypes';

export type TutorialStepAction = 'continue' | 'click';

export type TutorialStep = {
  id: string;
  target: `[data-tour="${string}"]`;
  title: string;
  objective: string;
  narration: string;
  action: TutorialStepAction;
  side?: Side;
  align?: Alignment;
};

export type TutorialConfig = {
  id: string;
  view: AppView | 'login';
  title: string;
  description: string;
  preflightAllTargets?: boolean;
  steps: TutorialStep[];
};
