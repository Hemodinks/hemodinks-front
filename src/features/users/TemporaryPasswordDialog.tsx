import { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, Clock3, Copy, KeyRound, LoaderCircle, ShieldCheck, AlertTriangle, X } from 'lucide-react';
import type { User } from '../../types';
import { generateTemporaryPassword, type TemporaryPasswordResponse } from '../../services/usersService';
import { Modal } from '../../shared/components/Modal';
import { AlertMessage, Button, IconButton } from '../../shared/components/ui';
import { getErrorMessage, formatPersonName, formatProfileName } from '../../shared/utils/formatters';
import { UserAvatar } from './UserAvatar';
import './temporary-password.css';

export function TemporaryPasswordDialog({ user, token, onClose }: { user: User; token: string; onClose: () => void }) {
  const [result, setResult] = useState<TemporaryPasswordResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [expired, setExpired] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    if (!result) return;
    const timer = window.setTimeout(() => { setExpired(true); setResult(null); }, Math.max(0, Date.parse(result.expiresAtUtc) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [result]);
  const close = () => { if (!pending.current) { setResult(null); onClose(); } };
  const generate = async () => {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setError('');
    try { setResult(await generateTemporaryPassword(user.id, token)); }
    catch (e) { setError(getErrorMessage(e)); }
    finally { pending.current = false; setLoading(false); }
  };
  const copy = async () => {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.senhaTemporaria); setCopied(true); }
    catch { setError('Não foi possível copiar. Selecione a senha e copie manualmente.'); }
  };
  const title = expired ? 'Senha temporária expirada' : result ? 'Senha temporária gerada' : 'Gerar senha temporária?';
  return <Modal titleId="temporary-password-title" descriptionId="temporary-password-description" onClose={close} className="temporary-password-modal" backdropClassName="temporary-password-backdrop">
    <div className="sentry-block nr-block" data-private="true" aria-busy={loading}>
      <header className="temporary-password-header">
        <span className="temporary-password-emblem" aria-hidden="true">{expired ? <Clock3 size={26} /> : result ? <CheckCircle2 size={26} /> : <KeyRound size={26} />}</span>
        <div>
          <span className="temporary-password-eyebrow">Segurança de acesso</span>
          <h2 id="temporary-password-title">{title}</h2>
          <p id="temporary-password-description">{result ? 'Tudo pronto. Compartilhe a senha por um meio seguro.' : expired ? 'Esta credencial não pode mais ser utilizada.' : 'Ajude este usuário a recuperar o acesso à conta.'}</p>
        </div>
        <IconButton label="Fechar janela de senha temporária" tone="muted" disabled={loading} onClick={close}><X size={18} /></IconButton>
      </header>
      <div className="temporary-password-body">
        <div className="temporary-password-recipient">
          <UserAvatar name={user.nome} decorative />
          <div><span>Usuário selecionado</span><strong>{formatPersonName(user.nome)}</strong><small>{formatProfileName(user.perfilId, user.perfilNome)}{user.email ? ` · ${user.email}` : ''}</small></div>
        </div>
        {expired ? <AlertMessage type="error">A senha temporária expirou. Feche esta janela e gere uma nova senha mediante solicitação do usuário.</AlertMessage> : <>
          <div className="temporary-password-rules">
            <div><Clock3 size={20} /><span><strong>5 minutos</strong><small>Prazo para fazer login</small></span></div>
            <div><ShieldCheck size={20} /><span><strong>Uso único</strong><small>Nova senha após o acesso</small></span></div>
          </div>
          {result ? <div className="temporary-password-secret">
            <div className="temporary-password-secret-heading"><label htmlFor="temporary-password-value">Senha de acesso temporário</label><span>Exibição única</span></div>
            <input id="temporary-password-value" className="sentry-mask nr-mask" data-private="true" readOnly autoComplete="off" spellCheck={false} value={result.senhaTemporaria} onFocus={(event) => event.target.select()} />
            <div className="temporary-password-secret-footer"><span><Clock3 size={15} />Expira às {new Date(result.expiresAtUtc).toLocaleTimeString('pt-BR')}</span><Button className="temporary-password-copy" onClick={() => void copy()}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? 'Senha copiada' : 'Copiar senha'}</Button></div>
            <p role="status">{copied ? 'Copiada! Envie somente ao titular da conta.' : 'Copie antes de fechar. Esta senha não poderá ser consultada novamente.'}</p>
          </div> : <div className="temporary-password-notice"><AlertTriangle size={21} /><div><strong>As sessões anteriores serão encerradas</strong><p>A senha temporária anterior será invalidada. Após entrar, o usuário deverá cadastrar uma nova senha pessoal.</p></div></div>}
          <p className="temporary-password-guidance">{result ? 'Esta senha é válida por 5 minutos e poderá ser utilizada apenas uma vez. Após o login, o usuário deverá cadastrar uma nova senha.' : 'Confirme a geração somente mediante solicitação do titular da conta.'}</p>
        </>}
        {error && <AlertMessage type="error">{error}</AlertMessage>}
      </div>
      <footer className="temporary-password-footer">
        <span><ShieldCheck size={15} />Acesso protegido</span>
        <div><Button className="temporary-password-cancel" disabled={loading} onClick={close}>{result || expired ? 'Fechar' : 'Cancelar'}</Button>
        {!result && !expired && <Button variant="primary" className="temporary-password-confirm" disabled={loading} onClick={() => void generate()}>{loading ? <LoaderCircle size={17} className="temporary-password-spinner" /> : <KeyRound size={17} />}{loading ? 'Gerando...' : 'Confirmar geração'}</Button>}</div>
      </footer>
    </div>
  </Modal>;
}
