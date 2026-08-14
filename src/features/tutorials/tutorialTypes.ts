import type { Alignment, Side } from 'driver.js';
import type { AppView } from '../../appTypes';

export type TutorialStepAction = 'continue' | 'click';

export type TutorialNarration = {
  text: string;
  audio?: `/tutorials/audio/${string}.mp3`;
  ssml?: string;
  pronunciationKeys?: string[];
};

export type TutorialInteraction =
  | { type: 'click'; target: string }
  | { type: 'fill'; target: string; value: string }
  | { type: 'select'; target: string; value: string }
  | { type: 'wait'; target?: string }
  | { type: 'none' };

export type TutorialStep = {
  id: string;
  target: `[data-tour="${string}"]`;
  title: string;
  objective: string;
  narration: string | TutorialNarration;
  action: TutorialStepAction;
  interaction?: TutorialInteraction;
  side?: Side;
  align?: Alignment;
};

export type TutorialConfig = {
  id: string;
  view: AppView | 'login';
  title: string;
  description: string;
  version?: number;
  preflightAllTargets?: boolean;
  steps: TutorialStep[];
};
