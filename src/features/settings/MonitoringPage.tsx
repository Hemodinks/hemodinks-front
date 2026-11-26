import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Database, RefreshCw, Trash2 } from 'lucide-react';
import { clearMonitoringErrors, getMonitoringErrors } from '../../services';
import type { AuthSession, MonitoringErrorPage } from '../../types';
import { useConfirmationDialog } from '../../shared/components/ConfirmationDialog';
import { AlertMessage, DataPanel, ToastMessage } from '../../shared/components/ui';

type MonitoringPageProps = {
  session: AuthSession;
};

const EMPTY_PAGE: MonitoringErrorPage = {
  items: [],
  page: 1,
  pageSize: 25,
  totalItems: 0,
  totalPages: 0,
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
}

export function MonitoringPage({ session }: MonitoringPageProps) {
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  // #292: resultado guardado com a chave da página pedida; "carregando" = chave carregada diferente da pedida.
  const keyFor = (targetPage: number) => `${session.token}|${targetPage}|${refresh}`;
  const requestKey = keyFor(page);
  const [loaded, setLoaded] = useState<{ key: string; result: MonitoringErrorPage; error: string }>(
    { key: '', result: EMPTY_PAGE, error: '' });
  const loading = loaded.key !== requestKey;
  const result = loaded.result;
  const [actionError, setActionError] = useState('');
  const error = actionError || (loading ? '' : loaded.error);
  const [success, setSuccess] = useState('');
  const { confirmAction, confirmationDialog } = useConfirmationDialog();

  useEffect(() => {
    let active = true;
    getMonitoringErrors(session.token, page)
      .then((next) => { if (active) setLoaded({ key: requestKey, result: next, error: '' }); })
      .catch((loadError) => {
        // Como antes: o erro aparece e o resultado anterior continua na tela.
        if (active) setLoaded((current) => ({ key: requestKey, result: current.result,
          error: loadError instanceof Error ? loadError.message : 'Não foi possível carregar os erros.' }));
      });
    return () => { active = false; };
  }, [page, requestKey, session.token]);

  // Recarregar ou trocar de página limpa os avisos anteriores no próprio clique.
  const startLoad = () => { setActionError(''); setSuccess(''); };
  const loadErrors = () => { startLoad(); setRefresh((current) => current + 1); };
  const goToPage = (next: (current: number) => number) => { startLoad(); setPage(next); };

  const requestClear = () => {
    confirmAction({
      tone: 'delete',
      title: 'Limpar logs de erro?',
      message: 'Os erros exibidos atualmente serão removidos do monitoramento. Novos erros continuarão sendo registrados.',
      confirmLabel: 'Limpar logs',
      cancelLabel: 'Cancelar',
      onConfirm: async () => {
        setActionError('');
        setSuccess('');
        try {
          await clearMonitoringErrors(session.token);
          setPage(1);
          setLoaded({ key: keyFor(1), result: { ...EMPTY_PAGE }, error: '' });
          setSuccess('Logs de erro limpos com sucesso.');
        } catch (clearError) {
          setActionError(clearError instanceof Error ? clearError.message : 'Não foi possível limpar os logs.');
        }
      },
    });
  };

  return (
    <section className="monitoring-workspace" aria-labelledby="monitoring-title">
      <DataPanel className="monitoring-hero">
        <div>
          <span className="eyebrow">Logs de erro</span>
          <h2 id="monitoring-title">Monitoramento</h2>
          <p>Diagnóstico técnico dos erros registrados na clínica.</p>
        </div>
        <div className="monitoring-hero-actions">
          <button type="button" className="ghost-button danger-text" onClick={requestClear} disabled={loading || result.totalItems === 0}>
            <Trash2 size={17} />
            Limpar logs
          </button>
          <button type="button" className="secondary-action" onClick={() => void loadErrors()} disabled={loading}>
            <RefreshCw size={17} className={loading ? 'is-spinning' : ''} />
            Atualizar
          </button>
        </div>
      </DataPanel>

      {error && <AlertMessage type="error" icon={<AlertTriangle size={17} />}>{error}</AlertMessage>}
      {success && <ToastMessage type="success" icon={<CheckCircle2 size={17} />}>{success}</ToastMessage>}

      {!loading && !error && result.items.length === 0 && (
        <DataPanel className="monitoring-empty">
          <AlertTriangle size={28} />
          <strong>Nenhum erro registrado</strong>
          <span>Os novos eventos técnicos aparecerão aqui automaticamente.</span>
        </DataPanel>
      )}

      <div className="monitoring-list" aria-live="polite" aria-busy={loading}>
        {loading && <DataPanel className="monitoring-empty"><span>Carregando erros...</span></DataPanel>}
        {!loading && result.items.map((item, index) => (
          <DataPanel className="monitoring-error-card" key={`${item.timestamp}-${item.requestId ?? index}`}>
            <header>
              <span className="monitoring-error-icon"><AlertTriangle size={19} /></span>
              <div>
                <span className="eyebrow">{item.module}</span>
                <h3>{item.technicalDescription}</h3>
              </div>
              <time dateTime={item.timestamp}>{formatTimestamp(item.timestamp)}</time>
            </header>

            <dl className="monitoring-metadata">
              <div><dt>Método</dt><dd>{item.method || 'Não identificado'}</dd></div>
              <div><dt>Linha</dt><dd>{item.line ?? 'Não disponível'}</dd></div>
              <div><dt>Usuário</dt><dd>{item.userName || 'Não identificado'}</dd></div>
              <div><dt>E-mail</dt><dd>{item.userEmail || 'Não identificado'}</dd></div>
              <div><dt>Operação</dt><dd>{item.databaseOperation ?? 'Sem query'}</dd></div>
              <div><dt>Requisição</dt><dd>{item.requestId || 'Não disponível'}</dd></div>
            </dl>

            <div className="monitoring-flow">
              <strong>Sequência do fluxo de classes</strong>
              {item.classFlow.length ? (
                <ol>{item.classFlow.map((className) => <li key={className}>{className}</li>)}</ol>
              ) : <span>Fluxo não disponível.</span>}
            </div>

            {item.query && (
              <details className="monitoring-query">
                <summary><Database size={16} /> Query {item.databaseOperation ? `(${item.databaseOperation})` : ''}</summary>
                <pre>{item.query}</pre>
              </details>
            )}
          </DataPanel>
        ))}
      </div>

      {!loading && result.totalPages > 0 && (
        <div className="monitoring-pagination">
          <span>{result.totalItems} erro(s) · página {result.page} de {result.totalPages}</span>
          <div>
            <button type="button" className="secondary-action" aria-label="Página anterior" disabled={page <= 1} onClick={() => goToPage((current) => current - 1)}><ChevronLeft size={17} /></button>
            <button type="button" className="secondary-action" aria-label="Próxima página" disabled={page >= result.totalPages} onClick={() => goToPage((current) => current + 1)}><ChevronRight size={17} /></button>
          </div>
        </div>
      )}
      {confirmationDialog}
    </section>
  );
}
