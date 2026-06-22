import { Bell, LogOut } from 'lucide-react';
import type { BreadcrumbItem } from '../appTypes';
import type { AuthSession } from '../types';
import { UserAvatar } from '../features/users/UserAvatar';
import { Breadcrumbs } from '../shared/components/Breadcrumbs';

type TopbarProps = {
  appTitle: string;
  companyName: string;
  session: AuthSession;
  breadcrumbItems: BreadcrumbItem[];
  notificationsOpen: boolean;
  notificationCount: number;
  onToggleNotifications: () => void;
  onLogout: () => void;
};

export function Topbar({
  appTitle,
  companyName,
  session,
  breadcrumbItems,
  notificationsOpen,
  notificationCount,
  onToggleNotifications,
  onLogout,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <div>
          <div className="brand-kicker">
            <span className="company-name">GM Tech Solutions</span>
            <span className="product-name">{companyName}</span>
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
          <button type="button" className="ghost-button logout-button" onClick={onLogout}>
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
