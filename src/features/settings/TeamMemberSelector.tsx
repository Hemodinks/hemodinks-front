import { X } from 'lucide-react';
import type { Team } from '../../types';
import { getTeamUserSelectionKey, type ClinicTeamsState } from './useClinicTeams';

type Props = { team: Team; state: ClinicTeamsState };

export function TeamMemberSelector({ team, state }: Props) {
  const matches = state.matchingUsers(team);
  const query = state.memberQueries[team.id] ?? '';
  return (
    <div className="team-member-multiselect">
      <div className="team-member-selection">
        {(state.selectedMembers[team.id] ?? []).map((selectionKey) => {
          const selectedUser = state.users.find((user) => getTeamUserSelectionKey(user) === selectionKey);
          return selectedUser ? <span key={selectionKey} className="team-member-chip">{selectedUser.nome}<button type="button" aria-label={`Remover ${selectedUser.nome}`} onClick={() => state.removeSelected(team.id, selectionKey)}><X size={14} /></button></span> : null;
        })}
        {(state.newUserDrafts[team.id] ?? []).map((draft) => <span key={draft.id} className="team-member-chip new-user-chip">Novo: {draft.nome}<button type="button" aria-label={`Remover novo funcionário ${draft.nome}`} onClick={() => state.removeDraft(team.id, draft.id)}><X size={14} /></button></span>)}
        <input
          value={query}
          onChange={(event) => { state.setMemberQuery(team.id, event.target.value); state.setOpenSelector(team.id); }}
          onFocus={() => state.setOpenSelector(team.id)}
          onKeyDown={(event) => { if (event.key === 'Escape') state.setOpenSelector(null); }}
          placeholder={(state.selectedMembers[team.id] ?? []).length === 0 ? 'Digite para buscar médicos, controllers ou equipe...' : 'Adicionar outro...'}
          role="combobox"
          aria-expanded={state.openSelector === team.id}
          aria-controls={`team-member-options-${team.id}`}
        />
      </div>
      {state.openSelector === team.id && <div id={`team-member-options-${team.id}`} className="team-member-options" role="listbox" aria-multiselectable="true">
        <div className="team-member-options-header"><span>Selecionar médicos, controllers e equipe</span><button type="button" aria-label="Fechar lista de membros" onMouseDown={(event) => event.preventDefault()} onClick={() => state.setOpenSelector(null)}><X size={17} /></button></div>
        {matches.map((user) => <button key={getTeamUserSelectionKey(user)} type="button" role="option" aria-selected="false" onMouseDown={(event) => event.preventDefault()} onClick={() => state.selectUser(team.id, user)}><strong>{user.nome}</strong><small>{user.perfilNome} · {user.email}</small><small>{user.cadastradoNaClinica ? 'Já cadastrado nesta clínica' : `Outra clínica: ${user.origemClinica} · será importado como Equipe`}</small></button>)}
        {matches.length === 0 && query.trim().length >= 2 && <button type="button" className="team-member-create-option" onMouseDown={(event) => event.preventDefault()} onClick={() => state.addNewUserDraft(team.id)}><strong>Cadastrar “{query.trim()}”</strong><small>Será criado nesta clínica com perfil Equipe</small></button>}
        {matches.length === 0 && query.trim().length < 2 && <p className="file-hint">Digite ao menos 2 caracteres para buscar ou cadastrar.</p>}
      </div>}
    </div>
  );
}
