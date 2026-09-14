import { Bell, Menu } from 'lucide-react';
import type { BreadcrumbItem, Theme } from '../appTypes';
import type { AuthSession } from '../types';
import { UserMenu } from './UserMenu';
import { CompanyLogo } from '../shared/components/CompanyLogo';
import { Breadcrumbs } from '../shared/components/Breadcrumbs';
import { ThemeToggle } from '../shared/components/ThemeToggle';
import { isAnonymousTeamSession } from '../features/auth/teamSession';

type TopbarProps = {
  onOpenNavigation?: () => void;
  navigationOpen?: boolean;
  appTitle: string;
  companyName: string;
  companyPhoto?: string | null;
  session: AuthSession;
  breadcrumbItems: BreadcrumbItem[];
  notificationsOpen: boolean;
  notificationCount: number;
  theme: Theme;
  onToggleNotifications: () => void;
  onThemeToggle: () => void;
  onLogout: () => void;
};

export function Topbar({
  onOpenNavigation,
  navigationOpen = false,
  appTitle,
  companyName,
  companyPhoto,
  session,
  breadcrumbItems,
  notificationsOpen,
  notificationCount,
  theme,
  onToggleNotifications,
  onThemeToggle,
  onLogout,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {onOpenNavigation && <button type="button" className="ghost-button navigation-toggle" onClick={onOpenNavigation} aria-label="Abrir menu" aria-expanded={navigationOpen} aria-haspopup="dialog"><Menu size={22} /></button>}
        <div className="topbar-brand">
          <CompanyLogo companyName={companyName} photo={companyPhoto} className="topbar-logo" decorative />
          <div>
            <span className="product-name">HemoDinks</span>
            <h1>{appTitle}</h1>
            {isAnonymousTeamSession(session) && <span className="eyebrow">Acesso somente leitura</span>}
            {breadcrumbItems.length > 1 && <Breadcrumbs items={breadcrumbItems} />}
          </div>
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-actions topbar-primary-actions">
          <button
            type="button"
            className="topbar-info-panel notification-chip"
            onClick={onToggleNotifications}
            aria-label={`Notificações: ${notificationCount}`}
            aria-expanded={notificationsOpen}
            aria-haspopup="dialog"
            data-tour="agenda-notification-center"
          >
            <Bell size={17} />
            <span className="notification-label notification-label-wide">Notificações</span>
            <span className="notification-label notification-label-short">Avisos</span>
            <span className="notification-count">{notificationCount}</span>
          </button>
          <ThemeToggle theme={theme} onToggle={onThemeToggle} />
          <UserMenu session={session} companyName={companyName} onLogout={onLogout} />
        </div>
      </div>
    </header>
  );
}
