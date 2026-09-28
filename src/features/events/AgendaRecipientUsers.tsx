import type { AgendaNotificationRecipientOptions } from '../../types';
import { Button, CheckboxField, SelectField, TextField } from '../../shared/components/ui';
import { formatPersonName, formatProfileName } from '../../shared/utils/formatters';
import type { AgendaRecipientSearch } from './useAgendaRecipients';

type Props = { query?: AgendaRecipientSearch; options: AgendaNotificationRecipientOptions | null;
  selectedIds: number[]; loading: boolean; error: string; onToggle: (id: number) => void };
export function AgendaRecipientUsers({ query, options, selectedIds, loading, error, onToggle }: Props) {
  const page = query?.page ?? 1;
  const total = options?.totalUsers ?? options?.users.length ?? 0;
  const pages = Math.max(1, Math.ceil(total / (options?.pageSize ?? 20)));
  return <div className="agenda-recipient-group">
    {query && <>
      <TextField label="Buscar usuário" placeholder="Buscar usuário..." type="search" maxLength={100}
        value={query.search} onValueChange={query.setSearch} />
      <SelectField label="Filtrar por perfil" value={query.profile} onChange={event => query.setProfile(event.target.value)}>
        <option value="all">Todos os perfis permitidos</option>
        <option value="medical">Médicos da clínica</option>
        <option value="administrative">Administradores e controllers</option>
      </SelectField>
      <small>Os filtros mostram somente usuários ativos permitidos para você na clínica atual.</small>
    </>}
    <p role="status">{selectedIds.length} destinatários selecionados individualmente</p>
    <div className="agenda-recipient-list" aria-label="Usuários específicos" role="group" aria-busy={loading}>
      {loading ? <p>Carregando usuários...</p> : error ? <p role="alert">Não foi possível carregar os usuários. Tente novamente.</p>
        : options?.users.length ? options.users.map(user => <div className="agenda-recipient-person" key={user.id}>
          <CheckboxField label={formatPersonName(user.nome)} checked={selectedIds.includes(user.id)}
            aria-describedby={`agenda-recipient-profile-${user.id}`} onCheckedChange={() => onToggle(user.id)} />
          <small id={`agenda-recipient-profile-${user.id}`}>{formatProfileName(user.perfilId, user.perfilNome)}</small>
        </div>) : <p>Nenhum usuário encontrado.</p>}
    </div>
    {query && <nav className="agenda-recipient-pagination" aria-label="Paginação de destinatários">
      <Button type="button" variant="ghost" disabled={loading || page <= 1} onClick={() => query.setPage(page - 1)}>Anterior</Button>
      <span>Página {page} de {pages}</span>
      <Button type="button" variant="ghost" disabled={loading || page >= pages} onClick={() => query.setPage(page + 1)}>Próxima</Button>
    </nav>}
  </div>;
}
