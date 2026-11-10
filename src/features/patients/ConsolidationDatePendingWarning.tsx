import { useQuery } from '@tanstack/react-query';
import { CalendarX2, ListFilter } from 'lucide-react';
import type { AuthSession } from '../../types';
import { getDataConsolidacaoPendencias } from '../../services';
import { Button } from '../../shared/components/ui';
import { queryKeys } from '../../shared/queryKeys';
import {
  ADMIN_PROFILE_ID,
  CONTROLLER_PROFILE_ID,
  MEDICAL_PROFILE_ID,
  SUPER_ADMIN_PROFILE_ID,
} from '../../shared/utils/formatters';
import './consolidationDatePendingWarning.css';

type Props = {
  session: AuthSession;
  onOpenPending: () => void;
};

// Mesmo conjunto da política PacientePendenciasVisualizar na API.
const VIEWER_PROFILE_IDS = new Set([ADMIN_PROFILE_ID, MEDICAL_PROFILE_ID, CONTROLLER_PROFILE_ID, SUPER_ADMIN_PROFILE_ID]);

export function canViewConsolidationDatePending(profileId: number) {
  return VIEWER_PROFILE_IDS.has(profileId);
}

export function ConsolidationDatePendingWarning({ session, onOpenPending }: Props) {
  const canView = canViewConsolidationDatePending(session.user.perfilId);
  const pendingQuery = useQuery({
    queryKey: queryKeys.pacientesPendenciasDataConsolidacao(session.token),
    queryFn: () => getDataConsolidacaoPendencias(session.token),
    enabled: canView,
    staleTime: 30_000,
    // Sem módulo de pacientes no plano a API responde 403: o aviso simplesmente não aparece.
    retry: false,
  });

  const pending = pendingQuery.data;
  // Só exibe com resposta completa: total numérico positivo e faixa informada.
  if (!canView || !pending || typeof pending.total !== 'number' || pending.total <= 0
    || typeof pending.anoMinimo !== 'number' || typeof pending.anoMaximo !== 'number') return null;

  const plural = pending.total === 1;
  return (
    <div className="consolidation-pending-warning" role="status" aria-live="polite" aria-label="Correção pendente na data da consolidação">
      <span className="consolidation-pending-warning-icon" aria-hidden="true">
        <CalendarX2 size={22} />
      </span>
      <div className="consolidation-pending-warning-copy">
        <strong>
          Correção pendente: {pending.total} {plural ? 'cadastro' : 'cadastros'} com ano da data da consolidação inválido
        </strong>
        <span>
          O ano da data da consolidação deve estar entre {pending.anoMinimo} e {pending.anoMaximo}.
          Corrija {plural ? 'o cadastro' : 'os cadastros'} em <b>Pacientes - Cirurgias</b>.
        </span>
      </div>
      <Button variant="primary" onClick={onOpenPending}>
        <ListFilter size={14} />Ver pendências
      </Button>
    </div>
  );
}
