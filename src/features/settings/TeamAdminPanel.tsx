import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, RefreshCw, Trash2, Users, X } from "lucide-react";
import {
  addPlatformClinicTeamMember,
  listPlatformClinicTeams,
  listPlatformClinicTeamUsers,
  removePlatformClinicTeamMember,
  resetPlatformClinicTeamOperatorPin,
  updatePlatformClinicTeam,
} from "../../services";
import type {
  AuthSession,
  Team,
  TeamIdentificationMode,
  TeamEligibleUser,
} from "../../types";
import {
  formatPhoneInput,
  getErrorMessage,
  getLocalBrazilPhoneDigits,
  isValidBrazilMobilePhone,
  normalizePhoneForPayload,
} from "../../shared/utils/formatters";
import {
  getTeamIdentificationDescription,
  TEAM_IDENTIFICATION_OPTIONS,
} from "../../shared/utils/teamIdentification";
import { AlertMessage, Button, ToastMessage } from "../../shared/components/ui";

type ClinicTeamsPanelProps = {
  session: AuthSession;
  clinicId: number;
  clinicName: string;
};

type NewTeamUserDraft = {
  id: string;
  nome: string;
  telefone: string;
};

export function ClinicTeamsPanel({ session, clinicId, clinicName }: ClinicTeamsPanelProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<TeamEligibleUser[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<
    Record<number, string[]>
  >({});
  const [memberQueries, setMemberQueries] = useState<Record<number, string>>({});
  const [newUserDrafts, setNewUserDrafts] = useState<Record<number, NewTeamUserDraft[]>>({});
  const [openSelector, setOpenSelector] = useState<number | null>(null);
  const [generatePins, setGeneratePins] = useState<Record<number, boolean>>({});
  const [temporaryPins, setTemporaryPins] = useState<Record<number, string>>({});
  const [visiblePins, setVisiblePins] = useState<Record<number, boolean>>({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [teamItems, userResult] = await Promise.all([
        listPlatformClinicTeams(clinicId, session.token),
        listPlatformClinicTeamUsers(clinicId, session.token),
      ]);
      setTeams(teamItems);
      setUsers(userResult);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [clinicId, session.token]);

  useEffect(() => {
    void load();
  }, [load]);

  const associate = async (team: Team) => {
    const selectedKeys = selectedMembers[team.id] ?? [];
    const selectedUsers = users.filter((user) => selectedKeys.includes(getUserSelectionKey(user)));
    const globalUserIds = selectedUsers.flatMap((user) => user.usuarioGlobalId ? [user.usuarioGlobalId] : []);
    const localUserIds = selectedUsers.flatMap((user) => !user.usuarioGlobalId && user.userIdNaClinica ? [user.userIdNaClinica] : []);
    const drafts = newUserDrafts[team.id] ?? [];
    if (selectedUsers.length === 0 && drafts.length === 0) return;
    if (drafts.some((draft) => !draft.nome.trim())) {
      setError("Informe o nome de cada novo funcionário.");
      return;
    }
    if (drafts.some((draft) => getLocalBrazilPhoneDigits(draft.telefone) && !isValidBrazilMobilePhone(draft.telefone))) {
      setError("Informe um telefone celular válido ou deixe o campo vazio.");
      return;
    }
    try {
      const shouldGeneratePin =
        team.modoIdentificacao === "Pin" &&
        (generatePins[team.id] ?? true);
      const result = await addPlatformClinicTeamMember(
        clinicId,
        team.id,
        globalUserIds,
        localUserIds,
        drafts.map((draft) => ({ nome: draft.nome.trim(), telefone: getLocalBrazilPhoneDigits(draft.telefone) ? normalizePhoneForPayload(draft.telefone) : null })),
        shouldGeneratePin,
        session.token,
      );
      setSelectedMembers((current) => ({ ...current, [team.id]: [] }));
      setMemberQueries((current) => ({ ...current, [team.id]: "" }));
      setNewUserDrafts((current) => ({ ...current, [team.id]: [] }));
      setOpenSelector(null);
      const generatedPins = result.associados.filter((item) => item.pinTemporario);
      setTemporaryPins((current) => ({
        ...current,
        ...Object.fromEntries(generatedPins.map((item) => [item.operadorId, item.pinTemporario!])),
      }));
      setVisiblePins((current) => ({
        ...current,
        ...Object.fromEntries(generatedPins.map((item) => [item.operadorId, false])),
      }));
      const importedCount = result.associados.filter((item) => item.importado).length;
      const details = [
        `${result.associados.length} funcionário(s) associado(s).`,
        importedCount > 0 ? `${importedCount} criado(s) ou importado(s) para a clínica com perfil Equipe.` : "",
        generatedPins.length > 0 ? "Use o botão de olho na linha de cada funcionário para consultar o PIN temporário." : "",
      ].filter(Boolean);
      setMessage(details.join(" "));
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const getUserSelectionKey = (user: TeamEligibleUser) =>
    user.usuarioGlobalId ? `global:${user.usuarioGlobalId}` : `local:${user.userIdNaClinica}`;

  const resetPin = async (team: Team, operatorId: number) => {
    try {
      const result = await resetPlatformClinicTeamOperatorPin(
        clinicId,
        team.id,
        operatorId,
        session.token,
      );
      setTemporaryPins((current) => ({ ...current, [operatorId]: result.pinTemporario }));
      setVisiblePins((current) => ({ ...current, [operatorId]: false }));
      setMessage(
        "Novo PIN temporário gerado. Use o botão de olho na linha do funcionário para consultá-lo.",
      );
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const changeMode = async (
    team: Team,
    modoIdentificacao: TeamIdentificationMode,
  ) => {
    setError("");
    try {
      await updatePlatformClinicTeam(
        clinicId,
        team.id,
        { modoIdentificacao },
        session.token,
      );
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const removeMember = async (team: Team, userId: number) => {
    setError("");
    try {
      await removePlatformClinicTeamMember(
        clinicId,
        team.id,
        userId,
        session.token,
      );
      const removedOperator = team.membros.find((member) => member.userId === userId)?.operadorId;
      if (removedOperator) {
        setTemporaryPins((current) => {
          const next = { ...current };
          delete next[removedOperator];
          return next;
        });
        setVisiblePins((current) => {
          const next = { ...current };
          delete next[removedOperator];
          return next;
        });
      }
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const matchingUsers = (team: Team) => {
    const query = (memberQueries[team.id] ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
    return users
      .filter((user) => !team.membros.some((member) => member.userId === user.userIdNaClinica))
      .filter((user) => !(selectedMembers[team.id] ?? []).includes(getUserSelectionKey(user)))
      .filter((user) => {
        const searchable = `${user.nome} ${user.email} ${user.perfilNome} ${user.origemClinica}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
        return !query || searchable.includes(query);
      });
  };

  const addNewUserDraft = (teamId: number) => {
    const nome = (memberQueries[teamId] ?? "").trim();
    if (nome.length < 2) return;
    const draft: NewTeamUserDraft = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      nome,
      telefone: "",
    };
    setNewUserDrafts((current) => ({ ...current, [teamId]: [...(current[teamId] ?? []), draft] }));
    setMemberQueries((current) => ({ ...current, [teamId]: "" }));
    setOpenSelector(null);
  };

  return (
    <section className="clinic-teams-panel">
      <div className="settings-section-heading">
        <span className="settings-section-icon">
          <Users size={19} />
        </span>
        <div>
          <span className="eyebrow">Acesso coletivo</span>
          <h3>Equipes de {clinicName}</h3>
        </div>
      </div>
      {error && <AlertMessage type="error">{error}</AlertMessage>}
      {message && <ToastMessage type="success">{message}</ToastMessage>}
      <div className="team-list">
        {!loading && teams.length === 0 && (
          <p className="file-hint">
            Nenhuma equipe cadastrada. Use “Adicionar equipe” acima e salve a
            clínica.
          </p>
        )}
        {teams.map((team) => (
          <section key={team.id} className="session-card">
            <div className="data-header">
              <div className="clinic-team-identity">
                <strong>{team.nome}</strong>
                <small>{team.email}</small>
              </div>
              <label>
                Modo
                <select
                  value={team.modoIdentificacao}
                  onChange={(event) =>
                    void changeMode(
                      team,
                      event.target.value as TeamIdentificationMode,
                    )
                  }
                >
                  {TEAM_IDENTIFICATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <small className="file-hint">
              {getTeamIdentificationDescription(team.modoIdentificacao)}
            </small>
            <div className="team-association-controls">
              <div className="team-member-multiselect">
                <div className="team-member-selection">
                  {(selectedMembers[team.id] ?? []).map((selectionKey) => {
                    const selectedUser = users.find((user) => getUserSelectionKey(user) === selectionKey);
                    if (!selectedUser) return null;
                    return <span key={selectionKey} className="team-member-chip">
                      {selectedUser.nome}
                      <button type="button" aria-label={`Remover ${selectedUser.nome}`} onClick={() => setSelectedMembers((current) => ({ ...current, [team.id]: (current[team.id] ?? []).filter((key) => key !== selectionKey) }))}><X size={14} /></button>
                    </span>;
                  })}
                  {(newUserDrafts[team.id] ?? []).map((draft) => <span key={draft.id} className="team-member-chip new-user-chip">
                    Novo: {draft.nome}
                    <button type="button" aria-label={`Remover novo funcionário ${draft.nome}`} onClick={() => setNewUserDrafts((current) => ({ ...current, [team.id]: (current[team.id] ?? []).filter((item) => item.id !== draft.id) }))}><X size={14} /></button>
                  </span>)}
                  <input
                    value={memberQueries[team.id] ?? ""}
                    onChange={(event) => { setMemberQueries((current) => ({ ...current, [team.id]: event.target.value })); setOpenSelector(team.id); }}
                    onFocus={() => setOpenSelector(team.id)}
                    onKeyDown={(event) => { if (event.key === "Escape") setOpenSelector(null); }}
                    placeholder={(selectedMembers[team.id] ?? []).length === 0 ? "Digite para buscar médicos, controllers ou equipe..." : "Adicionar outro..."}
                    role="combobox"
                    aria-expanded={openSelector === team.id}
                    aria-controls={`team-member-options-${team.id}`}
                  />
                </div>
                {openSelector === team.id && <div id={`team-member-options-${team.id}`} className="team-member-options" role="listbox" aria-multiselectable="true">
                  <div className="team-member-options-header">
                    <span>Selecionar médicos, controllers e equipe</span>
                    <button type="button" aria-label="Fechar lista de membros" onMouseDown={(event) => event.preventDefault()} onClick={() => setOpenSelector(null)}><X size={17} /></button>
                  </div>
                  {matchingUsers(team).map((user) => <button
                      key={getUserSelectionKey(user)}
                      type="button"
                      role="option"
                      aria-selected="false"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => { setSelectedMembers((current) => ({ ...current, [team.id]: [...(current[team.id] ?? []), getUserSelectionKey(user)] })); setMemberQueries((current) => ({ ...current, [team.id]: "" })); }}
                    >
                      <strong>{user.nome}</strong>
                      <small>{user.perfilNome} · {user.email}</small>
                      <small>{user.cadastradoNaClinica ? "Já cadastrado nesta clínica" : `Outra clínica: ${user.origemClinica} · será importado como Equipe`}</small>
                    </button>)}
                  {matchingUsers(team).length === 0 && (memberQueries[team.id] ?? "").trim().length >= 2 && <button type="button" className="team-member-create-option" onMouseDown={(event) => event.preventDefault()} onClick={() => addNewUserDraft(team.id)}>
                    <strong>Cadastrar “{(memberQueries[team.id] ?? "").trim()}”</strong>
                    <small>Será criado nesta clínica com perfil Equipe</small>
                  </button>}
                  {matchingUsers(team).length === 0 && (memberQueries[team.id] ?? "").trim().length < 2 && <p className="file-hint">Digite ao menos 2 caracteres para buscar ou cadastrar.</p>}
                </div>}
              </div>
              {(newUserDrafts[team.id] ?? []).length > 0 && <div className="new-team-users-editor">
                <small className="file-hint">Novos membros da equipe usarão o e-mail coletivo <strong>{team.email}</strong> e a senha da equipe.</small>
                {(newUserDrafts[team.id] ?? []).map((draft) => <div key={draft.id} className="new-team-user-row">
                  <input aria-label={`Nome de ${draft.nome}`} value={draft.nome} onChange={(event) => setNewUserDrafts((current) => ({ ...current, [team.id]: (current[team.id] ?? []).map((item) => item.id === draft.id ? { ...item, nome: event.target.value } : item) }))} placeholder="Nome completo" />
                  <input aria-label={`E-mail coletivo de ${draft.nome}`} type="email" value={team.email} readOnly title="Este funcionário usará o e-mail coletivo da equipe" />
                  <input aria-label={`Telefone de ${draft.nome}`} type="tel" value={draft.telefone} onChange={(event) => setNewUserDrafts((current) => ({ ...current, [team.id]: (current[team.id] ?? []).map((item) => item.id === draft.id ? { ...item, telefone: formatPhoneInput(event.target.value) } : item) }))} placeholder="Telefone opcional" />
                  <button type="button" aria-label={`Excluir ${draft.nome}`} onClick={() => setNewUserDrafts((current) => ({ ...current, [team.id]: (current[team.id] ?? []).filter((item) => item.id !== draft.id) }))}><Trash2 size={16} /></button>
                </div>)}
              </div>}
              <div className="team-association-actions">
                <label className="team-pin-option">
                  <input
                    type="checkbox"
                    checked={
                      team.modoIdentificacao === "Pin" &&
                      (generatePins[team.id] ?? true)
                    }
                    onChange={(event) =>
                      setGeneratePins((current) => ({
                        ...current,
                        [team.id]: event.target.checked,
                      }))
                    }
                    disabled={team.modoIdentificacao !== "Pin"}
                  />
                  Gerar PIN individual
                </label>
                <Button onClick={() => void associate(team)} disabled={((selectedMembers[team.id] ?? []).length === 0 && (newUserDrafts[team.id] ?? []).length === 0) || loading}>Associar selecionados</Button>
                <Button onClick={() => void load()}>
                  <RefreshCw size={16} />
                  Atualizar
                </Button>
              </div>
            </div>
            <ul className="team-member-list">
              {team.membros.map((member) => (
                <li key={member.userId}>
                  <span>
                    <strong>{member.nome}</strong>
                    <small>{member.email}</small>
                  </span>
                  <div className="button-row">
                    {team.modoIdentificacao === "Pin" && (
                      <>
                        <div className="team-pin-display">
                          <span aria-live="polite">
                            {temporaryPins[member.operadorId]
                              ? visiblePins[member.operadorId]
                                ? temporaryPins[member.operadorId]
                                : "••••••"
                              : member.possuiPin ? "••••••" : "Sem PIN"}
                          </span>
                          <button
                            type="button"
                            disabled={!temporaryPins[member.operadorId]}
                            aria-label={visiblePins[member.operadorId] ? `Ocultar PIN de ${member.nome}` : `Exibir PIN de ${member.nome}`}
                            title={temporaryPins[member.operadorId] ? "Exibir ou ocultar PIN temporário" : "Redefina o PIN para poder visualizá-lo"}
                            onClick={() => setVisiblePins((current) => ({ ...current, [member.operadorId]: !current[member.operadorId] }))}
                          >
                            {visiblePins[member.operadorId] ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        </div>
                        <Button
                          onClick={() => void resetPin(team, member.operadorId)}
                        >
                          <KeyRound size={15} />
                          Novo PIN
                        </Button>
                      </>
                    )}
                    <Button
                      variant="danger-ghost"
                      onClick={() => void removeMember(team, member.userId)}
                    >
                      <Trash2 size={15} />
                      Desassociar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}
