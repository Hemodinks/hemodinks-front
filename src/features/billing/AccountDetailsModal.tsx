import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { Ban, Download, Pencil, Save, X } from 'lucide-react';
import { Modal } from '../../shared/components/Modal';
import { Button, IconButton, TextField } from '../../shared/components/ui';
import { formatCurrency } from '../../shared/utils/formatters';
import type { ContaReceber } from '../../types';
import type { useReceivables } from './useReceivables';
import { BillingDetailSummary } from './BillingDetailSummary';

type ReceivablesState = ReturnType<typeof useReceivables>;

export function AccountDetailsModal({
  selectedAccount, accountDraft, setAccountDraft, cancelReason, setCancelReason,
  setSelectedAccount, saveAccount, cancelAccount, downloadReceipt,
}: {
  selectedAccount: ContaReceber;
  accountDraft: NonNullable<ReceivablesState["accountDraft"]> | null;
  setAccountDraft: ReceivablesState["setAccountDraft"];
  cancelReason: string;
  setCancelReason: Dispatch<SetStateAction<string>>;
  setSelectedAccount: Dispatch<SetStateAction<ContaReceber | null>>;
  saveAccount: (event: FormEvent) => void;
  cancelAccount: (event: FormEvent) => void;
  downloadReceipt: (id: number) => Promise<void>;
}) {
  return (
        <Modal
          titleId="billing-account-title"
          className="billing-wide-modal billing-account-detail-modal"
          backdropClassName="billing-account-detail-backdrop"
          onClose={() => {
            setSelectedAccount(null);
            setAccountDraft(null);
            setCancelReason("");
          }}
        >
          <div className="panel-title">
            <div>
              <span className="eyebrow">Detalhe da conta</span>
              <h2 id="billing-account-title">
                {selectedAccount.numeroDocumento}
              </h2>
            </div>
            <IconButton
              label="Fechar detalhes da conta"
              tone="muted"
              onClick={() => setSelectedAccount(null)}
            >
              <X size={16} />
            </IconButton>
          </div>
          <section className="billing-summary-grid">
            <BillingDetailSummary
              title="Valor ajustado"
              value={formatCurrency(selectedAccount.valorAjustado)}
            />
            <BillingDetailSummary
              title="Recebido"
              value={formatCurrency(selectedAccount.valorRecebido)}
            />
            <BillingDetailSummary
              title="Saldo atualizado"
              value={formatCurrency(selectedAccount.saldoAberto)}
            />
          </section>
          <div className="billing-filter-actions">
            {selectedAccount.recebimentos.every((item) => item.estornado) &&
              selectedAccount.status !== "Cancelado" && (
                <IconButton
                  label="Editar título"
                  title="Editar título"
                  tone="muted"
                  onClick={() =>
                    setAccountDraft({
                      numeroDocumento: selectedAccount.numeroDocumento,
                      descricao: selectedAccount.descricao,
                      dataEmissao: selectedAccount.dataEmissao.slice(0, 10),
                      dataVencimento: selectedAccount.dataVencimento.slice(
                        0,
                        10,
                      ),
                      valorOriginal: String(selectedAccount.valorOriginal),
                      valorAjustado: String(selectedAccount.valorAjustado),
                      observacao: selectedAccount.observacao || "",
                    })
                  }
                >
                  <Pencil size={17} />
                </IconButton>
              )}
            {selectedAccount.status !== "Cancelado" && (
              <Button onClick={() => setCancelReason(" ")}>
                <Ban size={16} />
                Cancelar título
              </Button>
            )}
          </div>
          {accountDraft && (
            <form className="billing-filter-grid" onSubmit={saveAccount}>
              <TextField
                label="Documento"
                value={accountDraft.numeroDocumento}
                required
                onValueChange={(value) =>
                  setAccountDraft({ ...accountDraft, numeroDocumento: value })
                }
              />
              <TextField
                label="Descrição"
                value={accountDraft.descricao}
                required
                onValueChange={(value) =>
                  setAccountDraft({ ...accountDraft, descricao: value })
                }
              />
              <TextField
                label="Emissão"
                type="date"
                value={accountDraft.dataEmissao}
                required
                onValueChange={(value) =>
                  setAccountDraft({ ...accountDraft, dataEmissao: value })
                }
              />
              <TextField
                label="Vencimento"
                type="date"
                value={accountDraft.dataVencimento}
                required
                onValueChange={(value) =>
                  setAccountDraft({ ...accountDraft, dataVencimento: value })
                }
              />
              <TextField
                label="Valor original"
                type="number"
                min="0"
                step="0.01"
                value={accountDraft.valorOriginal}
                required
                onValueChange={(value) =>
                  setAccountDraft({ ...accountDraft, valorOriginal: value })
                }
              />
              <TextField
                label="Valor ajustado"
                type="number"
                min="0"
                step="0.01"
                value={accountDraft.valorAjustado}
                required
                onValueChange={(value) =>
                  setAccountDraft({ ...accountDraft, valorAjustado: value })
                }
              />
              <TextField
                label="Observação"
                value={accountDraft.observacao}
                onValueChange={(value) =>
                  setAccountDraft({ ...accountDraft, observacao: value })
                }
              />
              <Button variant="primary" type="submit">
                <Save size={16} />
                Salvar título
              </Button>
            </form>
          )}
          {cancelReason && (
            <form className="billing-filter-grid" onSubmit={cancelAccount}>
              <TextField
                label="Motivo do cancelamento"
                value={cancelReason.trimStart()}
                required
                onValueChange={setCancelReason}
              />
              <Button variant="primary" type="submit">
                <Ban size={16} />
                Confirmar cancelamento
              </Button>
            </form>
          )}
          <h3>Histórico de recebimentos</h3>
          <div className="table-wrap">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Forma</th>
                  <th>Valor</th>
                  <th>Situação</th>
                  <th>Comprovante</th>
                </tr>
              </thead>
              <tbody>
                {selectedAccount.recebimentos.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {new Date(item.dataRecebimento).toLocaleDateString(
                        "pt-BR",
                      )}
                    </td>
                    <td>{item.formaRecebimento}</td>
                    <td>{formatCurrency(item.valorRecebido)}</td>
                    <td>
                      {item.estornado
                        ? `Estornado — ${item.motivoEstorno || ""}`
                        : "Ativo"}
                    </td>
                    <td>
                      {item.documentoComprovante ? (
                        <IconButton
                          label="Baixar"
                          title="Baixar comprovante"
                          onClick={() => void downloadReceipt(item.id)}
                        >
                          <Download size={17} />
                        </IconButton>
                      ) : (
                        "Não anexado"
                      )}
                    </td>
                  </tr>
                ))}
                {!selectedAccount.recebimentos.length && (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      Nenhum recebimento lançado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal>
  );
}
