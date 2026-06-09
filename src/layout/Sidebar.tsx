import { ClipboardList, FileText, LayoutDashboard, Users } from 'lucide-react';
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

        <nav className="side-nav" role="tablist" aria-label="Navegacao principal">
          <button
            type="button"
            className={activeView === 'dashboard' ? 'active' : ''}
            onClick={onOpenDashboard}
          >
            <LayoutDashboard size={18} />
            <span>Painel</span>
          </button>
          {canAccessUsers && (
            <button
              type="button"
              className={`side-nav-users ${activeView === 'users' ? 'active' : ''}`}
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
              className={activeView === 'users' ? 'active' : ''}
              onClick={onOpenMyProfile}
            >
              <FileText size={18} />
              <span>Meu cadastro</span>
            </button>
          )}
          <button
            type="button"
            className={`side-nav-patients ${activeView === 'patients' ? 'active' : ''}`}
            onClick={onOpenPatientsList}
          >
            <ClipboardList size={18} />
            <span>Pacientes</span>
            <span className="side-nav-count">{pacientesCount}</span>
          </button>
        </nav>
      </div>
    </aside>
  );
}
