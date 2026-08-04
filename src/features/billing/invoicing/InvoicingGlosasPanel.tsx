import type { Dispatch, SetStateAction } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { DataPanel, IconButton } from '../../../shared/components/ui';
import { formatCurrency } from '../../../shared/utils/formatters';
import type { AuthSession } from '../../../shared/domain/sessionTypes';
import type { Faturamento } from '../billingDomainTypes';
import type { useInvoicing } from './useInvoicing';
import type { InvoicingConfirmAction } from './invoicingDetailsTypes';

type InvoicingState = ReturnType<typeof useInvoicing>;

type InvoicingGlosasPanelProps = {
  selectedBilling: Faturamento;
  setSelectedBilling: InvoicingState['setSelectedBilling'];
  setGlosaDraft: InvoicingState['setGlosaDraft'];
  setRecursoDraft: InvoicingState['setRecursoDraft'];
  setConfirmAction: Dispatch<SetStateAction<InvoicingConfirmAction>>;
  session: AuthSession;
  canManageBilling: boolean;
  deleteGlosa: InvoicingState['removeGlosa'];
  deleteRecursoGlosa: InvoicingState['removeAppeal'];
};

export function InvoicingGlosasPanel({
  selectedBilling,
  setSelectedBilling,
  setGlosaDraft,
  setRecursoDraft,
  setConfirmAction,
  session,
  canManageBilling,
  deleteGlosa,
  deleteRecursoGlosa,
}: InvoicingGlosasPanelProps) {
  return (
    <>
      <h3>Glosas e recursos</h3>
      {selectedBilling.glosas.map((glosa) => (
        <DataPanel key={glosa.id}>
          <strong>
            {glosa.descricaoMotivo} — {formatCurrency(glosa.valorGlosado)}
          </strong>
          {canManageBilling && (
            <div className="billing-filter-actions">
              <IconButton
                label="Editar glosa"
                title="Editar glosa"
                tone="muted"
                onClick={() =>
                  setGlosaDraft({
                    id: glosa.id,
                    codigoMotivo: glosa.codigoMotivo || '',
                    descricaoMotivo: glosa.descricaoMotivo,
                    valorGlosado: String(glosa.valorGlosado),
                    dataGlosa: glosa.dataGlosa.slice(0, 10),
                    observacao: glosa.observacao || '',
                  })
                }
              >
                <Pencil size={17} />
              </IconButton>
              {!glosa.recursos.length && (
                <IconButton
                  label="Excluir glosa"
                  title="Excluir glosa"
                  tone="danger"
                  onClick={() =>
                    setConfirmAction({
                      title: 'Excluir glosa',
                      message: 'Excluir esta glosa e recalcular os totais do faturamento?',
                      action: () => deleteGlosa(glosa.id, session.token),
                      success: 'Glosa excluída.',
                      after: () => setSelectedBilling(null),
                    })
                  }
                >
                  <Trash2 size={17} />
                </IconButton>
              )}
            </div>
          )}
          {glosa.recursos.map((recurso) => (
            <div key={recurso.id}>
              <p>
                {recurso.status}: {recurso.justificativa} — recuperado{' '}
                {formatCurrency(recurso.valorRecuperado)}
              </p>
              {canManageBilling && (
                <div className="billing-filter-actions">
                  <IconButton
                    label="Editar recurso"
                    title="Editar recurso"
                    tone="muted"
                    onClick={() =>
                      setRecursoDraft({
                        id: recurso.id,
                        dataEnvio: recurso.dataEnvio?.slice(0, 10) || '',
                        justificativa: recurso.justificativa,
                        valorRecorrido: String(recurso.valorRecorrido),
                        dataResposta: recurso.dataResposta?.slice(0, 10) || '',
                        valorRecuperado: String(recurso.valorRecuperado),
                        status: recurso.status,
                        observacao: recurso.observacao || '',
                      })
                    }
                  >
                    <Pencil size={17} />
                  </IconButton>
                  {recurso.status === 'EmPreparacao' && (
                    <IconButton
                      label="Excluir recurso"
                      title="Excluir recurso"
                      tone="danger"
                      onClick={() =>
                        setConfirmAction({
                          title: 'Excluir recurso',
                          message: 'Excluir este recurso ainda em preparação?',
                          action: () => deleteRecursoGlosa(recurso.id, session.token),
                          success: 'Recurso excluído.',
                          after: () => setSelectedBilling(null),
                        })
                      }
                    >
                      <Trash2 size={17} />
                    </IconButton>
                  )}
                </div>
              )}
            </div>
          ))}
        </DataPanel>
      ))}
      {!selectedBilling.glosas.length && <p className="empty-row">Nenhuma glosa registrada.</p>}
    </>
  );
}
