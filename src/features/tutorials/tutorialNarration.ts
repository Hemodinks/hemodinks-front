import type { TutorialConfig, TutorialNarration, TutorialStep } from './tutorialTypes';
import { tutorialPronunciations } from './tutorialPronunciations';

export function getTutorialNarration(step: TutorialStep): TutorialNarration {
  return typeof step.narration === 'string' ? { text: step.narration } : step.narration;
}

export function getStableStepId(tutorialId: string, stepId: string) {
  return `${tutorialId}.${stepId}`;
}

function hasPronunciationTerm(text: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|\\s|[.,;:!?()])${escaped}(?=$|\\s|[.,;:!?()])`, 'u').test(text);
}

export function defineStaticAudioTutorial(config: TutorialConfig, audioDirectory: string): TutorialConfig {
  return {
    ...config,
    version: 2,
    steps: config.steps.map((step) => {
      const narrationText = typeof step.narration === 'string' ? step.narration : null;
      return {
        ...step,
        narration: narrationText ? {
          text: narrationText,
          audio: `/tutorials/audio/${audioDirectory}/${step.id}.mp3`,
          pronunciationKeys: Object.keys(tutorialPronunciations).filter((key) => hasPronunciationTerm(narrationText, key) && tutorialPronunciations[key as keyof typeof tutorialPronunciations] !== key),
        } as TutorialNarration : step.narration,
        interaction: step.interaction ?? (step.action === 'click'
          ? { type: 'click' as const, target: step.target }
          : { type: 'none' as const }),
      };
    }),
  };
}
