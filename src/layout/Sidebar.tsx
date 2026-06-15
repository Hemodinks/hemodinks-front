import { CalendarDays, ClipboardList, FileText, LayoutDashboard, Users } from 'lucide-react';
import type { AppView } from '../appTypes';
import type { AuthSession } from '../types';
import { UserAvatar } from '../features/users/UserAvatar';

type SidebarProps = {
  session: AuthSession;
  activeView: AppView;
  currentUserProfile: string;
  canAccessUsers: boolean;
  canEditOwnUser: boolean;
  usersCount: number;
  pacientesCount: number;
  onOpenDashboard: () => void;
  onOpenUsersList: () => void;
  onOpenMyProfile: () => void;
  onOpenPatientsList: () => void;
  onOpenAgenda: () => void;
};

export function Sidebar({
  session,
  activeView,
  currentUserProfile,
  canAccessUsers,
  canEditOwnUser,
  usersCount,
  pacientesCount,
  onOpenDashboard,
  onOpenUsersList,
  onOpenMyProfile,
  onOpenPatientsList,
  onOpenAgenda,
}: SidebarProps) {
  return (
    <aside className="sidebar-panel" aria-label="Sessao ativa">
      <div className="sidebar-card">
        <div className="sidebar-heading">
          <span className="eyebrow">Painel</span>
          <h2>Sessao ativa</h2>
        </div>

        <div className="session-card">
          <span className="session-label">Usuario</span>
          <div className="session-user-row">
            <UserAvatar userId={session.user.id} name={session.user.nome} photo={session.user.fotoPerfil} authToken={session.token} size="sm" decorative />
            <strong>{session.user.nome}</strong>
          </div>
        </div>

        <div className="session-card">
          <span className="session-label">Perfil</span>
          <strong>{currentUserProfile}</strong>
          <span className="session-meta">{currentUserProfile} | {session.user.email}</span>
        </div>

        <nav className="side-nav" aria-label="Navegacao principal">
          <button
            type="button"
            className={activeView === 'dashboard' ? 'active' : ''}
            aria-current={activeView === 'dashboard' ? 'page' : undefined}
            onClick={onOpenDashboard}
          >
            <LayoutDashboard size={18} />
            <span>Painel</span>
          </button>
          {canAccessUsers && (
            <button
              type="button"
              className={`side-nav-users ${activeView === 'users' ? 'active' : ''}`}
              aria-current={activeView === 'users' ? 'page' : undefined}
              onClick={onOpenUsersList}
            >
              <Users size={18} />
              <span>Usuarios</span>
              <span className="side-nav-count">{usersCount}</span>
            </button>
          )}
          {canEditOwnUser && (
            <button
              type="button"
              className={activeView === 'profile' ? 'active' : ''}
              aria-current={activeView === 'profile' ? 'page' : undefined}
              onClick={onOpenMyProfile}
            >
              <FileText size={18} />
              <span>Meu cadastro</span>
            </button>
          )}
          <button
            type="button"
            className={`side-nav-patients ${activeView === 'patients' ? 'active' : ''}`}
            aria-current={activeView === 'patients' ? 'page' : undefined}
            onClick={onOpenPatientsList}
          >
            <ClipboardList size={18} />
            <span>Pacientes</span>
            <span className="side-nav-count">{pacientesCount}</span>
          </button>
          <button
            type="button"
            className={`side-nav-agenda ${activeView === 'agenda' ? 'active' : ''}`}
            aria-current={activeView === 'agenda' ? 'page' : undefined}
            onClick={onOpenAgenda}
          >
            <CalendarDays size={18} />
            <span>Agenda</span>
          </button>
        </nav>
      </div>
    </aside>
  );
}
