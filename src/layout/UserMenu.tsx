import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import type { AuthSession } from '../types';
import { UserAvatar } from '../features/users/UserAvatar';
import { formatPersonName, formatProfileName } from '../shared/utils/formatters';

export function UserMenu({ session, companyName, onLogout }: { session: AuthSession; companyName: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  return <div className="user-menu" ref={root} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
  }} onKeyDown={(event) => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
  }}>
    <button type="button" ref={trigger} className="user-menu-trigger" aria-label="Menu do usuário" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
      <UserAvatar userId={session.user.id} name={session.user.nome} photo={session.user.fotoPerfil} authToken={session.token} size="sm" />
      <span>{formatPersonName(session.user.nome)}</span><ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && <div id={id} className="user-menu-panel" aria-label="Dados da sessão">
      <strong>{formatPersonName(session.user.nome)}</strong>
      <span>{formatProfileName(session.user.perfilId, session.user.perfilNome)}</span>
      <span>{companyName}</span><span>{session.user.email}</span>
      <button type="button" onClick={onLogout}><LogOut size={18} aria-hidden="true" />Sair</button>
    </div>}
  </div>;
}
