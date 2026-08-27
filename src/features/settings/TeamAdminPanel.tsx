import { Users } from 'lucide-react';
import type { AuthSession } from '../../types';
import { AlertMessage, ToastMessage } from '../../shared/components/ui';
import { ClinicTeamCard } from './ClinicTeamCard';
import { useClinicTeams } from './useClinicTeams';

type ClinicTeamsPanelProps = { session: AuthSession; clinicId: number; clinicName: string };

export function ClinicTeamsPanel({ session, clinicId, clinicName }: ClinicTeamsPanelProps) {
  const state = useClinicTeams({ session, clinicId });
  return (
    <section className="clinic-teams-panel">
      <div className="settings-section-heading">
        <span className="settings-section-icon"><Users size={19} /></span>
        <div><span className="eyebrow">Acesso coletivo</span><h3>Equipes de {clinicName}</h3></div>
      </div>
      {state.error && <AlertMessage type="error">{state.error}</AlertMessage>}
      {state.message && <ToastMessage type="success">{state.message}</ToastMessage>}
      <div className="team-list">
        {!state.loading && state.teams.length === 0 && <p className="file-hint">Nenhuma equipe cadastrada. Use “Adicionar equipe” acima e salve a clínica.</p>}
        {state.teams.map((team) => <ClinicTeamCard key={team.id} team={team} state={state} />)}
      </div>
    </section>
  );
}
