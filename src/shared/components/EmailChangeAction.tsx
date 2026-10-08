import { type FormEvent, useEffect, useRef, useState } from 'react';
import type { AuthSession } from '../../types';
import { cancelEmailChange, confirmEmailChange, requestEmailChange, type EmailChangeStarted } from '../../services/sensitiveIdentityService';
import { readSensitiveIdentityError } from '../../services/sensitiveIdentityError';
import { sessionEpoch } from '../../services/sessionEpoch';
import { decodeJwtPayload } from '../utils/jwt';
import { MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH } from '../utils/formatters';
import { Modal } from './Modal';
import { PasswordInput } from './PasswordInput';
import { AlertMessage, Button, TextField } from './ui';
import { focusFirstInvalidFormField } from '../utils/focusInvalidFormField';

type Props = { session: AuthSession; onChanged: (message: string) => void };

export function EmailChangeAction(props: Props) {
  const { session } = props;
  // A refreshed access token does not discard this action, a context change does.
  const context = `${session.user.id}:${session.user.clinicaId}:${decodeJwtPayload(session.token)?.sid}:${sessionEpoch()}`;
  return <EmailChangeForm key={context} {...props} />;
}

function EmailChangeForm({ session, onChanged }: Props) {
  const [email, setEmail] = useState('');
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState<EmailChangeStarted | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const active = useRef(true);
  const sequence = useRef(0);
  const pendingRef = useRef<EmailChangeStarted | null>(null);
  const tokenRef = useRef(session.token);
  tokenRef.current = session.token;
  const discard = (request: EmailChangeStarted | null) => {
    if (request) void cancelEmailChange(request.requestId, tokenRef.current).catch(() => { /* Local cancellation still clears the proof. */ });
  };
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; sequence.current++; pendingRef.current = null; };
  }, []);
  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => {
      // The backend decides whether a confirmation already in flight is valid.
      if (busyRef.current) return;
      sequence.current++; pendingRef.current = null; setPending(null);
      setPassword(''); setCode(''); setBusy(false);
      setError('A confirmação expirou. Confirme sua senha novamente para esta alteração. Seu email não foi alterado.');
    }, Math.max(0, Date.parse(pending.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [pending]);
  useEffect(() => {
    if (open) document.getElementById(pending ? 'email-change-code' : 'email-change-password')?.focus();
  }, [open, pending]);

  const cancel = () => {
    if (busyRef.current && pendingRef.current) return;
    sequence.current++; discard(pendingRef.current); pendingRef.current = null;
    setOpen(false); setPending(null); setPassword(''); setCode(''); setError(''); setBusy(false);
    busyRef.current = false;
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busyRef.current) return;
    const current = ++sequence.current;
    busyRef.current = true; setBusy(true); setError('');
    try {
      if (pending) {
        await confirmEmailChange(pending.requestId, code, session.token);
        if (!active.current || current !== sequence.current) return;
        pendingRef.current = null; setPending(null); setPassword(''); setCode(''); setOpen(false);
        onChanged('Email confirmado e alterado. Entre novamente com o novo email.');
      } else {
        const result = await requestEmailChange(password, email, session.token);
        if (!active.current || current !== sequence.current) {
          // Only cancel in the same mounted context, never send an old request in a new clinic.
          if (active.current) discard(result);
          return;
        }
        pendingRef.current = result; setPending(result);
      }
    } catch (failure) {
      if (!active.current || current !== sequence.current) return;
      const structured = readSensitiveIdentityError(failure);
      setError(structured?.message ?? 'Não foi possível confirmar o resultado desta ação. Confira sua conta ou entre novamente antes de tentar outra vez.');
      if (pending) { pendingRef.current = null; setPending(null); }
    } finally {
      if (active.current && current === sequence.current) { setPassword(''); setCode(''); setBusy(false); busyRef.current = false; }
    }
  };

  return <div className="stack sentry-block nr-block" data-private="true">
    <form className="stack" onInvalid={focusFirstInvalidFormField} onSubmit={event => {
      event.preventDefault();
      if (open) return;
      // Preserve a connected, focusable opener for Modal, including Enter in the email field.
      event.currentTarget.querySelector<HTMLButtonElement>('button[type="submit"]')?.focus();
      setError(''); setOpen(true);
    }}>
      <TextField label="Novo email de autenticação" type="email" value={email} onValueChange={setEmail}
        maxLength={MAX_EMAIL_LENGTH} autoComplete="off" required disabled={open} />
      <p>Seu email só será alterado após confirmar o código enviado ao novo endereço. Ao concluir, será necessário entrar novamente.</p>
      <Button type="submit" variant="primary" aria-disabled={open}>Continuar alteração de email</Button>
    </form>
    {open && <Modal titleId="email-change-title" descriptionId="email-change-description" onClose={cancel}>
      <div className="stack sentry-block nr-block" data-private="true">
        <h2 id="email-change-title">{pending ? 'Confirmar novo email' : 'Confirmar identidade'}</h2>
        <p id="email-change-description">{pending
          ? 'Cole o código recebido no novo endereço. O email ainda não foi alterado.'
          : 'Informe a senha atual da sua conta individual para continuar esta alteração de email.'}</p>
        <form className="stack" aria-busy={busy} onSubmit={submit} onInvalid={focusFirstInvalidFormField}>
          {pending ? <PasswordInput id="email-change-code" label="Código de confirmação" value={code} onChange={setCode}
            autoComplete="off" maxLength={64} required errorId={error ? 'email-change-error' : undefined} />
            : <PasswordInput id="email-change-password" label="Senha atual da conta individual" value={password} onChange={setPassword}
              autoComplete="current-password" maxLength={MAX_PASSWORD_LENGTH} required errorId={error ? 'email-change-error' : undefined} />}
          {error && <div id="email-change-error"><AlertMessage type="error">{error}</AlertMessage></div>}
          <div className="button-row">
            <Button onClick={cancel} disabled={busy && Boolean(pending)}>Cancelar alteração de email</Button>
            <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Aguarde...' : pending ? 'Confirmar email' : 'Enviar confirmação'}</Button>
          </div>
        </form>
      </div>
    </Modal>}
  </div>;
}
