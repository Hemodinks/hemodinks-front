import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, CalendarClock, ChevronDown, Download, FileText, History, ReceiptText, Trash2, TriangleAlert, Upload, Wallet } from 'lucide-react';
import { AlertMessage, DataPanel, IconButton, ToastMessage } from '../../shared/components/ui';
import { deleteBillingHistoryFile, downloadBillingHistoryFile, getBillingHistoryFiles, uploadBillingHistoryFile } from '../../services';
import { downloadBlob } from '../../shared/utils/downloadFile';
import { formatCurrency } from '../../shared/utils/formatters';
import { BillingSummaryModal } from './BillingPageComponents';
import { BillingHistoryCharts, BillingHistoryMonthSummary, QuarterlyDashboard } from './BillingHistoryInsights';
import { buildBillingHistory, getBillingHistoryMonthTone, getBillingQuarterHighlights } from './billingHistory';
import { loadBillingPatients } from './billingPageUtils';
import type { BillingPageProps } from './billingPageTypes';
import { buildBillingRecords, createEmptyBillingFilters, filterBillingRecords } from './billingUtils';
import './billing.css';

type BillingHistoryPageProps = BillingPageProps & { canManageFiles: boolean };

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BillingHistoryPage({ session, isMedical, canManageFiles }: BillingHistoryPageProps) {
  const [openYears, setOpenYears] = useState<Set<number>>(new Set());
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'history' | 'charts'>('history');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [summaryRecordId, setSummaryRecordId] = useState<number | null>(null);
  const [busyFileKey, setBusyFileKey] = useState<string | null>(null);
  const [fileMessage, setFileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const billingQuery = useQuery({
    queryKey: ['billingRecords', session.token, '', '', '', '', '', '', isMedical ? session.user.id : 'all'],
    queryFn: () => loadBillingPatients(session.token, {
      search: '',
      medico: '',
      convenio: '',
      procedimento: '',
      competenciaInicio: '',
      competenciaFinal: '',
    }),
    staleTime: 30 * 1000,
  });
  const filesQuery = useQuery({
    queryKey: ['billingHistoryFiles', session.token],
    queryFn: () => getBillingHistoryFiles(session.token),
    staleTime: 30 * 1000,
  });
  const records = useMemo(() => filterBillingRecords(
    buildBillingRecords(billingQuery.data ?? []),
    createEmptyBillingFilters('', ''),
    {
      restrictToMedicalUser: isMedical,
      currentMedicalUserId: session.user.id,
      currentMedicalUserName: session.user.nome,
    },
  ), [billingQuery.data, isMedical, session.user.id, session.user.nome]);
  const history = useMemo(() => buildBillingHistory(records), [records]);
  const historyFiles = Array.isArray(filesQuery.data) ? filesQuery.data : [];
  const summaryRecord = summaryRecordId == null
    ? null
    : records.find((record) => record.id === summaryRecordId) ?? null;

  useEffect(() => {
    const newestYear = history.years[0]?.year;
    if (newestYear == null) return;
    setOpenYears((current) => current.size ? current : new Set([newestYear]));
    setSelectedYear((current) => current ?? newestYear);
  }, [history.years]);

  const toggleYear = (year: number) => {
    setSelectedYear(year);
    setOpenYears((current) => {
      const next = new Set(current);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const toggleMonth = (year: number, month: number) => {
    const key = `${year}-${month}`;
    setOpenMonth((current) => current === key ? null : key);
  };

  const handleFilesChange = async (year: number, month: number, selectedFiles: FileList | null) => {
    if (!selectedFiles?.length) return;
    const key = `${year}-${month}`;
    setBusyFileKey(key);
    setFileMessage(null);
    try {
      for (const file of Array.from(selectedFiles)) {
        await uploadBillingHistoryFile(session.token, year, month, file);
      }
      await filesQuery.refetch();
      setFileMessage({ type: 'success', text: `${selectedFiles.length} arquivo(s) anexado(s) com sucesso.` });
    } catch (error) {
      setFileMessage({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível anexar o arquivo.' });
    } finally {
      setBusyFileKey(null);
    }
  };

  const handleDownloadFile = async (fileId: number, fileName: string) => {
    const key = `download-${fileId}`;
    setBusyFileKey(key);
    setFileMessage(null);
    try {
      downloadBlob(await downloadBillingHistoryFile(session.token, fileId), fileName);
    } catch (error) {
      setFileMessage({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível baixar o arquivo.' });
    } finally {
      setBusyFileKey(null);
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!window.confirm('Deseja excluir este arquivo do histórico?')) return;
    const key = `delete-${fileId}`;
    setBusyFileKey(key);
    setFileMessage(null);
    try {
      await deleteBillingHistoryFile(session.token, fileId);
      await filesQuery.refetch();
      setFileMessage({ type: 'success', text: 'Arquivo excluído com sucesso.' });
    } catch (error) {
      setFileMessage({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível excluir o arquivo.' });
    } finally {
      setBusyFileKey(null);
    }
  };

  return (
    <section className="workspace billing-workspace billing-history-workspace">
      <DataPanel className="billing-history-hero">
        <div className="billing-history-hero-copy">
          <span className="billing-history-icon" aria-hidden="true"><CalendarClock size={22} /></span>
          <div>
            <span className="eyebrow">Faturamento médico</span>
            <h2>Histórico</h2>
            <p>Consulte todos os atendimentos organizados pelo mês e ano da data de atendimento.</p>
          </div>
        </div>
        <div className="billing-history-tabs" role="tablist" aria-label="Visualização do histórico">
          <button type="button" role="tab" aria-selected={activeTab === 'history'} className={activeTab === 'history' ? 'is-active' : ''} onClick={() => setActiveTab('history')}>
            <History size={18} />Histórico
          </button>
          <button type="button" role="tab" aria-selected={activeTab === 'charts'} className={activeTab === 'charts' ? 'is-active' : ''} onClick={() => setActiveTab('charts')}>
            <BarChart3 size={18} />Gráficos
          </button>
        </div>
      </DataPanel>

      {billingQuery.error && (
        <AlertMessage type="error">
          {billingQuery.error instanceof Error ? billingQuery.error.message : 'Não foi possível carregar o histórico.'}
        </AlertMessage>
      )}

      {filesQuery.error && (
        <AlertMessage type="error">
          {filesQuery.error instanceof Error ? filesQuery.error.message : 'Não foi possível carregar os arquivos do histórico.'}
        </AlertMessage>
      )}

      {fileMessage && <ToastMessage type={fileMessage.type}>{fileMessage.text}</ToastMessage>}

      {history.recordsWithoutAttendanceDate.length > 0 && (
        <AlertMessage type="warning" icon={<TriangleAlert size={17} />}>
          {history.recordsWithoutAttendanceDate.length} atendimento(s) não possuem data de atendimento válida e não foram agrupados.
        </AlertMessage>
      )}

      {billingQuery.isPending ? (
        <DataPanel><p className="empty-row" role="status">Carregando histórico de faturamento...</p></DataPanel>
      ) : history.years.length === 0 ? (
        <DataPanel><p className="empty-row" role="status">Nenhum faturamento disponível no histórico.</p></DataPanel>
      ) : activeTab === 'charts' ? (
        <BillingHistoryCharts
          year={history.years.find((year) => year.year === selectedYear) ?? history.years[0]}
          years={history.years}
          selectedYear={selectedYear ?? history.years[0].year}
          onChange={setSelectedYear}
        />
      ) : (
        <>
          <QuarterlyDashboard
            year={history.years.find((year) => year.year === selectedYear) ?? history.years[0]}
            years={history.years}
            selectedYear={selectedYear ?? history.years[0].year}
            onChange={setSelectedYear}
          />
          <div className="billing-history-years">
          {history.years.map((yearGroup) => {
            const yearIsOpen = openYears.has(yearGroup.year);
            const yearPanelId = `billing-history-year-${yearGroup.year}`;
            const quarterHighlights = getBillingQuarterHighlights(yearGroup);
            return (
              <DataPanel className={`billing-history-year ${yearIsOpen ? 'is-open' : ''}`} key={yearGroup.year}>
                <button
                  type="button"
                  className="billing-history-year-toggle"
                  aria-expanded={yearIsOpen}
                  aria-controls={yearPanelId}
                  onClick={() => toggleYear(yearGroup.year)}
                >
                  <span className="billing-history-period"><strong>{yearGroup.year}</strong><small>{yearGroup.summary.totalRecords} atendimento(s)</small></span>
                  <span className="billing-history-totals">
                    <span><Wallet size={16} />{formatCurrency(yearGroup.summary.totalGrossAmount)}</span>
                    <span><ReceiptText size={16} />Líquido {formatCurrency(yearGroup.summary.totalNetAmount)}</span>
                  </span>
                  <ChevronDown className="billing-history-chevron" size={20} aria-hidden="true" />
                </button>

                {yearIsOpen && (
                  <div id={yearPanelId} className="billing-history-months">
                    {yearGroup.months.map((monthGroup) => {
                      const monthKey = `${yearGroup.year}-${monthGroup.month}`;
                      const monthIsOpen = openMonth === monthKey;
                      const monthPanelId = `billing-history-month-${monthKey}`;
                      const monthTone = getBillingHistoryMonthTone(monthGroup.month, quarterHighlights);
                      return (
                        <section className={`billing-history-month is-${monthTone} ${monthIsOpen ? 'is-open' : ''}`} key={monthKey}>
                          <button
                            type="button"
                            className="billing-history-month-toggle"
                            aria-expanded={monthIsOpen}
                            aria-controls={monthPanelId}
                            onClick={() => toggleMonth(yearGroup.year, monthGroup.month)}
                          >
                            <span className="billing-history-period"><strong>{monthGroup.name}</strong><small>{monthGroup.summary.totalRecords} atendimento(s)</small></span>
                            <span className="billing-history-month-value">{formatCurrency(monthGroup.summary.totalGrossAmount)}</span>
                            <ChevronDown className="billing-history-chevron" size={18} aria-hidden="true" />
                          </button>

                          {monthIsOpen && (
                            <div id={monthPanelId} className="billing-history-month-content">
                              <BillingHistoryMonthSummary month={monthGroup} />
                              <div className="billing-history-files">
                                <div className="billing-history-files-heading">
                                  <div><strong>Arquivos do mês</strong><small>Documentos vinculados a {monthGroup.name.toLocaleLowerCase('pt-BR')} de {yearGroup.year}.</small></div>
                                  {canManageFiles && (
                                    <label className={`billing-history-upload ${busyFileKey === monthKey ? 'is-busy' : ''}`}>
                                      <Upload size={16} />
                                      <span>{busyFileKey === monthKey ? 'Enviando...' : 'Anexar arquivos'}</span>
                                      <input
                                        type="file"
                                        multiple
                                        disabled={busyFileKey !== null}
                                        aria-label={`Anexar arquivos em ${monthGroup.name} de ${yearGroup.year}`}
                                        onChange={(event) => {
                                          void handleFilesChange(yearGroup.year, monthGroup.month, event.currentTarget.files);
                                          event.currentTarget.value = '';
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                                {historyFiles.filter((file) => file.ano === yearGroup.year && file.mes === monthGroup.month).length === 0 ? (
                                  <p className="billing-history-files-empty">Nenhum arquivo anexado neste mês.</p>
                                ) : (
                                  <ul className="billing-history-file-list">
                                    {historyFiles.filter((file) => file.ano === yearGroup.year && file.mes === monthGroup.month).map((file) => (
                                      <li key={file.id}>
                                        <span><FileText size={17} /><span><strong>{file.nomeOriginal}</strong><small>{formatFileSize(file.tamanhoBytes)} · {new Date(file.dataUpload).toLocaleString('pt-BR')}</small></span></span>
                                        <span className="billing-history-file-actions">
                                          <IconButton label={`Baixar ${file.nomeOriginal}`} disabled={busyFileKey !== null} onClick={() => void handleDownloadFile(file.id, file.nomeOriginal)}><Download size={17} /></IconButton>
                                          {canManageFiles && <IconButton label={`Excluir ${file.nomeOriginal}`} disabled={busyFileKey !== null} onClick={() => void handleDeleteFile(file.id)}><Trash2 size={17} /></IconButton>}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                              {monthGroup.records.length === 0 ? (
                                <p className="billing-history-empty">Nenhum atendimento realizado em {monthGroup.name.toLocaleLowerCase('pt-BR')}.</p>
                              ) : (
                                <div className="table-wrap">
                                  <table className="billing-table billing-history-table">
                                    <thead><tr><th>Paciente</th><th>Cirurgião</th><th>Data do atendimento</th><th>Faturado</th><th>Glosa</th><th>Líquido</th><th>Status</th><th>Resumo</th></tr></thead>
                                    <tbody>
                                      {monthGroup.records.map((record) => (
                                        <tr key={record.id}>
                                          <td data-label="Paciente"><strong>{record.patientName}</strong><span>{record.convenioName}</span></td>
                                          <td data-label="Cirurgião">{record.doctorName}</td>
                                          <td data-label="Data do atendimento">{record.surgeryDateLabel}</td>
                                          <td data-label="Faturado">{formatCurrency(record.paymentAmount)}</td>
                                          <td data-label="Glosa">{formatCurrency(record.glosaAmount)}</td>
                                          <td data-label="Líquido"><strong>{formatCurrency(record.netAmount)}</strong></td>
                                          <td data-label="Status"><span className={`status-pill ${record.status === 'paid' ? 'ok' : record.status === 'pending' ? 'warning' : 'inactive'}`}>{record.statusLabel}</span></td>
                                          <td data-label="Resumo">
                                            <IconButton label={`Informações resumidas de ${record.patientName}`} title="Informações resumidas" onClick={() => setSummaryRecordId(record.id)}><FileText size={18} /></IconButton>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                )}
              </DataPanel>
            );
          })}
          </div>
        </>
      )}

      {summaryRecord && <BillingSummaryModal record={summaryRecord} authToken={session.token} onClose={() => setSummaryRecordId(null)} />}
    </section>
  );
}
