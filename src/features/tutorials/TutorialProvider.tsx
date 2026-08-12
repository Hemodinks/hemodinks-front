import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { driver, type Driver, type PopoverDOM } from 'driver.js';
import 'driver.js/dist/driver.css';
import type { AppView } from '../../appTypes';
import { getTutorial, TUTORIALS, type TutorialId } from './tutorialRegistry';
import { getCompletedTutorials, isTutorialHidden, markTutorialCompleted, setTutorialHidden } from './tutorialStorage';
import { speakTutorialNarration, stopTutorialNarration } from './speech';
import type { TutorialConfig, TutorialStep } from './tutorialTypes';
import './tutorials.css';

type TutorialContextValue = {
  activeTutorialId: string | null;
  completedTutorials: Set<string>;
  dismissNotice: () => void;
  getTutorialForView: (view: AppView) => TutorialConfig | null;
  notice: string;
  startTutorial: (id: string) => void;
};

const TutorialContext = createContext<TutorialContextValue | null>(null);

type Props = {
  activeView: AppView;
  allowedTutorialIds: TutorialId[];
  children: ReactNode;
};

function addButton(container: HTMLElement, label: string, onClick: () => void, pressed?: boolean) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tutorial-control-button';
  button.textContent = label;
  button.setAttribute('aria-label', label);
  if (pressed != null) button.setAttribute('aria-pressed', String(pressed));
  button.addEventListener('click', onClick);
  container.appendChild(button);
  return button;
}

function supportsReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function TutorialProvider({ activeView, allowedTutorialIds, children }: Props) {
  const driverRef = useRef<Driver | null>(null);
  const voiceEnabledRef = useRef(true);
  const activeStepRef = useRef<TutorialStep | null>(null);
  const completingRef = useRef(false);
  const missingTargetRef = useRef(false);
  const [activeTutorialId, setActiveTutorialId] = useState<string | null>(null);
  const [completedTutorials, setCompletedTutorials] = useState(() => getCompletedTutorials());
  const [notice, setNotice] = useState('');

  const stop = useCallback(() => {
    stopTutorialNarration();
    driverRef.current?.destroy();
    driverRef.current = null;
  }, []);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    if (activeTutorialId && getTutorial(activeTutorialId)?.view !== activeView) stop();
  }, [activeTutorialId, activeView, stop]);

  const renderExtraControls = useCallback((popover: PopoverDOM, tutorial: TutorialConfig) => {
    const step = activeStepRef.current;
    if (!step) return;

    popover.closeButton.setAttribute('aria-label', 'Sair do tutorial');
    popover.previousButton.setAttribute('aria-label', 'Voltar para a etapa anterior');
    popover.nextButton.setAttribute('aria-label', step.id === tutorial.steps.at(-1)?.id ? 'Concluir tutorial' : 'Continuar tutorial');

    const existing = popover.wrapper.querySelector('.tutorial-extra-controls');
    existing?.remove();
    const controls = document.createElement('section');
    controls.className = 'tutorial-extra-controls';
    controls.setAttribute('aria-label', 'Controles da narração');

    const voiceButton = addButton(
      controls,
      voiceEnabledRef.current ? 'Pausar narração' : 'Ativar narração',
      () => {
        voiceEnabledRef.current = !voiceEnabledRef.current;
        voiceButton.textContent = voiceEnabledRef.current ? 'Pausar narração' : 'Ativar narração';
        voiceButton.setAttribute('aria-label', voiceButton.textContent);
        voiceButton.setAttribute('aria-pressed', String(voiceEnabledRef.current));
        if (voiceEnabledRef.current) speakTutorialNarration(step.narration);
        else stopTutorialNarration();
      },
      voiceEnabledRef.current,
    );
    addButton(controls, 'Repetir narração', () => {
      voiceEnabledRef.current = true;
      voiceButton.textContent = 'Pausar narração';
      voiceButton.setAttribute('aria-label', 'Pausar narração');
      voiceButton.setAttribute('aria-pressed', 'true');
      speakTutorialNarration(step.narration);
    });

    const preference = document.createElement('label');
    preference.className = 'tutorial-hide-preference';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isTutorialHidden(tutorial.id);
    checkbox.setAttribute('aria-label', 'Não mostrar este tutorial novamente');
    checkbox.addEventListener('change', () => setTutorialHidden(tutorial.id, checkbox.checked));
    preference.append(checkbox, document.createTextNode('Não mostrar novamente'));
    controls.appendChild(preference);
    popover.footer.before(controls);
  }, []);

  const startTutorial = useCallback((id: string) => {
    const tutorial = getTutorial(id);
    if (!tutorial || !allowedTutorialIds.some((allowedId) => allowedId === id) || tutorial.view !== activeView) {
      setNotice('Este tutorial não está disponível para o perfil ou para a tela atual.');
      return;
    }

    const missingStep = tutorial.steps.find((step) => !document.querySelector(step.target));
    if (missingStep) {
      setNotice(`Não encontramos a área “${missingStep.title}” nesta tela. A missão foi encerrada com segurança.`);
      return;
    }

    stop();
    setNotice('');
    setActiveTutorialId(id);
    completingRef.current = false;
    missingTargetRef.current = false;
    voiceEnabledRef.current = true;
    const reducedMotion = supportsReducedMotion();
    const handleTutorialKeyDown = (event: KeyboardEvent) => {
      const activeDriver = driverRef.current;
      const activeStep = activeStepRef.current;
      if (!activeDriver?.isActive() || !activeStep || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        activeDriver.destroy();
      } else if (event.key === 'ArrowLeft' && activeDriver.hasPreviousStep()) {
        event.preventDefault();
        activeDriver.movePrevious();
      } else if (event.key === 'ArrowRight' && activeStep.action === 'continue') {
        event.preventDefault();
        if (activeDriver.hasNextStep()) activeDriver.moveNext();
        else {
          completingRef.current = true;
          activeDriver.destroy();
        }
      }
    };
    document.addEventListener('keydown', handleTutorialKeyDown);
    const tutorialDriver = driver({
      animate: false,
      smoothScroll: !reducedMotion,
      allowClose: true,
      allowScroll: true,
      allowKeyboardControl: false,
      overlayClickBehavior: () => undefined,
      overlayColor: '#0f172a',
      overlayOpacity: 0.76,
      stagePadding: 8,
      stageRadius: 12,
      popoverClass: 'tutorial-mission-popover',
      showProgress: true,
      progressText: 'Etapa {{current}} de {{total}}',
      nextBtnText: 'Continuar',
      prevBtnText: 'Voltar',
      doneBtnText: 'Concluir',
      onHighlightStarted: (element, driveStep, options) => {
        const step = driveStep.data?.tutorialStep as TutorialStep | undefined;
        activeStepRef.current = step ?? null;
        document.querySelectorAll('.tutorial-target-action').forEach((target) => target.classList.remove('tutorial-target-action'));
        if (!element || !step) {
          missingTargetRef.current = true;
          window.setTimeout(() => options.driver.destroy(), 0);
          return;
        }
        if (step.action === 'click') element.classList.add('tutorial-target-action');
        if (voiceEnabledRef.current) speakTutorialNarration(step.narration);
      },
      onPopoverRender: (popover) => renderExtraControls(popover, tutorial),
      onDoneClick: (_element, _step, options) => {
        completingRef.current = true;
        options.driver.destroy();
      },
      onDestroyed: () => {
        document.removeEventListener('keydown', handleTutorialKeyDown);
        stopTutorialNarration();
        document.querySelectorAll('.tutorial-target-action').forEach((target) => target.classList.remove('tutorial-target-action'));
        driverRef.current = null;
        setActiveTutorialId(null);
        if (missingTargetRef.current) {
          setNotice('Um elemento necessário não está disponível. A missão foi encerrada sem afetar a aplicação.');
        } else if (completingRef.current) {
          markTutorialCompleted(tutorial.id);
          setCompletedTutorials(getCompletedTutorials());
          setNotice('Missão concluída! Você já sabe consultar e interpretar os relatórios.');
        }
      },
      steps: tutorial.steps.map((step) => ({
        element: step.target,
        advanceOnClick: step.action === 'click',
        disableActiveInteraction: false,
        waitForElement: 1500,
        data: { tutorialStep: step },
        popover: {
          title: step.title,
          description: `<span class="tutorial-objective-label">Objetivo</span><p>${step.objective}</p><span class="tutorial-action-hint">${step.action === 'click' ? 'Ação necessária: clique na área destacada.' : 'Etapa informativa.'}</span>`,
          side: step.side,
          align: step.align,
          showButtons: step.action === 'click' ? ['previous', 'close'] : ['next', 'previous', 'close'],
        },
      })),
    });
    driverRef.current = tutorialDriver;
    tutorialDriver.drive();
  }, [activeView, allowedTutorialIds, renderExtraControls, stop]);

  const value = useMemo<TutorialContextValue>(() => ({
    activeTutorialId,
    completedTutorials,
    dismissNotice: () => setNotice(''),
    getTutorialForView: (view) => Object.values(TUTORIALS).find((tutorial) => tutorial.view === view && allowedTutorialIds.some((id) => id === tutorial.id)) ?? null,
    notice,
    startTutorial,
  }), [activeTutorialId, allowedTutorialIds, completedTutorials, notice, startTutorial]);

  return (
    <TutorialContext.Provider value={value}>
      {children}
      {notice && (
        <div className="tutorial-notice" role="status" aria-live="polite">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="Fechar mensagem do tutorial">Fechar</button>
        </div>
      )}
    </TutorialContext.Provider>
  );
}

export function useTutorials() {
  const context = useContext(TutorialContext);
  if (!context) throw new Error('useTutorials deve ser usado dentro de TutorialProvider.');
  return context;
}
