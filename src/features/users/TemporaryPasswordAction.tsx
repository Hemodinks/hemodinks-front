import { useState } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound } from 'lucide-react';
import type { User } from '../../types';
import { IconButton } from '../../shared/components/ui';
import { formatPersonName, SUPER_ADMIN_PROFILE_ID } from '../../shared/utils/formatters';
import { TemporaryPasswordDialog } from './TemporaryPasswordDialog';

type Props = { user: User; token: string; canManage: boolean; isSuperAdmin: boolean };

export function TemporaryPasswordAction({ user, token, canManage, isSuperAdmin }: Props) {
  const [open, setOpen] = useState(false);
  if (!canManage || !user.ativo || (!isSuperAdmin && user.perfilId === SUPER_ADMIN_PROFILE_ID)) return null;
  return <>
    <IconButton label={`Gerar senha temporária para ${formatPersonName(user.nome)}`} title="Gerar senha temporária" onClick={() => setOpen(true)}>
      <KeyRound size={17} />
    </IconButton>
    {open && createPortal(<TemporaryPasswordDialog key={user.id} user={user} token={token} onClose={() => setOpen(false)} />, document.body)}
  </>;
}
