import { Bell, KeyRound, LogOut } from 'lucide-react';
import type { BreadcrumbItem, Theme } from '../appTypes';
import type { AuthSession } from '../types';
import { UserAvatar } from '../features/users/UserAvatar';
import { Breadcrumbs } from '../shared/components/Breadcrumbs';
import { ThemeToggle } from '../shared/components/ThemeToggle';

type TopbarProps = {
  appTitle: string;
  session: AuthSession;
  breadcrumbItems: BreadcrumbItem[];
  theme: Theme;
  notificationsOpen: boolean;
  notificationCount: number;
  onToggleNotifications: () => void;
  onToggleTheme: () => void;
  onOpenPasswordModal: () => void;
  onLogout: () => void;
};

export function Topbar({
  appTitle,
  session,
  breadcrumbItems,
  theme,
  notificationsOpen,
  notificationCount,
  onToggleNotifications,
  onToggleTheme,
  onOpenPasswordModal,
  onLogout,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <div>
          <div className="brand-kicker">
            <span className="company-name">GM Tech Solutions</span>
            <span className="product-name">Hemodinks</span>
          </div>
          <h1>{appTitle}</h1>
          <Breadcrumbs items={breadcrumbItems} />
        </div>
      </div>

      <div className="topbar-right">
        <div className="current-user topbar-user" aria-label="Usuario logado">
          <UserAvatar userId={session.user.id} name={session.user.nome} photo={session.user.fotoPerfil} authToken={session.token} size="sm" />
          <span className="current-user-name">{session.user.nome}</span>
        </div>

        <div className="topbar-actions">
          <button
            type="button"
            className="topbar-info-panel notification-chip"
            onClick={onToggleNotifications}
            aria-expanded={notificationsOpen}
            aria-haspopup="dialog"
          >
            <Bell size={17} />
            <span className="notification-label notification-label-wide">Notificacoes</span>
            <span className="notification-label notification-label-short">Avisos</span>
            <span className="notification-count">{notificationCount}</span>
          </button>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button type="button" className="ghost-button password-action-button" onClick={onOpenPasswordModal}>
            <KeyRound size={17} />
            <span className="action-label-wide">Alterar senha</span>
            <span className="action-label-short">Senha</span>
          </button>
          <button type="button" className="ghost-button logout-button" onClick={onLogout}>
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
