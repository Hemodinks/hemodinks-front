import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthSession, Team, TeamEligibleUser, TeamIdentificationMode } from '../../types';
import { addPlatformClinicTeamMember, listPlatformClinicTeams, listPlatformClinicTeamUsers, removePlatformClinicTeamMember, resetPlatformClinicTeamOperatorPin, updatePlatformClinicTeam } from '../../services';
import { formatPhoneInput, getErrorMessage, getLocalBrazilPhoneDigits, isValidBrazilMobilePhone, normalizePhoneForPayload } from '../../shared/utils/formatters';
import type { NewTeamUserDraft } from './teamAdminTypes';

type Options = { session: AuthSession; clinicId: number };

export const getTeamUserSelectionKey = (user: TeamEligibleUser) => user.usuarioGlobalId ? `global:${user.usuarioGlobalId}` : `local:${user.userIdNaClinica}`;

export function useClinicTeams({ session, clinicId }: Options) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<TeamEligibleUser[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Record<number, string[]>>({});
  const [memberQueries, setMemberQueries] = useState<Record<number, string>>({});
  const [newUserDrafts, setNewUserDrafts] = useState<Record<number, NewTeamUserDraft[]>>({});
  const [openSelector, setOpenSelector] = useState<number | null>(null);
  const [generatePins, setGeneratePins] = useState<Record<number, boolean>>({});
  const [temporaryPins, setTemporaryPins] = useState<Record<number, string>>({});
  const [visiblePins, setVisiblePins] = useState<Record<number, boolean>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const loadRequestId = useRef(0);
  const actionsInFlight = useRef(new Set<string>());

  const load = useCallback(async () => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    setError('');
    try {
      const [teamItems, userResult] = await Promise.all([listPlatformClinicTeams(clinicId, session.token), listPlatformClinicTeamUsers(clinicId, session.token)]);
      if (requestId === loadRequestId.current) { setTeams(teamItems); setUsers(userResult); }
    } catch (requestError) {
      if (requestId === loadRequestId.current) setError(getErrorMessage(requestError));
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  }, [clinicId, session.token]);

  useEffect(() => {
    void load();
    return () => { loadRequestId.current += 1; };
  }, [load]);

  const matchingUsers = (team: Team) => {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
    const query = normalize((memberQueries[team.id] ?? '').trim());
    return users
      .filter((user) => !team.membros.some((member) => member.userId === user.userIdNaClinica))
      .filter((user) => !(selectedMembers[team.id] ?? []).includes(getTeamUserSelectionKey(user)))
      .filter((user) => !query || normalize(`${user.nome} ${user.email} ${user.perfilNome} ${user.origemClinica}`).includes(query));
  };

  const associate = async (team: Team) => {
    const actionKey = `associate:${team.id}`;
    if (actionsInFlight.current.has(actionKey)) return;
    const selectedKeys = selectedMembers[team.id] ?? [];
    const selectedUsers = users.filter((user) => selectedKeys.includes(getTeamUserSelectionKey(user)));
    const globalUserIds = selectedUsers.flatMap((user) => user.usuarioGlobalId ? [user.usuarioGlobalId] : []);
    const localUserIds = selectedUsers.flatMap((user) => !user.usuarioGlobalId && user.userIdNaClinica ? [user.userIdNaClinica] : []);
    const drafts = newUserDrafts[team.id] ?? [];
    if (selectedUsers.length === 0 && drafts.length === 0) return;
    if (drafts.some((draft) => !draft.nome.trim())) return setError('Informe o nome de cada novo funcionário.');
    if (drafts.some((draft) => getLocalBrazilPhoneDigits(draft.telefone) && !isValidBrazilMobilePhone(draft.telefone))) return setError('Informe um telefone celular válido ou deixe o campo vazio.');
    actionsInFlight.current.add(actionKey);
    try {
      const result = await addPlatformClinicTeamMember(
        clinicId, team.id, globalUserIds, localUserIds,
        drafts.map((draft) => ({ nome: draft.nome.trim(), telefone: getLocalBrazilPhoneDigits(draft.telefone) ? normalizePhoneForPayload(draft.telefone) : null })),
        team.modoIdentificacao === 'Pin' && (generatePins[team.id] ?? true), session.token,
      );
      setSelectedMembers((current) => ({ ...current, [team.id]: [] }));
      setMemberQueries((current) => ({ ...current, [team.id]: '' }));
      setNewUserDrafts((current) => ({ ...current, [team.id]: [] }));
      setOpenSelector(null);
      const generatedPins = result.associados.filter((item) => item.pinTemporario);
      setTemporaryPins((current) => ({ ...current, ...Object.fromEntries(generatedPins.map((item) => [item.operadorId, item.pinTemporario!])) }));
      setVisiblePins((current) => ({ ...current, ...Object.fromEntries(generatedPins.map((item) => [item.operadorId, false])) }));
      const importedCount = result.associados.filter((item) => item.importado).length;
      setMessage([
        `${result.associados.length} funcionário(s) associado(s).`,
        importedCount > 0 ? `${importedCount} criado(s) ou importado(s) para a clínica com perfil Equipe.` : '',
        generatedPins.length > 0 ? 'Use o botão de olho na linha de cada funcionário para consultar o PIN temporário.' : '',
      ].filter(Boolean).join(' '));
      await load();
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { actionsInFlight.current.delete(actionKey); }
  };

  const resetPin = async (team: Team, operatorId: number) => {
    const actionKey = `reset-pin:${operatorId}`;
    if (actionsInFlight.current.has(actionKey)) return;
    actionsInFlight.current.add(actionKey);
    try {
      const result = await resetPlatformClinicTeamOperatorPin(clinicId, team.id, operatorId, session.token);
      setTemporaryPins((current) => ({ ...current, [operatorId]: result.pinTemporario }));
      setVisiblePins((current) => ({ ...current, [operatorId]: false }));
      setMessage('Novo PIN temporário gerado. Use o botão de olho na linha do funcionário para consultá-lo.');
      await load();
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { actionsInFlight.current.delete(actionKey); }
  };

  const changeMode = async (team: Team, mode: TeamIdentificationMode) => {
    const actionKey = `mode:${team.id}`;
    if (actionsInFlight.current.has(actionKey)) return;
    actionsInFlight.current.add(actionKey);
    setError('');
    try {
      await updatePlatformClinicTeam(clinicId, team.id, { modoIdentificacao: mode }, session.token);
      if (mode !== 'Pin') {
        const operatorIds = new Set(team.membros.map((member) => member.operadorId));
        setTemporaryPins((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !operatorIds.has(Number(id)))));
        setVisiblePins((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !operatorIds.has(Number(id)))));
      }
      await load();
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { actionsInFlight.current.delete(actionKey); }
  };

  const removeMember = async (team: Team, userId: number) => {
    const actionKey = `remove:${team.id}:${userId}`;
    if (actionsInFlight.current.has(actionKey)) return;
    actionsInFlight.current.add(actionKey);
    setError('');
    try {
      await removePlatformClinicTeamMember(clinicId, team.id, userId, session.token);
      const operatorId = team.membros.find((member) => member.userId === userId)?.operadorId;
      if (operatorId) {
        setTemporaryPins((current) => Object.fromEntries(Object.entries(current).filter(([id]) => Number(id) !== operatorId)));
        setVisiblePins((current) => Object.fromEntries(Object.entries(current).filter(([id]) => Number(id) !== operatorId)));
      }
      await load();
    } catch (requestError) { setError(getErrorMessage(requestError)); }
    finally { actionsInFlight.current.delete(actionKey); }
  };

  const addNewUserDraft = (teamId: number) => {
    const nome = (memberQueries[teamId] ?? '').trim();
    if (nome.length < 2) return;
    const draft = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, nome, telefone: '' };
    setNewUserDrafts((current) => ({ ...current, [teamId]: [...(current[teamId] ?? []), draft] }));
    setMemberQueries((current) => ({ ...current, [teamId]: '' }));
    setOpenSelector(null);
  };

  return {
    teams, users, selectedMembers, memberQueries, newUserDrafts, openSelector, generatePins, temporaryPins, visiblePins, error, message, loading,
    load, matchingUsers, associate, resetPin, changeMode, removeMember, addNewUserDraft, setOpenSelector,
    setMemberQuery: (teamId: number, value: string) => setMemberQueries((current) => ({ ...current, [teamId]: value })),
    selectUser: (teamId: number, user: TeamEligibleUser) => { setSelectedMembers((current) => ({ ...current, [teamId]: [...(current[teamId] ?? []), getTeamUserSelectionKey(user)] })); setMemberQueries((current) => ({ ...current, [teamId]: '' })); },
    removeSelected: (teamId: number, key: string) => setSelectedMembers((current) => ({ ...current, [teamId]: (current[teamId] ?? []).filter((item) => item !== key) })),
    removeDraft: (teamId: number, id: string) => setNewUserDrafts((current) => ({ ...current, [teamId]: (current[teamId] ?? []).filter((item) => item.id !== id) })),
    updateDraft: (teamId: number, id: string, field: 'nome' | 'telefone', value: string) => setNewUserDrafts((current) => ({ ...current, [teamId]: (current[teamId] ?? []).map((item) => item.id === id ? { ...item, [field]: field === 'telefone' ? formatPhoneInput(value) : value } : item) })),
    setGeneratePin: (teamId: number, value: boolean) => setGeneratePins((current) => ({ ...current, [teamId]: value })),
    togglePinVisibility: (operatorId: number) => setVisiblePins((current) => ({ ...current, [operatorId]: !current[operatorId] })),
  };
}

export type ClinicTeamsState = ReturnType<typeof useClinicTeams>;
