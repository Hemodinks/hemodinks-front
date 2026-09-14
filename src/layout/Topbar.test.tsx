import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockSession } from '../test/appTestData';
import { Topbar } from './Topbar';

describe('ações do cabeçalho', () => {
  it('permite alternar o tema e acessar os dados da sessão pelo menu', async () => {
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
    expect(actions).toContainElement(screen.getByRole('button', { name: /notificações/i }));
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Menu do usuário' }));
    expect(screen.getByRole('button', { name: 'Sair' })).toBeVisible();
    expect(screen.getByLabelText('Dados da sessão')).toHaveTextContent('Administrador');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Menu do usuário' })).toHaveFocus();
    await userEvent.click(screen.getByTitle('Usar tema escuro'));
    expect(onThemeToggle).toHaveBeenCalledOnce();
  });
});
