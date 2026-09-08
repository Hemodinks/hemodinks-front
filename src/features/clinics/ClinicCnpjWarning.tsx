import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Pencil } from 'lucide-react';
import type { AuthSession } from '../../types';
import { getPlatformClinic } from '../../services';
import { Button } from '../../shared/components/ui';
import { queryKeys } from '../../shared/queryKeys';
import { ADMIN_PROFILE_ID, SUPER_ADMIN_PROFILE_ID } from '../../shared/utils/formatters';
import './clinicCnpjWarning.css';

type Props = {
  session: AuthSession;
  onUpdateClinic: () => void;
};

export function canViewClinicCnpjWarning(profileId: number) {
  return profileId === ADMIN_PROFILE_ID || profileId === SUPER_ADMIN_PROFILE_ID;
}

export function ClinicCnpjWarning({ session, onUpdateClinic }: Props) {
  const clinicId = session.user.clinicaId ?? 0;
  const canView = canViewClinicCnpjWarning(session.user.perfilId);
  const clinicQuery = useQuery({
    queryKey: queryKeys.currentClinic(session.token, clinicId),
    queryFn: () => getPlatformClinic(clinicId, session.token),
    enabled: canView && clinicId > 0,
    staleTime: 30_000,
  });

  if (!canView || !clinicQuery.data || clinicQuery.data.cnpj?.trim()) return null;

  return (
    <div className="clinic-cnpj-warning" role="status" aria-live="polite">
      <span className="clinic-cnpj-warning-icon" aria-hidden="true">
        <AlertTriangle size={21} />
      </span>
      <div className="clinic-cnpj-warning-copy">
        <strong>Cadastro da clínica incompleto</strong>
        <span>Informe um CNPJ válido para manter os dados cadastrais atualizados.</span>
      </div>
      <Button variant="primary" onClick={onUpdateClinic}><Pencil size={14} />Atualizar clínica</Button>
    </div>
  );
}
