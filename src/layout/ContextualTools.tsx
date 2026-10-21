import { useEffect, useId, useRef, useState } from 'react';
import { Calculator as CalculatorIcon, CircleHelp, X } from 'lucide-react';
import type { AppView } from '../appTypes';
import { Calculator } from '../features/calculator/Calculator';
import { useCalculatorPreference } from '../features/calculator/CalculatorPreferenceProvider';
import { CONTEXTUAL_FLOWS } from './contextualFlows';
import { ContextualFlowDrawer } from './ContextualFlowDrawer';
import { ContextualToolTrigger } from './ContextualToolTrigger';
import './styles/contextual-tools.css';

export function ContextualTools({ activeView }: { activeView: AppView }) {
  const { visible } = useCalculatorPreference();
  const [open, setOpen] = useState<'help' | 'calculator' | null>(null);
  const helpId = useId();
  const calculatorId = useId();
  const root = useRef<HTMLElement>(null);
  const helpTrigger = useRef<HTMLButtonElement>(null);
  const calculatorTrigger = useRef<HTMLButtonElement>(null);
  const active = open === 'calculator' && !visible ? null : open;
  useEffect(() => {
    if (active) root.current?.scrollIntoView?.({ block: 'nearest', behavior: 'instant' });
  }, [active]);
  useEffect(() => { if (!visible) setOpen(current => current === 'calculator' ? null : current); }, [visible]);
  const close = () => {
    (active === 'help' ? helpTrigger : calculatorTrigger).current?.focus();
    setOpen(null);
  };

  return <aside ref={root} className={`contextual-tools contextual-flow-drawer view-${activeView}${active ? ' is-open' : ''}`}
    aria-label="Ajuda contextual" onKeyDown={event => {
      if (event.key === 'Escape' && active) { event.preventDefault(); event.stopPropagation(); close(); }
    }}>
    <div className="contextual-tool-triggers">
      <ContextualToolTrigger ref={helpTrigger} expanded={active === 'help'} panelId={helpId}
        aria-label={active === 'help' ? 'Fechar ajuda da tela' : `Abrir ajuda de ${CONTEXTUAL_FLOWS[activeView].title}`}
        data-tour="help-menu" icon={active === 'help' ? <X size={21} /> : <CircleHelp size={21} />}
        onClick={() => setOpen(current => current === 'help' ? null : 'help')}>Como usar</ContextualToolTrigger>
      {visible && <ContextualToolTrigger ref={calculatorTrigger} expanded={active === 'calculator'} panelId={calculatorId}
        aria-label={active === 'calculator' ? 'Fechar calculadora' : 'Abrir calculadora'}
        icon={active === 'calculator' ? <X size={21} /> : <CalculatorIcon size={21} />}
        onClick={() => setOpen(current => current === 'calculator' ? null : 'calculator')}>Calculadora</ContextualToolTrigger>}
    </div>
    <div className="contextual-tool-panels">
      <div id={helpId} hidden={active !== 'help'}>
        <ContextualFlowDrawer activeView={activeView} embedded open={active === 'help'}
          onOpenChange={value => setOpen(value ? 'help' : null)} />
      </div>
      <div id={calculatorId} className="contextual-flow-panel" hidden={active !== 'calculator'}>
        {active === 'calculator' && <Calculator onClose={close} />}
      </div>
    </div>
  </aside>;
}
