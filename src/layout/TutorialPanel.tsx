import { useEffect, useId, useState } from "react";
import {
  BookOpenText,
  ChevronDown,
  Lightbulb,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import type { AppView } from "../appTypes";
import { MODULE_TUTORIALS } from "./tutorialContent";

type TutorialPanelProps = {
  activeView: AppView;
};

export function TutorialPanel({ activeView }: TutorialPanelProps) {
  const tutorial = MODULE_TUTORIALS[activeView];
  const idPrefix = useId();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSection, setOpenSection] = useState<number | null>(0);

  useEffect(() => {
    setOpenSection(0);
  }, [activeView]);

  if (isCollapsed) {
    return (
      <aside
        className="tutorial-panel is-collapsed"
        aria-label={`Tutorial do módulo ${tutorial.title}`}
      >
        <button
          type="button"
          className="tutorial-panel-collapsed-trigger"
          aria-expanded="false"
          onClick={() => setIsCollapsed(false)}
          title="Abrir tutorial do módulo"
        >
          <BookOpenText size={20} aria-hidden="true" />
          <span>Tutorial</span>
          <PanelRightOpen size={18} aria-hidden="true" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="tutorial-panel is-expanded"
      aria-label={`Tutorial do módulo ${tutorial.title}`}
    >
      <div className="tutorial-panel-heading">
        <div className="tutorial-panel-title">
          <span className="tutorial-panel-icon" aria-hidden="true">
            <BookOpenText size={20} />
          </span>
          <div>
            <span className="eyebrow">Ajuda contextual</span>
            <div className="tutorial-panel-module-name">{tutorial.title}</div>
          </div>
        </div>
        <button
          type="button"
          className="tutorial-panel-collapse-button"
          aria-label="Recolher tutorial"
          aria-expanded="true"
          onClick={() => setIsCollapsed(true)}
          title="Recolher tutorial"
        >
          <PanelRightClose size={19} aria-hidden="true" />
        </button>
      </div>

      <p className="tutorial-panel-summary">{tutorial.summary}</p>

      <div className="tutorial-accordion">
        {tutorial.sections.map((section, index) => {
          const isOpen = openSection === index;
          const triggerId = `${idPrefix}-tutorial-trigger-${index}`;
          const panelId = `${idPrefix}-tutorial-panel-${index}`;
          const titleId = `${idPrefix}-tutorial-title-${index}`;

          return (
            <section
              className={`tutorial-section ${isOpen ? "is-open" : ""}`}
              key={section.title}
            >
              <h3>
                <button
                  type="button"
                  id={triggerId}
                  className="tutorial-section-trigger"
                  aria-label={`Etapa ${index + 1} do tutorial`}
                  aria-describedby={titleId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenSection(isOpen ? null : index)}
                  title={section.title}
                >
                  <span className="tutorial-section-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span id={titleId}>{section.title}</span>
                  <ChevronDown
                    className="tutorial-section-chevron"
                    size={18}
                    aria-hidden="true"
                  />
                </button>
              </h3>
              <div
                id={panelId}
                className="tutorial-section-content"
                role="region"
                aria-labelledby={triggerId}
                hidden={!isOpen}
              >
                <p>{section.description}</p>
                <ol>
                  {section.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                {section.tip ? (
                  <p className="tutorial-tip">
                    <Lightbulb size={16} aria-hidden="true" />
                    <span>
                      <strong>Dica:</strong> {section.tip}
                    </span>
                  </p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
