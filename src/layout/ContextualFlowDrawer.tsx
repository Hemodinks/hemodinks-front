import { useEffect, useId, useState } from 'react';
import { CheckCircle2, ChevronDown, CircleHelp, X } from 'lucide-react';
import type { AppView } from '../appTypes';
import { CONTEXTUAL_FLOWS } from './contextualFlows';
import './styles/contextual-flow-drawer.css';

type ContextualFlowDrawerProps = {
  activeView: AppView;
};

export function ContextualFlowDrawer({ activeView }: ContextualFlowDrawerProps) {
  const panelId = useId();
  const viewFlows = CONTEXTUAL_FLOWS[activeView];
  const [isOpen, setIsOpen] = useState(false);
  const [openFlowId, setOpenFlowId] = useState<string | null>(viewFlows.flows[0]?.id ?? null);

  useEffect(() => {
    setOpenFlowId(viewFlows.flows[0]?.id ?? null);
  }, [activeView, viewFlows.flows]);

  return (
    <aside className={`contextual-flow-drawer view-${activeView} ${isOpen ? 'is-open' : ''}`} aria-label="Ajuda contextual">
      <button
        type="button"
        className="contextual-flow-trigger"
        aria-expanded={isOpen}
        aria-controls={panelId}
        aria-label={isOpen ? 'Fechar ajuda da tela' : `Abrir ajuda de ${viewFlows.title}`}
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? <X size={21} /> : <CircleHelp size={21} />}
        <span>Como usar</span>
      </button>

      <div id={panelId} className="contextual-flow-panel" hidden={!isOpen}>
        <header className="contextual-flow-heading">
          <span className="eyebrow">Guia da tela atual</span>
          <h2>{viewFlows.title}</h2>
          <p>{viewFlows.description}</p>
        </header>

        <div className="contextual-flow-accordion">
          {viewFlows.flows.map((flow) => {
            const contentId = `${panelId}-${flow.id}`;
            const flowIsOpen = openFlowId === flow.id;
            return (
              <section className={`contextual-flow-item ${flowIsOpen ? 'is-open' : ''}`} key={flow.id}>
                <button
                  type="button"
                  className="contextual-flow-toggle"
                  aria-expanded={flowIsOpen}
                  aria-controls={contentId}
                  onClick={() => setOpenFlowId((current) => current === flow.id ? null : flow.id)}
                >
                  <span>{flow.title}</span>
                  <ChevronDown size={18} aria-hidden="true" />
                </button>
                <div id={contentId} className="contextual-flow-content" hidden={!flowIsOpen}>
                  <ol>
                    {flow.steps.map((step) => (
                      <li key={step}>
                        <CheckCircle2 size={17} aria-hidden="true" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
