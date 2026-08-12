import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockSession } from '../test/appTestData';
import { Topbar } from './Topbar';

describe('ações do cabeçalho', () => {
  it('posiciona o tema no bloco esquerdo e permite alterná-lo', async () => {
    const onThemeToggle = vi.fn();
    const { container } = render(
      <Topbar
        appTitle="Painel inicial"
        companyName="Hemodinks"
        session={mockSession()}
        breadcrumbItems={[]}
        notificationsOpen={false}
        notificationCount={2}
        theme="light"
        onToggleNotifications={vi.fn()}
        onThemeToggle={onThemeToggle}
        onLogout={vi.fn()}
      />,
    );

    const actions = container.querySelector('.topbar-actions');
    const left = container.querySelector('.topbar-left');
    expect(actions).toContainElement(screen.getByRole('button', { name: /notificações/i }));
    expect(actions).toContainElement(screen.getByRole('button', { name: 'Sair' }));
    expect(left?.lastElementChild).toBe(screen.getByTitle('Usar tema escuro'));
    expect(actions).not.toContainElement(screen.getByTitle('Usar tema escuro'));

    await userEvent.click(screen.getByTitle('Usar tema escuro'));
    expect(onThemeToggle).toHaveBeenCalledOnce();
  });
});
