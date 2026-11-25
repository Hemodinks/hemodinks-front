import { useState, type CSSProperties } from 'react';
import type { IdentityChangedHandler } from '../../shared/identityChange';
import { Activity, Shield, SlidersHorizontal, Users } from 'lucide-react';
import type { Theme } from '../../appTypes';
import type { AuthSession } from '../../types';
import { MonitoringPage } from './MonitoringPage';
import { SystemSettingsPage } from './SystemSettingsPage';
import { SecurityMonitoringPanel } from './SecurityMonitoringPanel';
import { ActiveSessionsPanel } from './ActiveSessionsPanel';
import { ADMIN_PROFILE_ID, SUPER_ADMIN_PROFILE_ID } from '../../shared/utils/formatterConstants';
import './settings.css';

type OptionsPageProps = {
  session: AuthSession;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onPasswordChanged: IdentityChangedHandler;
};

type OptionsSection = 'settings' | 'monitoring' | 'security' | 'sessions';

export function OptionsPage(props: OptionsPageProps) {
  const [section, setSection] = useState<OptionsSection>('settings');
  const isSuperAdmin = props.session.user.perfilId === SUPER_ADMIN_PROFILE_ID;
  const canObserveSecurity = props.session.user.perfilId === ADMIN_PROFILE_ID || isSuperAdmin;

  return (
    <section className="workspace options-workspace">
      <nav className="options-navigation" aria-label="Seções de opções">
        <button
          type="button"
          className={section === 'settings' ? 'active' : ''}
          style={{ '--tab-tint': '#2563eb' } as CSSProperties}
          aria-current={section === 'settings' ? 'page' : undefined}
          onClick={() => setSection('settings')}
        >
          <SlidersHorizontal size={18} />
          Configurações
        </button>
        <button
          type="button"
          className={section === 'monitoring' ? 'active' : ''}
          style={{ '--tab-tint': '#0f766e' } as CSSProperties}
          aria-current={section === 'monitoring' ? 'page' : undefined}
          onClick={() => setSection('monitoring')}
        >
          <Activity size={18} />
          Monitoramento
        </button>
        {canObserveSecurity && <button type="button" className={section === 'security' ? 'active' : ''} style={{ '--tab-tint': '#b45309' } as CSSProperties}
          aria-current={section === 'security' ? 'page' : undefined} onClick={() => setSection('security')}>
          <Shield size={18} />Segurança
        </button>}
        {isSuperAdmin && <button type="button" className={section === 'sessions' ? 'active' : ''} style={{ '--tab-tint': '#7c3aed' } as CSSProperties}
          aria-current={section === 'sessions' ? 'page' : undefined} onClick={() => setSection('sessions')}>
          <Users size={18} />Sessões ativas
        </button>}
      </nav>

      {section === 'sessions' && isSuperAdmin ? <ActiveSessionsPanel session={props.session} />
        : section === 'security' ? <SecurityMonitoringPanel session={props.session} />
        : section === 'settings' ? <SystemSettingsPage {...props} /> : <MonitoringPage session={props.session} />}
    </section>
  );
}
