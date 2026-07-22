import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Plus, RefreshCw, RotateCcw, Wallet, X } from 'lucide-react';
import { AlertMessage, Button, DataPanel, SelectField, TextField } from '../../shared/components/ui';
import { Modal } from '../../shared/components/Modal';
import { formatCurrency } from '../../shared/utils/formatters';
import type { AtendimentoCirurgico, AuthSession, ContaReceber, Convenio, ConvenioProcedimentoPreco, Faturamento, MedicalUserOption, Paciente } from '../../types';
import { createAtendimento, createFaturamento, estornarRecebimento, gerarContaReceber, getAtendimentos,
  getContasReceber, getConvenioProcedimentoPrecos, getFaturamentos, getHospitais, getPacientes, registrarRecebimento,
  registrarRecursoGlosa, registrarRetornoFaturamento, saveConvenioProcedimentoPreco, updateFaturamentoStatus,
  uploadComprovanteRecebimento } from '../../services';
import './billing.css';

type BillingPageProps = { session: AuthSession; medicalUsers: MedicalUserOption[]; convenios: Convenio[]; isAdmin: boolean; isMedical: boolean };
type Tab = 'atendimentos' | 'faturamento' | 'financeiro' | 'precos';

export function BillingPage({ session, medicalUsers, convenios, isMedical }: BillingPageProps) {
  const [tab, setTab] = useState<Tab>('atendimentos');
  const [atendimentos, setAtendimentos] = useState<AtendimentoCirurgico[]>([]);
  const [faturamentos, setFaturamentos] = useState<Faturamento[]>([]);
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [precos, setPrecos] = useState<ConvenioProcedimentoPreco[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [hospitais, setHospitais] = useState<Array<{ id: number; nome: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [atendimentoForm, setAtendimentoForm] = useState({ pacienteId: '', dataProcedimento: '', hospitalId: '', convenioId: '', medicoResponsavelId: isMedical ? String(session.user.id) : '', medicoAuxiliar1Id: '', medicoAuxiliar2Id: '', diagnostico: '', tratamentoMedico: '', cbhpmCodigo: '', descricao: '', quantidade: '1', pesoPercentual: '100', numeroAutorizacao: '' });
  const [faturamentoForm, setFaturamentoForm] = useState({ atendimentoCirurgicoId: '', competencia: new Date().toISOString().slice(0, 7), numeroGuia: '', numeroLote: '' });
  const [procedimentos, setProcedimentos] = useState<Array<{ cbhpmCodigo: string | null; descricao: string | null; quantidade: number; pesoPercentual: number }>>([]);
  const [receipt, setReceipt] = useState<{ contaId: string; valor: string; forma: string; referencia: string; comprovante: File | null }>({ contaId: '', valor: '', forma: 'Pix', referencia: '', comprovante: null });
  const [price, setPrice] = useState({ convenioId: '', cbhpmCodigo: '', valorNegociado: '', percentualPrincipal: '100', percentualAuxiliar1: '0', percentualAuxiliar2: '0', vigenciaInicio: new Date().toISOString().slice(0, 10), vigenciaFinal: '' });
  const [returnTarget, setReturnTarget] = useState<Faturamento | null>(null);
  const [returnDraft, setReturnDraft] = useState<Array<{ faturamentoItemId: number; descricao: string; valorApresentado: number; valorGlosado: string; motivoGlosa: string }>>([]);
  const [appealTarget, setAppealTarget] = useState<{ glosaId: number; valorGlosado: number } | null>(null);
  const [appealDraft, setAppealDraft] = useState({ justificativa: '', valorRecuperado: '0' });
  const [reversalTarget, setReversalTarget] = useState<{ id: number; valor: number } | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const canManageBilling = !isMedical;

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [nextAtendimentos, nextFaturamentos, nextContas, nextPrecos, patientPage, nextHospitais] = await Promise.all([
        getAtendimentos(session.token), getFaturamentos(session.token), canManageBilling ? getContasReceber(session.token) : Promise.resolve([]),
        getConvenioProcedimentoPrecos(session.token),
        getPacientes(session.token, { page: 1, pageSize: 100 }), getHospitais(session.token),
      ]);
      setAtendimentos(nextAtendimentos); setFaturamentos(nextFaturamentos); setContas(nextContas);
      setPrecos(nextPrecos);
      setPacientes(patientPage.items); setHospitais(nextHospitais);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o módulo.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [session.token]);

  const openBalance = useMemo(() => contas.filter((x) => x.status !== 'Cancelado').reduce((sum, x) => sum + x.saldoAberto, 0), [contas]);
  const received = useMemo(() => contas.reduce((sum, x) => sum + x.valorRecebido, 0), [contas]);
  const run = async (action: () => Promise<unknown>, message: string) => {
    setLoading(true); setError(''); setSuccess('');
    try { await action(); setSuccess(message); setShowForm(false); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Operação não concluída.'); setLoading(false); }
  };

  const submitAtendimento = (event: FormEvent) => {
    event.preventDefault();
    const currentProcedure = atendimentoForm.cbhpmCodigo || atendimentoForm.descricao ? [{ cbhpmCodigo: atendimentoForm.cbhpmCodigo || null,
      descricao: atendimentoForm.descricao || null, quantidade: Number(atendimentoForm.quantidade), pesoPercentual: Number(atendimentoForm.pesoPercentual) }] : [];
    void run(() => createAtendimento({
      pacienteId: Number(atendimentoForm.pacienteId), dataProcedimento: atendimentoForm.dataProcedimento,
      hospitalId: atendimentoForm.hospitalId ? Number(atendimentoForm.hospitalId) : null,
      convenioId: atendimentoForm.convenioId ? Number(atendimentoForm.convenioId) : null,
      medicoResponsavelId: Number(atendimentoForm.medicoResponsavelId), medicoAuxiliar1Id: atendimentoForm.medicoAuxiliar1Id ? Number(atendimentoForm.medicoAuxiliar1Id) : null,
      medicoAuxiliar2Id: atendimentoForm.medicoAuxiliar2Id ? Number(atendimentoForm.medicoAuxiliar2Id) : null,
      diagnostico: atendimentoForm.diagnostico || null, tratamentoMedico: atendimentoForm.tratamentoMedico || null, numeroAutorizacao: atendimentoForm.numeroAutorizacao || null,
      status: 'Planejado', procedimentos: [...procedimentos, ...currentProcedure],
    }, session.token), 'Atendimento criado com snapshot de preço.');
  };

  const submitFaturamento = (event: FormEvent) => {
    event.preventDefault();
    void run(() => createFaturamento({ atendimentoCirurgicoId: Number(faturamentoForm.atendimentoCirurgicoId),
      numeroGuia: faturamentoForm.numeroGuia || null, numeroLote: faturamentoForm.numeroLote || null,
      competencia: `${faturamentoForm.competencia}-01`, observacao: null }, session.token), 'Faturamento criado a partir do atendimento.');
  };

  const createAccount = (item: Faturamento) => void run(() => gerarContaReceber(item.id, {
    faturamentoId: item.id, numeroDocumento: `FAT-${item.id}-01`, descricao: `Faturamento ${item.numeroGuia || item.id}`,
    dataEmissao: new Date().toISOString(), dataVencimento: new Date(Date.now() + 30 * 86400000).toISOString(),
    valorOriginal: null, valorAjustado: null, observacao: null,
  }, session.token), 'Conta a receber gerada sem duplicidade.');
  const openReturn = (item: Faturamento) => {
    setReturnTarget(item);
    setReturnDraft(item.itens.map((billingItem) => ({ faturamentoItemId: billingItem.id, descricao: billingItem.descricao,
      valorApresentado: billingItem.valorApresentado, valorGlosado: '0', motivoGlosa: '' })));
  };
  const submitReturn = (event: FormEvent) => {
    event.preventDefault(); if (!returnTarget) return;
    const inputs = returnDraft.map((input) => { const valorGlosado = Number(input.valorGlosado.replace(',', '.'));
      return { faturamentoItemId: input.faturamentoItemId, valorGlosado, valorAprovado: input.valorApresentado - valorGlosado,
        codigoMotivo: null, motivoGlosa: valorGlosado > 0 ? input.motivoGlosa : null }; });
    void run(() => registrarRetornoFaturamento(returnTarget.id, { id: returnTarget.id, dataRetorno: new Date().toISOString(),
      itens: inputs, rowVersion: returnTarget.rowVersion }, session.token), 'Retorno registrado e títulos reconciliados.').then(() => setReturnTarget(null));
  };
  const submitAppeal = (event: FormEvent) => {
    event.preventDefault(); if (!appealTarget) return;
    const valorRecuperado = Number(appealDraft.valorRecuperado.replace(',', '.'));
    void run(() => registrarRecursoGlosa(appealTarget.glosaId, { glosaId: appealTarget.glosaId, dataEnvio: new Date().toISOString(), justificativa: appealDraft.justificativa,
      valorRecorrido: appealTarget.valorGlosado, dataResposta: valorRecuperado > 0 ? new Date().toISOString() : null,
      valorRecuperado, status: valorRecuperado > 0 ? valorRecuperado === appealTarget.valorGlosado ? 'Aceito' : 'AceitoParcialmente' : 'Enviado',
      observacao: null }, session.token), 'Recurso de glosa registrado.').then(() => setAppealTarget(null));
  };
  const submitReversal = (event: FormEvent) => {
    event.preventDefault(); if (!reversalTarget) return;
    void run(() => estornarRecebimento(reversalTarget.id, reversalReason, session.token), 'Recebimento estornado e saldo recalculado.')
      .then(() => { setReversalTarget(null); setReversalReason(''); });
  };

  const submitReceipt = async (event: FormEvent) => {
    event.preventDefault(); const account = contas.find((x) => x.id === Number(receipt.contaId)); if (!account) return;
    await run(async () => { const updated = await registrarRecebimento(account.id, { contaReceberId: account.id, dataRecebimento: new Date().toISOString(),
        valorRecebido: Number(receipt.valor.replace(',', '.')), formaRecebimento: receipt.forma,
        referenciaBancaria: receipt.referencia || null, documentoComprovante: null, observacao: null,
        usuarioCadastroId: 0, rowVersion: account.rowVersion }, session.token);
      if (receipt.comprovante) { const created = updated.recebimentos.find((x) => !account.recebimentos.some((old) => old.id === x.id));
        if (created) await uploadComprovanteRecebimento(created.id, receipt.comprovante, session.token); }
    }, receipt.comprovante ? 'Recebimento e comprovante registrados.' : 'Recebimento registrado e saldo recalculado.');
  };
  const submitPrice = (event: FormEvent) => {
    event.preventDefault();
    void run(() => saveConvenioProcedimentoPreco({ id: null, convenioId: Number(price.convenioId), cbhpmCodigo: price.cbhpmCodigo,
      valorNegociado: Number(price.valorNegociado), percentualPrincipal: Number(price.percentualPrincipal),
      percentualAuxiliar1: Number(price.percentualAuxiliar1), percentualAuxiliar2: Number(price.percentualAuxiliar2),
      vigenciaInicio: price.vigenciaInicio, vigenciaFinal: price.vigenciaFinal || null, ativo: true }, session.token), 'Preço negociado salvo com vigência.');
  };

  return <section className="workspace billing-workspace">
    <DataPanel className="billing-filter-panel">
      <div className="billing-section-heading">
        <div><span className="eyebrow">Fluxo oficial</span><h2>Atendimento → Faturamento → Contas a receber</h2></div>
        <Button onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Atualizar</Button>
      </div>
      <div className="billing-filter-actions">
        <Button variant={tab === 'atendimentos' ? 'primary' : undefined} onClick={() => { setTab('atendimentos'); setShowForm(false); }}>Atendimentos</Button>
        <Button variant={tab === 'faturamento' ? 'primary' : undefined} onClick={() => { setTab('faturamento'); setShowForm(false); }}>Faturamento</Button>
        {canManageBilling && <Button variant={tab === 'financeiro' ? 'primary' : undefined} onClick={() => { setTab('financeiro'); setShowForm(false); }}>Contas a receber</Button>}
        <Button variant={tab === 'precos' ? 'primary' : undefined} onClick={() => { setTab('precos'); setShowForm(false); }}>Tabela de preços</Button>
      </div>
    </DataPanel>
    {error && <AlertMessage type="error">{error}</AlertMessage>}{success && <AlertMessage type="success">{success}</AlertMessage>}

    {tab === 'atendimentos' && <>
      <DataPanel><div className="billing-section-heading"><div><span className="eyebrow">Origem clínica</span><h3>Atendimentos cirúrgicos</h3></div>
        <Button variant="primary" onClick={() => setShowForm((x) => !x)}><Plus size={16} /> Novo atendimento</Button></div>
        {showForm && <form className="billing-filter-grid" onSubmit={submitAtendimento}>
          <SelectField label="Paciente" value={atendimentoForm.pacienteId} required onChange={(e) => setAtendimentoForm({ ...atendimentoForm, pacienteId: e.target.value })}>
            <option value="">Selecione</option>{pacientes.map((x) => <option key={x.id} value={x.id}>{x.nomePaciente}</option>)}
          </SelectField>
          <TextField label="Data da cirurgia" type="date" value={atendimentoForm.dataProcedimento} required onValueChange={(v) => setAtendimentoForm({ ...atendimentoForm, dataProcedimento: v })} />
          <SelectField label="Hospital" value={atendimentoForm.hospitalId} onChange={(e) => setAtendimentoForm({ ...atendimentoForm, hospitalId: e.target.value })}>
            <option value="">Não informado</option>{hospitais.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </SelectField>
          <SelectField label="Convênio" value={atendimentoForm.convenioId} onChange={(e) => setAtendimentoForm({ ...atendimentoForm, convenioId: e.target.value })}>
            <option value="">Particular</option>{convenios.map((x) => <option key={x.idConvenio} value={x.idConvenio}>{x.descricaoConvenio}</option>)}
          </SelectField>
          <SelectField label="Médico responsável" value={atendimentoForm.medicoResponsavelId} required disabled={isMedical} onChange={(e) => setAtendimentoForm({ ...atendimentoForm, medicoResponsavelId: e.target.value })}>
            <option value="">Selecione</option>{medicalUsers.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </SelectField>
          <SelectField label="Médico auxiliar 1" value={atendimentoForm.medicoAuxiliar1Id} onChange={(e) => setAtendimentoForm({ ...atendimentoForm, medicoAuxiliar1Id: e.target.value })}>
            <option value="">Não informado</option>{medicalUsers.filter((x) => String(x.id) !== atendimentoForm.medicoResponsavelId).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </SelectField>
          <SelectField label="Médico auxiliar 2" value={atendimentoForm.medicoAuxiliar2Id} onChange={(e) => setAtendimentoForm({ ...atendimentoForm, medicoAuxiliar2Id: e.target.value })}>
            <option value="">Não informado</option>{medicalUsers.filter((x) => String(x.id) !== atendimentoForm.medicoResponsavelId && String(x.id) !== atendimentoForm.medicoAuxiliar1Id).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
          </SelectField>
          <TextField label="Diagnóstico" value={atendimentoForm.diagnostico} onValueChange={(v) => setAtendimentoForm({ ...atendimentoForm, diagnostico: v })} />
          <TextField label="Tratamento médico" value={atendimentoForm.tratamentoMedico} onValueChange={(v) => setAtendimentoForm({ ...atendimentoForm, tratamentoMedico: v })} />
          <TextField label="Código CBHPM" value={atendimentoForm.cbhpmCodigo} onValueChange={(v) => setAtendimentoForm({ ...atendimentoForm, cbhpmCodigo: v })} />
          <TextField label="Descrição (se código não cadastrado)" value={atendimentoForm.descricao} onValueChange={(v) => setAtendimentoForm({ ...atendimentoForm, descricao: v })} />
          <TextField label="Quantidade" type="number" min="0.0001" step="0.0001" value={atendimentoForm.quantidade} onValueChange={(v) => setAtendimentoForm({ ...atendimentoForm, quantidade: v })} />
          <TextField label="Peso percentual" type="number" min="0" step="0.0001" value={atendimentoForm.pesoPercentual} onValueChange={(v) => setAtendimentoForm({ ...atendimentoForm, pesoPercentual: v })} />
          <Button type="button" onClick={() => {
            if (!atendimentoForm.cbhpmCodigo && !atendimentoForm.descricao) return;
            setProcedimentos((items) => [...items, { cbhpmCodigo: atendimentoForm.cbhpmCodigo || null,
              descricao: atendimentoForm.descricao || null, quantidade: Number(atendimentoForm.quantidade), pesoPercentual: Number(atendimentoForm.pesoPercentual) }]);
            setAtendimentoForm({ ...atendimentoForm, cbhpmCodigo: '', descricao: '', quantidade: '1', pesoPercentual: '100' });
          }}>Adicionar outro procedimento</Button>
          {procedimentos.length > 0 && <span className="file-hint">{procedimentos.length} procedimento(s) adicionados à cirurgia.</span>}
          <TextField label="Autorização" value={atendimentoForm.numeroAutorizacao} onValueChange={(v) => setAtendimentoForm({ ...atendimentoForm, numeroAutorizacao: v })} />
          <Button variant="primary" type="submit" disabled={loading}>Salvar atendimento</Button>
        </form>}
      </DataPanel>
      <RecordTable headers={['Paciente', 'Data', 'Status', 'Procedimentos']} rows={atendimentos.map((x) => [x.paciente, new Date(x.dataProcedimento).toLocaleDateString('pt-BR'), x.status, x.procedimentos.map((p) => p.cbhpmCodigo || p.descricao).join(', ')])} />
    </>}

    {tab === 'faturamento' && <>
      <DataPanel><div className="billing-section-heading"><div><span className="eyebrow">Cobrança</span><h3>Faturamentos normalizados</h3></div>
        {canManageBilling && <Button variant="primary" onClick={() => setShowForm((x) => !x)}><Plus size={16} /> Novo faturamento</Button>}</div>
        {showForm && canManageBilling && <form className="billing-filter-grid" onSubmit={submitFaturamento}>
          <SelectField label="Atendimento" value={faturamentoForm.atendimentoCirurgicoId} required onChange={(e) => setFaturamentoForm({ ...faturamentoForm, atendimentoCirurgicoId: e.target.value })}>
            <option value="">Selecione</option>{atendimentos.map((x) => <option key={x.id} value={x.id}>{x.paciente} — {new Date(x.dataProcedimento).toLocaleDateString('pt-BR')}</option>)}
          </SelectField>
          <TextField label="Competência" type="month" value={faturamentoForm.competencia} required onValueChange={(v) => setFaturamentoForm({ ...faturamentoForm, competencia: v })} />
          <TextField label="Número da guia" value={faturamentoForm.numeroGuia} onValueChange={(v) => setFaturamentoForm({ ...faturamentoForm, numeroGuia: v })} />
          <TextField label="Número do lote" value={faturamentoForm.numeroLote} onValueChange={(v) => setFaturamentoForm({ ...faturamentoForm, numeroLote: v })} />
          <Button variant="primary" type="submit" disabled={loading}>Gerar itens do faturamento</Button>
        </form>}
      </DataPanel>
      <DataPanel className="billing-table-panel"><div className="table-wrap"><table className="billing-table"><thead><tr><th>Paciente</th><th>Guia</th><th>Apresentado</th><th>Glosa</th><th>Reconhecido</th><th>Status / ação</th></tr></thead><tbody>
        {faturamentos.map((x) => <tr key={x.id}><td>{x.paciente}</td><td>{x.numeroGuia || '-'}</td><td>{formatCurrency(x.valorApresentado)}</td><td>{formatCurrency(x.valorGlosado)}</td><td>{formatCurrency(x.valorReconhecido)}</td><td><span className="status-pill active">{x.status}</span>{canManageBilling && x.status === 'Rascunho' && <Button onClick={() => void run(() => updateFaturamentoStatus(x.id, { id: x.id, status: 'ProntoParaEnvio', rowVersion: x.rowVersion }, session.token), 'Faturamento pronto para envio.')}>Preparar</Button>}{canManageBilling && !['Rascunho', 'Cancelado'].includes(x.status) && <Button onClick={() => openReturn(x)}>Registrar retorno</Button>}{canManageBilling && x.status !== 'Rascunho' && x.status !== 'Cancelado' && <Button onClick={() => createAccount(x)}><ArrowRight size={15} /> Gerar título</Button>}{canManageBilling && x.glosas.map((g) => <Button key={g.id} onClick={() => { setAppealTarget({ glosaId: g.id, valorGlosado: g.valorGlosado }); setAppealDraft({ justificativa: '', valorRecuperado: '0' }); }}>Recorrer glosa {formatCurrency(g.valorGlosado)}</Button>)}</td></tr>)}
        {!faturamentos.length && <tr><td colSpan={6} className="empty-row">Nenhum faturamento no novo fluxo.</td></tr>}
      </tbody></table></div></DataPanel>
    </>}

    {tab === 'financeiro' && canManageBilling && <>
      <section className="billing-summary-grid"><Summary title="Saldo em aberto" value={formatCurrency(openBalance)} /><Summary title="Total recebido" value={formatCurrency(received)} /></section>
      <DataPanel><div className="billing-section-heading"><div><span className="eyebrow">Financeiro</span><h3>Registrar recebimento</h3></div><Wallet size={20} /></div>
        <form className="billing-filter-grid" onSubmit={submitReceipt}>
          <SelectField label="Título" value={receipt.contaId} required onChange={(e) => setReceipt({ ...receipt, contaId: e.target.value })}><option value="">Selecione</option>{contas.filter((x) => x.saldoAberto > 0).map((x) => <option key={x.id} value={x.id}>{x.numeroDocumento} — {x.paciente} — {formatCurrency(x.saldoAberto)}</option>)}</SelectField>
          <TextField label="Valor recebido" type="number" min="0.01" step="0.01" value={receipt.valor} required onValueChange={(v) => setReceipt({ ...receipt, valor: v })} />
          <SelectField label="Forma" value={receipt.forma} onChange={(e) => setReceipt({ ...receipt, forma: e.target.value })}>{['Pix', 'Transferencia', 'Boleto', 'Dinheiro', 'Cartao', 'Deposito', 'Outro'].map((x) => <option key={x}>{x}</option>)}</SelectField>
          <TextField label="Referência bancária" value={receipt.referencia} onValueChange={(v) => setReceipt({ ...receipt, referencia: v })} />
          <label className="filter-field"><span>Comprovante (opcional)</span><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setReceipt({ ...receipt, comprovante: event.target.files?.[0] ?? null })} /></label>
          <Button variant="primary" type="submit" disabled={loading}>Registrar recebimento</Button>
        </form>
      </DataPanel>
      <DataPanel className="billing-table-panel"><div className="table-wrap"><table className="billing-table"><thead><tr><th>Documento</th><th>Paciente</th><th>Vencimento</th><th>Original</th><th>Recebido</th><th>Saldo</th><th>Status</th></tr></thead><tbody>{contas.map((x) => <tr key={x.id}><td>{x.numeroDocumento}</td><td>{x.paciente}</td><td>{new Date(x.dataVencimento).toLocaleDateString('pt-BR')}</td><td>{formatCurrency(x.valorOriginal)}</td><td>{formatCurrency(x.valorRecebido)}</td><td>{formatCurrency(x.saldoAberto)}</td><td><span className="status-pill active">{x.status}</span>{x.recebimentos.filter((r) => !r.estornado).map((r) => <Button key={r.id} title={`Estornar ${formatCurrency(r.valorRecebido)}`} onClick={() => setReversalTarget({ id: r.id, valor: r.valorRecebido })}><RotateCcw size={14} /></Button>)}</td></tr>)}</tbody></table></div></DataPanel>
    </>}
    {tab === 'precos' && <>
      {canManageBilling && <DataPanel><div className="billing-section-heading"><div><span className="eyebrow">Contratos</span><h3>Preço negociado por convênio</h3></div></div>
        <form className="billing-filter-grid" onSubmit={submitPrice}>
          <SelectField label="Convênio" value={price.convenioId} required onChange={(e) => setPrice({ ...price, convenioId: e.target.value })}><option value="">Selecione</option>{convenios.map((x) => <option key={x.idConvenio} value={x.idConvenio}>{x.descricaoConvenio}</option>)}</SelectField>
          <TextField label="Código CBHPM" value={price.cbhpmCodigo} required onValueChange={(v) => setPrice({ ...price, cbhpmCodigo: v })} />
          <TextField label="Valor negociado" type="number" min="0" step="0.01" value={price.valorNegociado} required onValueChange={(v) => setPrice({ ...price, valorNegociado: v })} />
          <TextField label="Percentual principal" type="number" min="0" step="0.0001" value={price.percentualPrincipal} onValueChange={(v) => setPrice({ ...price, percentualPrincipal: v })} />
          <TextField label="Percentual auxiliar 1" type="number" min="0" step="0.0001" value={price.percentualAuxiliar1} onValueChange={(v) => setPrice({ ...price, percentualAuxiliar1: v })} />
          <TextField label="Percentual auxiliar 2" type="number" min="0" step="0.0001" value={price.percentualAuxiliar2} onValueChange={(v) => setPrice({ ...price, percentualAuxiliar2: v })} />
          <TextField label="Vigência inicial" type="date" value={price.vigenciaInicio} required onValueChange={(v) => setPrice({ ...price, vigenciaInicio: v })} />
          <TextField label="Vigência final" type="date" value={price.vigenciaFinal} onValueChange={(v) => setPrice({ ...price, vigenciaFinal: v })} />
          <Button variant="primary" type="submit" disabled={loading}>Salvar preço</Button>
        </form>
      </DataPanel>}
      <RecordTable headers={['Convênio', 'CBHPM', 'Valor', 'Vigência', 'Status']} rows={precos.map((x) => [convenios.find((c) => c.idConvenio === x.convenioId)?.descricaoConvenio || String(x.convenioId), x.cbhpmCodigo, formatCurrency(x.valorNegociado), `${new Date(x.vigenciaInicio).toLocaleDateString('pt-BR')} — ${x.vigenciaFinal ? new Date(x.vigenciaFinal).toLocaleDateString('pt-BR') : 'sem término'}`, x.ativo ? 'Ativo' : 'Inativo'])} />
    </>}
    {returnTarget && <Modal titleId="billing-return-title" onClose={() => setReturnTarget(null)}><div className="panel-title"><h2 id="billing-return-title">Registrar retorno do faturamento</h2><Button onClick={() => setReturnTarget(null)}><X size={16} /></Button></div><form className="billing-filter-grid" onSubmit={submitReturn}>{returnDraft.map((item, index) => <div key={item.faturamentoItemId}><strong>{item.descricao}</strong><TextField label={`Glosa (máx. ${formatCurrency(item.valorApresentado)})`} type="number" min="0" max={item.valorApresentado} step="0.01" value={item.valorGlosado} required onValueChange={(value) => setReturnDraft((current) => current.map((draft, position) => position === index ? { ...draft, valorGlosado: value } : draft))} />{Number(item.valorGlosado.replace(',', '.')) > 0 && <TextField label="Motivo da glosa" value={item.motivoGlosa} required onValueChange={(value) => setReturnDraft((current) => current.map((draft, position) => position === index ? { ...draft, motivoGlosa: value } : draft))} />}</div>)}<Button variant="primary" type="submit" disabled={loading}>Confirmar retorno</Button></form></Modal>}
    {appealTarget && <Modal titleId="billing-appeal-title" onClose={() => setAppealTarget(null)}><div className="panel-title"><h2 id="billing-appeal-title">Recurso de glosa</h2><Button onClick={() => setAppealTarget(null)}><X size={16} /></Button></div><form className="billing-filter-grid" onSubmit={submitAppeal}><TextField label="Justificativa" value={appealDraft.justificativa} required onValueChange={(value) => setAppealDraft({ ...appealDraft, justificativa: value })} /><TextField label="Valor recuperado" type="number" min="0" max={appealTarget.valorGlosado} step="0.01" value={appealDraft.valorRecuperado} required onValueChange={(value) => setAppealDraft({ ...appealDraft, valorRecuperado: value })} /><span className="file-hint">Use zero enquanto o recurso aguarda resposta.</span><Button variant="primary" type="submit" disabled={loading}>Registrar recurso</Button></form></Modal>}
    {reversalTarget && <Modal titleId="billing-reversal-title" onClose={() => setReversalTarget(null)}><div className="panel-title"><h2 id="billing-reversal-title">Estornar {formatCurrency(reversalTarget.valor)}</h2><Button onClick={() => setReversalTarget(null)}><X size={16} /></Button></div><form className="billing-filter-grid" onSubmit={submitReversal}><TextField label="Motivo do estorno" value={reversalReason} required onValueChange={setReversalReason} /><Button variant="primary" type="submit" disabled={loading}>Confirmar estorno</Button></form></Modal>}
  </section>;
}

function Summary({ title, value }: { title: string; value: string }) { return <DataPanel><span>{title}</span><h3>{value}</h3></DataPanel>; }
function RecordTable({ headers, rows }: { headers: string[]; rows: Array<Array<string>> }) { return <DataPanel className="billing-table-panel"><div className="table-wrap"><table className="billing-table"><thead><tr>{headers.map((x) => <th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}{!rows.length && <tr><td colSpan={headers.length} className="empty-row">Nenhum registro.</td></tr>}</tbody></table></div></DataPanel>; }
