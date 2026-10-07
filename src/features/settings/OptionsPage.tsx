import { useState } from 'react';
import { Activity, Shield, SlidersHorizontal } from 'lucide-react';
import type { Theme } from '../../appTypes';
import type { AuthSession } from '../../types';
import { MonitoringPage } from './MonitoringPage';
import { SystemSettingsPage } from './SystemSettingsPage';
import { SecurityMonitoringPanel } from './SecurityMonitoringPanel';
import { ADMIN_PROFILE_ID, SUPER_ADMIN_PROFILE_ID } from '../../shared/utils/formatterConstants';
import './settings.css';

type OptionsPageProps = {
  session: AuthSession;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onPasswordChanged: (message: string) => void;
};

type OptionsSection = 'settings' | 'monitoring' | 'security';

export function OptionsPage(props: OptionsPageProps) {
  const [section, setSection] = useState<OptionsSection>('settings');
  const canObserveSecurity = props.session.user.perfilId === ADMIN_PROFILE_ID || props.session.user.perfilId === SUPER_ADMIN_PROFILE_ID;

  return (
    <section className="workspace options-workspace">
      <nav className="options-navigation" aria-label="Seções de opções">
        <button
          type="button"
          className={section === 'settings' ? 'active' : ''}
          aria-current={section === 'settings' ? 'page' : undefined}
          onClick={() => setSection('settings')}
        >
          <SlidersHorizontal size={18} />
          Configurações
        </button>
        <button
          type="button"
          className={section === 'monitoring' ? 'active' : ''}
          aria-current={section === 'monitoring' ? 'page' : undefined}
          onClick={() => setSection('monitoring')}
        >
          <Activity size={18} />
          Monitoramento
        </button>
        {canObserveSecurity && <button type="button" className={section === 'security' ? 'active' : ''}
          aria-current={section === 'security' ? 'page' : undefined} onClick={() => setSection('security')}>
          <Shield size={18} />Segurança
        </button>}
      </nav>

      {section === 'security' ? <SecurityMonitoringPanel session={props.session} />
        : section === 'settings' ? <SystemSettingsPage {...props} /> : <MonitoringPage session={props.session} />}
    </section>
  );
}
