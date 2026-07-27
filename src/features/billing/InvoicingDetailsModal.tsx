import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Pencil, Save, Trash2, X } from 'lucide-react';
import { Modal } from '../../shared/components/Modal';
import { Button, DataPanel, IconButton, TextField } from '../../shared/components/ui';
import { formatCurrency } from '../../shared/utils/formatters';
import type { AuthSession, Faturamento } from '../../types';
import type { useInvoicing } from './useInvoicing';
import { BillingDetailSummary } from './BillingDetailSummary';

type InvoicingState = ReturnType<typeof useInvoicing>;
type ConfirmAction = {
  title: string;
  message: string;
  action: () => Promise<unknown>;
  success: string;
  after?: () => void;
} | null;

export function InvoicingDetailsModal({
  selectedBilling, setSelectedBilling, billingItemDraft, setBillingItemDraft,
  setGlosaDraft, setRecursoDraft, setConfirmAction, saveBillingItem, session,
  canManageBilling, editBilling, deleteFaturamento, deleteGlosa,
  deleteRecursoGlosa,
}: {
  selectedBilling: Faturamento;
  setSelectedBilling: InvoicingState["setSelectedBilling"];
  billingItemDraft: InvoicingState["billingItemDraft"];
  setBillingItemDraft: InvoicingState["setBillingItemDraft"];
  setGlosaDraft: InvoicingState["setGlosaDraft"];
  setRecursoDraft: InvoicingState["setRecursoDraft"];
  setConfirmAction: Dispatch<SetStateAction<ConfirmAction>>;
  saveBillingItem: (event: FormEvent) => void;
  session: AuthSession;
  canManageBilling: boolean;
  editBilling: (item: Faturamento) => void;
  deleteFaturamento: InvoicingState["removeInvoice"];
  deleteGlosa: InvoicingState["removeGlosa"];
  deleteRecursoGlosa: InvoicingState["removeAppeal"];
}) {
  return (
        <Modal
          titleId="billing-detail-title"
          className="billing-wide-modal billing-invoice-detail-modal"
          onClose={() => {
            setSelectedBilling(null);
            setBillingItemDraft(null);
          }}
        >
          <div className="panel-title">
            <div>
              <span className="eyebrow">Detalhe do faturamento</span>
              <h2 id="billing-detail-title">
                {selectedBilling.paciente} —{" "}
                {selectedBilling.numeroGuia || `#${selectedBilling.id}`}
              </h2>
            </div>
            <div className="billing-modal-actions">
              {canManageBilling && selectedBilling.status === "Rascunho" && (
                <>
                  <IconButton
                    label="Editar faturamento"
                    title="Editar faturamento"
                    tone="muted"
                    onClick={() => editBilling(selectedBilling)}
                  >
                    <Pencil size={17} />
                  </IconButton>
                  <IconButton
                    label="Excluir faturamento"
                    title="Excluir faturamento"
                    tone="danger"
                    onClick={() => {
                      const item = selectedBilling;
                      setConfirmAction({
                        title: "Excluir faturamento",
                        message: `Excluir o faturamento de ${item.paciente}? Os itens em rascunho também serão removidos.`,
                        action: () =>
                          deleteFaturamento(item.id, session.token),
                        success: "Faturamento excluído.",
                        after: () => setSelectedBilling(null),
                      });
                    }}
                  >
                    <Trash2 size={17} />
                  </IconButton>
                </>
              )}
              <IconButton
                label="Fechar detalhes do faturamento"
                onClick={() => setSelectedBilling(null)}
              >
                <X size={16} />
              </IconButton>
            </div>
          </div>
          <section className="billing-summary-grid">
            <BillingDetailSummary
              title="Apresentado"
              value={formatCurrency(selectedBilling.valorApresentado)}
            />
            <BillingDetailSummary
              title="Glosado"
              value={formatCurrency(selectedBilling.valorGlosado)}
            />
            <BillingDetailSummary
              title="Recuperado"
              value={formatCurrency(selectedBilling.valorGlosaRecuperada)}
            />
            <BillingDetailSummary
              title="Reconhecido"
              value={formatCurrency(selectedBilling.valorReconhecido)}
            />
          </section>
          <h3>Itens</h3>
          <div className="table-wrap">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descrição</th>
                  <th>Quantidade</th>
                  <th>Peso</th>
                  <th>Unitário</th>
                  <th>Apresentado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {selectedBilling.itens.map((item) => (
                  <tr key={item.id}>
                    <td>{item.codigo || "-"}</td>
                    <td>{item.descricao}</td>
                    <td>{item.quantidade}</td>
                    <td>{item.pesoPercentual}%</td>
                    <td>{formatCurrency(item.valorUnitario)}</td>
                    <td>{formatCurrency(item.valorApresentado)}</td>
                    <td>
                      {selectedBilling.status === "Rascunho" &&
                        canManageBilling && (
                          <IconButton
                            label="Editar item"
                            title="Editar item"
                            tone="muted"
                            onClick={() =>
                              setBillingItemDraft({
                                itemId: item.id,
                                codigo: item.codigo || "",
                                descricao: item.descricao,
                                quantidade: String(item.quantidade),
                                pesoPercentual: String(item.pesoPercentual),
                                valorUnitario: String(item.valorUnitario),
                              })
                            }
                          >
                            <Pencil size={17} />
                          </IconButton>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {billingItemDraft && (
            <form className="billing-filter-grid" onSubmit={saveBillingItem}>
              <TextField
                label="Código"
                value={billingItemDraft.codigo}
                onValueChange={(value) =>
                  setBillingItemDraft({ ...billingItemDraft, codigo: value })
                }
              />
              <TextField
                label="Descrição"
                value={billingItemDraft.descricao}
                required
                onValueChange={(value) =>
                  setBillingItemDraft({ ...billingItemDraft, descricao: value })
                }
              />
              <TextField
                label="Quantidade"
                type="number"
                min="0.0001"
                step="0.0001"
                value={billingItemDraft.quantidade}
                required
                onValueChange={(value) =>
                  setBillingItemDraft({
                    ...billingItemDraft,
                    quantidade: value,
                  })
                }
              />
              <TextField
                label="Peso percentual"
                type="number"
                min="0"
                step="0.0001"
                value={billingItemDraft.pesoPercentual}
                required
                onValueChange={(value) =>
                  setBillingItemDraft({
                    ...billingItemDraft,
                    pesoPercentual: value,
                  })
                }
              />
              <TextField
                label="Valor unitário"
                type="number"
                min="0"
                step="0.01"
                value={billingItemDraft.valorUnitario}
                required
                onValueChange={(value) =>
                  setBillingItemDraft({
                    ...billingItemDraft,
                    valorUnitario: value,
                  })
                }
              />
              <Button variant="primary" type="submit">
                <Save size={16} />
                Salvar item
              </Button>
            </form>
          )}
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
                        codigoMotivo: glosa.codigoMotivo || "",
                        descricaoMotivo: glosa.descricaoMotivo,
                        valorGlosado: String(glosa.valorGlosado),
                        dataGlosa: glosa.dataGlosa.slice(0, 10),
                        observacao: glosa.observacao || "",
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
                          title: "Excluir glosa",
                          message:
                            "Excluir esta glosa e recalcular os totais do faturamento?",
                          action: () => deleteGlosa(glosa.id, session.token),
                          success: "Glosa excluída.",
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
                    {recurso.status}: {recurso.justificativa} — recuperado{" "}
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
                            dataEnvio: recurso.dataEnvio?.slice(0, 10) || "",
                            justificativa: recurso.justificativa,
                            valorRecorrido: String(recurso.valorRecorrido),
                            dataResposta:
                              recurso.dataResposta?.slice(0, 10) || "",
                            valorRecuperado: String(recurso.valorRecuperado),
                            status: recurso.status,
                            observacao: recurso.observacao || "",
                          })
                        }
                      >
                        <Pencil size={17} />
                      </IconButton>
                      {recurso.status === "EmPreparacao" && (
                        <IconButton
                          label="Excluir recurso"
                          title="Excluir recurso"
                          tone="danger"
                          onClick={() =>
                            setConfirmAction({
                              title: "Excluir recurso",
                              message:
                                "Excluir este recurso ainda em preparação?",
                              action: () =>
                                deleteRecursoGlosa(recurso.id, session.token),
                              success: "Recurso excluído.",
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
          {!selectedBilling.glosas.length && (
            <p className="empty-row">Nenhuma glosa registrada.</p>
          )}
        </Modal>
  );
}
