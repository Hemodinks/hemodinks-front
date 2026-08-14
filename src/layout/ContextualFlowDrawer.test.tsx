import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { AppView } from '../appTypes';
import { TutorialProvider } from '../features/tutorials/TutorialProvider';
import { ContextualFlowDrawer } from './ContextualFlowDrawer';
import { CONTEXTUAL_FLOWS } from './contextualFlows';

describe('guia contextual de fluxos', () => {
  const renderDrawer = (activeView: AppView) => (
    <TutorialProvider activeView={activeView} allowedTutorialIds={[]}>
      <ContextualFlowDrawer activeView={activeView} />
    </TutorialProvider>
  );

  it('possui conteúdo para todas as telas da aplicação', () => {
    const views = Object.keys(CONTEXTUAL_FLOWS) as AppView[];
    expect(views).toHaveLength(11);
    for (const view of views) {
      expect(CONTEXTUAL_FLOWS[view].flows.length).toBeGreaterThan(0);
      expect(CONTEXTUAL_FLOWS[view].flows.every((flow) => flow.steps.length > 0)).toBe(true);
    }
  });

  it('abre o drawer, alterna o accordion e acompanha a tela atual', async () => {
    const user = userEvent.setup();
    const { rerender } = render(renderDrawer('dashboard'));

    const drawerToggle = screen.getByRole('button', { name: 'Abrir ajuda de Painel inicial' });
    expect(drawerToggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(drawerToggle);
    expect(screen.getByRole('complementary', { name: 'Ajuda contextual' })).toHaveClass('view-dashboard');
    expect(screen.getByRole('heading', { name: 'Painel inicial' })).toBeVisible();
    const firstFlowToggle = screen.getByRole('button', { name: 'Consultar os indicadores' });
    const firstFlowContent = document.getElementById(firstFlowToggle.getAttribute('aria-controls') ?? '');
    expect(firstFlowToggle).toHaveAttribute('aria-expanded', 'true');
    expect(firstFlowContent).toHaveAttribute('aria-hidden', 'false');

    const secondFlowToggle = screen.getByRole('button', { name: 'Acessar um módulo' });
    const secondFlowContent = document.getElementById(secondFlowToggle.getAttribute('aria-controls') ?? '');
    await user.click(secondFlowToggle);
    expect(firstFlowToggle).toHaveAttribute('aria-expanded', 'false');
    expect(firstFlowContent).toHaveAttribute('aria-hidden', 'true');
    expect(secondFlowToggle).toHaveAttribute('aria-expanded', 'true');
    expect(secondFlowContent).toHaveAttribute('aria-hidden', 'false');

    rerender(renderDrawer('patients'));
    expect(screen.getByRole('complementary', { name: 'Ajuda contextual' })).toHaveClass('view-patients');
    expect(screen.getByRole('heading', { name: 'Pacientes - Cirurgias' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cadastrar paciente ou cirurgia' })).toHaveAttribute('aria-expanded', 'true');
  });
});
