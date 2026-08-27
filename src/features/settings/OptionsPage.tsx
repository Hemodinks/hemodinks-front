import { useState } from 'react';
import { Activity, SlidersHorizontal } from 'lucide-react';
import type { Theme } from '../../appTypes';
import type { AuthSession } from '../../types';
import { MonitoringPage } from './MonitoringPage';
import { SystemSettingsPage } from './SystemSettingsPage';
import './settings.css';

type OptionsPageProps = {
  session: AuthSession;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onPasswordChanged: (message: string) => void;
};

type OptionsSection = 'settings' | 'monitoring';

export function OptionsPage(props: OptionsPageProps) {
  const [section, setSection] = useState<OptionsSection>('settings');

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
      </nav>

      {section === 'settings' ? <SystemSettingsPage {...props} /> : <MonitoringPage session={props.session} />}
    </section>
  );
}
