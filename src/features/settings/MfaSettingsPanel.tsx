import { type FormEvent, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import type { AuthSession } from '../../types';
import { activateMfa, beginMfaSetup, deactivateMfa, getMfaStatus, type MfaSetup } from '../../services/mfaService';
import { getErrorMessage } from '../../shared/utils/formatters';
import { PasswordInput } from '../../shared/components/PasswordInput';
import { AlertMessage, Button, DataPanel, TextField } from '../../shared/components/ui';
import { focusFirstInvalidFormField } from '../../shared/utils/focusInvalidFormField';
import { queryKeys } from '../../shared/queryKeys';
import { formatMfaCode, isCompleteMfaCode, MFA_CODE_MAX_LENGTH } from '../../shared/utils/mfaCode';
import { MfaQrCode } from './MfaQrCode';
import {
  clearPendingMfaRecoveryCodes, peekPendingMfaRecoveryCodes, setPendingMfaRecoveryCodes, type IdentityChangedHandler,
} from '../../shared/identityChange';

type Stage = 'idle' | 'setup' | 'disable';

export const MFA_ENABLED_RELOGIN_MESSAGE =
  'Verificação em duas etapas ativada. Entre novamente com a senha e o código do aplicativo.';

const onlyDigits = (value: string) => value.replace(/\D/g, '').slice(0, 6);

type Props = { session: AuthSession; onIdentityChanged: IdentityChangedHandler };

// #150: opcao de ativar/desativar a verificacao em duas etapas (Administrador e SuperAdministrador).
// Segredo e codigos de recuperacao ficam so em memoria e somem ao sair desta tela ou da sessao.
export function MfaSettingsPanel({ session, onIdentityChanged }: Props) {
  const statusQuery = useQuery({
    queryKey: queryKeys.mfaStatus(session.token),
    queryFn: () => getMfaStatus(session.token),
    retry: false,
  });
  const [stage, setStage] = useState<Stage>('idle');
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  // Ativar renova a sessao e remonta esta tela: os codigos voltam do registro em memoria.
  const [codes, setCodes] = useState<string[]>(() => peekPendingMfaRecoveryCodes(session.user.id));
  const [relogin, setRelogin] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const status = statusQuery.data;

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await action();
    } catch (actionError) {
      setError(getErrorMessage(actionError));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStage('idle');
    setSetup(null);
    setCode('');
    setPassword('');
  };

  const start = () => run(async () => {
    setSetup(await beginMfaSetup(session.token));
    setCode('');
    setPassword('');
    setStage('setup');
  });

  const activate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(async () => {
      const result = await activateMfa(password, code, session.token);
      reset();
      setPendingMfaRecoveryCodes(session.user.id, result.codigosRecuperacao);
      setCodes(result.codigosRecuperacao);
      if (result.sessionRenewed)
        onIdentityChanged('Verificação em duas etapas ativada.', { sessionRenewed: true, email: session.user.email });
      else setRelogin(true);
    });
  };

  const confirmCodesSaved = () => {
    clearPendingMfaRecoveryCodes();
    setCodes([]);
    if (relogin) onIdentityChanged(MFA_ENABLED_RELOGIN_MESSAGE);
    else void statusQuery.refetch();
  };

  const deactivate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(async () => {
      await deactivateMfa(password, code.trim(), session.token);
      reset();
      setInfo('Verificação em duas etapas desativada.');
      await statusQuery.refetch();
    });
  };

  if (codes.length > 0) {
    return (
      <DataPanel className="system-settings-panel">
        <MfaHeading />
        <AlertMessage type="success">Verificação em duas etapas ativada.</AlertMessage>
        <p>Guarde estes códigos de recuperação em local seguro. Cada um funciona uma única vez, e eles não serão mostrados de novo.</p>
        <ul className="nr-block" data-private="true">{codes.map(item => <li key={item}><code>{item}</code></li>)}</ul>
        <Button type="button" variant="primary" onClick={confirmCodesSaved}>Já guardei os códigos</Button>
      </DataPanel>
    );
  }

  if (!status?.elegivel) return null;

  return (
    <DataPanel className="system-settings-panel">
      <MfaHeading />
      <p className="helper-text">
        {status.habilitado
          ? `Ativa. Ao entrar, o sistema pede o código do aplicativo autenticador. Códigos de recuperação restantes: ${status.codigosRecuperacaoRestantes}.`
          : 'Desativada. Ative para pedir, além da senha, um código do aplicativo autenticador (Google Authenticator, Microsoft Authenticator e similares).'}
      </p>
      {error && <AlertMessage type="error">{error}</AlertMessage>}
      {info && <AlertMessage type="success">{info}</AlertMessage>}

      {stage === 'idle' && (status.habilitado
        ? <Button type="button" variant="danger-ghost" disabled={busy} onClick={() => { setCode(''); setPassword(''); setStage('disable'); }}>Desativar</Button>
        : <Button type="button" variant="primary" disabled={busy} onClick={() => void start()}>Ativar</Button>)}

      {stage === 'setup' && setup && (
        <form className="stack" onSubmit={activate} onInvalid={focusFirstInvalidFormField}>
          <p>1. No aplicativo autenticador, escaneie o QR code. Sem câmera, digite a chave abaixo ou toque no link pelo celular.</p>
          <MfaQrCode value={setup.otpAuthUri} />
          <code className="nr-block" data-private="true">{setup.segredo.match(/.{1,4}/g)?.join(' ')}</code>
          <a href={setup.otpAuthUri} className="nr-block" data-private="true">Abrir no aplicativo autenticador</a>
          <TextField label="2. Código de 6 dígitos gerado pelo aplicativo" value={code} inputMode="numeric"
            pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="one-time-code" required
            onValueChange={value => setCode(onlyDigits(value))} />
          <PasswordInput id="mfa-enable-password" label="3. Senha atual" value={password} onChange={setPassword}
            autoComplete="current-password" maxLength={128} required />
          <p className="helper-text">Ao ativar, as outras sessões abertas desta conta são encerradas.</p>
          <div className="button-row">
            <Button type="button" disabled={busy} onClick={reset}>Cancelar</Button>
            <Button type="submit" variant="primary" disabled={busy || code.length !== 6 || !password}>Confirmar e ativar</Button>
          </div>
        </form>
      )}

      {stage === 'disable' && (
        <form className="stack" onSubmit={deactivate} onInvalid={focusFirstInvalidFormField}>
          <PasswordInput id="mfa-disable-password" label="Senha atual" value={password} onChange={setPassword}
            autoComplete="current-password" maxLength={128} required />
          <TextField label="Código do aplicativo ou de recuperação" value={code} minLength={6} maxLength={MFA_CODE_MAX_LENGTH}
            autoComplete="one-time-code" required onValueChange={value => setCode(formatMfaCode(value))} />
          <div className="button-row">
            <Button type="button" disabled={busy} onClick={reset}>Cancelar</Button>
            <Button type="submit" variant="danger-ghost" disabled={busy || !password || !isCompleteMfaCode(code)}>Desativar</Button>
          </div>
        </form>
      )}
    </DataPanel>
  );
}

function MfaHeading() {
  return (
    <div className="settings-section-heading">
      <span className="settings-section-icon" aria-hidden="true"><ShieldCheck size={19} /></span>
      <div>
        <span className="eyebrow">Seguranca</span>
        <h3>Verificação em duas etapas</h3>
      </div>
    </div>
  );
}
