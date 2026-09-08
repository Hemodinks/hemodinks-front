import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthSession, ClinicPayload, PlatformClinic, SelectClinicResponse } from '../../types';
import { createPlatformClinic, deactivatePlatformClinic, listPlatformClinics, selectSessionClinic, updatePlatformClinic } from '../../services';
import { readProfilePhoto } from '../../shared/utils/files';
import {
  ALLOWED_PROFILE_PHOTO_TYPES,
  API_ASSET_BASE_URL,
  getErrorMessage,
  getLocalBrazilPhoneDigits,
  isValidBrazilMobilePhone,
  MAX_PROFILE_PHOTO_BYTES,
  normalizePhoneForPayload,
} from '../../shared/utils/formatters';
import { clinicToForm, EMPTY_CLINIC_FORM, type ClinicFormData, type ClinicSortField } from './clinicFormModel';
import { isValidCnpj, normalizeCnpj } from '../../shared/utils/cnpj';
import { queryClient } from '../../queryClient';
import { queryKeys } from '../../shared/queryKeys';

type Options = { session: AuthSession; onClinicSelected: (result: SelectClinicResponse) => void };

export function useClinicsPage({ session, onClinicSelected }: Options) {
  const [clinics, setClinics] = useState<PlatformClinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<PlatformClinic | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ClinicFormData>(EMPTY_CLINIC_FORM);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ClinicSortField>('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const loadRequestId = useRef(0);
  const photoRequestId = useRef(0);
  const saveInFlight = useRef(false);

  const sortedClinics = useMemo(() => {
    const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
    const direction = sortDirection === 'asc' ? 1 : -1;
    return [...clinics].sort((left, right) => {
      let comparison = 0;
      if (sortBy === 'plano') comparison = collator.compare(left.plano, right.plano);
      else if (sortBy === 'assinatura') comparison = collator.compare(left.assinaturaStatus, right.assinaturaStatus);
      else if (sortBy === 'usuarios') comparison = (left.usuarios ?? -1) - (right.usuarios ?? -1);
      else if (sortBy === 'status') comparison = Number(left.ativa) - Number(right.ativa);
      else comparison = collator.compare(left.nome, right.nome);
      return comparison === 0 ? (left.id - right.id) * direction : comparison * direction;
    });
  }, [clinics, sortBy, sortDirection]);

  const changeSort = (field: ClinicSortField) => {
    if (field === sortBy) return setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
    setSortBy(field);
    setSortDirection('asc');
  };

  const loadClinics = useCallback(async () => {
    const requestId = ++loadRequestId.current;
    setLoading(true);
    setError('');
    try {
      const result = await listPlatformClinics(session.token);
      if (requestId === loadRequestId.current) setClinics(result);
    } catch (requestError) {
      if (requestId === loadRequestId.current) setError(getErrorMessage(requestError));
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  }, [session.token]);

  useEffect(() => {
    void loadClinics();
    return () => { loadRequestId.current += 1; photoRequestId.current += 1; };
  }, [loadClinics]);

  const clearSensitiveFormState = () => {
    photoRequestId.current += 1;
    setForm(EMPTY_CLINIC_FORM);
    setPhotoPreview(null);
    setEditing(null);
  };
  const closeForm = () => {
    setFormOpen(false);
    clearSensitiveFormState();
  };
  const openNew = () => {
    clearSensitiveFormState();
    setFormOpen(true);
    setError('');
    setSuccess('');
  };
  const openEdit = (clinic: PlatformClinic) => {
    setEditing(clinic);
    setForm(clinicToForm(clinic));
    setPhotoPreview(clinic.fotoUrl ? `${API_ASSET_BASE_URL}${clinic.fotoUrl}` : null);
    setFormOpen(true);
    setError('');
    setSuccess('');
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ALLOWED_PROFILE_PHOTO_TYPES.has(file.type)) return setError('Use uma foto PNG, JPG ou WEBP.');
    if (file.size > MAX_PROFILE_PHOTO_BYTES) return setError('A foto deve ter no maximo 2 MB.');
    const requestId = ++photoRequestId.current;
    try {
      const photo = await readProfilePhoto(file);
      if (requestId !== photoRequestId.current) return;
      setForm((current) => ({ ...current, fotoClinica: photo }));
      setPhotoPreview(photo);
      setError('');
    } catch (photoError) {
      if (requestId === photoRequestId.current) setError(getErrorMessage(photoError));
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidCnpj(form.cnpj)) return setError('Informe um CNPJ válido.');
    if (form.plano === 'Parcial' && form.modulosLiberados.length === 0) return setError('Selecione ao menos um módulo para o plano Parcial.');
    if (form.criarEquipeInicial && form.limiteUsuarios && Number(form.limiteUsuarios) < 2) return setError('O limite deve permitir ao menos um administrador e uma equipe.');
    const administratorPhoneDigits = getLocalBrazilPhoneDigits(form.administradorTelefone);
    if (!editing && administratorPhoneDigits && !isValidBrazilMobilePhone(form.administradorTelefone)) return setError('Informe um telefone celular brasileiro válido com DDD.');
    const teamPhoneDigits = getLocalBrazilPhoneDigits(form.equipeTelefone);
    if (form.criarEquipeInicial && teamPhoneDigits && !isValidBrazilMobilePhone(form.equipeTelefone)) return setError('Informe um telefone celular brasileiro válido com DDD para a equipe.');
    if (saveInFlight.current) return;

    saveInFlight.current = true;
    setSaving(true);
    setError('');
    setSuccess('');
    const createsTeam = form.criarEquipeInicial;
    const currentEditing = editing;
    const payload: ClinicPayload = {
      nome: form.nome.trim(), slug: form.slug.trim().toLowerCase(), cnpj: normalizeCnpj(form.cnpj), plano: form.plano.trim(),
      modulosLiberados: form.plano === 'Parcial' ? form.modulosLiberados : [], assinaturaStatus: form.assinaturaStatus,
      ativa: form.ativa, limiteUsuarios: form.limiteUsuarios ? Number(form.limiteUsuarios) : null,
      trialAte: form.plano === 'Trial' ? form.trialAte || null : null, assinaturaValidaAte: form.assinaturaValidaAte || null,
      fotoClinica: form.fotoClinica,
      ...(!currentEditing ? {
        administradorNome: form.administradorNome.trim(), administradorEmail: form.administradorEmail.trim(), administradorSenha: form.administradorSenha,
        administradorTelefone: administratorPhoneDigits ? normalizePhoneForPayload(form.administradorTelefone) : null,
        equipeInicial: createsTeam ? { nome: form.equipeNome.trim(), email: form.equipeEmail.trim(), senha: form.equipeSenha, telefone: teamPhoneDigits ? normalizePhoneForPayload(form.equipeTelefone) : null, modoIdentificacao: form.equipeModoIdentificacao } : null,
      } : {
        administradorNovaSenha: form.administradorNovaSenha || null,
        novaEquipe: createsTeam ? { nome: form.equipeNome.trim(), email: form.equipeEmail.trim(), senha: form.equipeSenha, telefone: teamPhoneDigits ? normalizePhoneForPayload(form.equipeTelefone) : null, modoIdentificacao: form.equipeModoIdentificacao } : null,
      }),
    };

    try {
      if (currentEditing) {
        const updatedClinic = await updatePlatformClinic(currentEditing.id, payload, session.token);
        queryClient.setQueryData(queryKeys.currentClinic(session.token, currentEditing.id), updatedClinic);
        setSuccess(createsTeam ? 'Clinica atualizada e nova equipe adicionada com sucesso.' : 'Clinica atualizada com sucesso.');
      } else {
        await createPlatformClinic(payload, session.token);
        setSuccess(createsTeam ? 'Clinica e equipe inicial criadas com sucesso.' : 'Clinica criada com sucesso.');
      }
      closeForm();
      await loadClinics();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };

  const deactivate = async (clinic: PlatformClinic) => {
    if (!window.confirm(`Desativar a clinica ${clinic.nome}? Os dados serao preservados.`)) return;
    setError('');
    try { await deactivatePlatformClinic(clinic.id, session.token); setSuccess('Clinica desativada.'); await loadClinics(); }
    catch (requestError) { setError(getErrorMessage(requestError)); }
  };
  const switchClinic = async (clinic: PlatformClinic) => {
    setError('');
    try { onClinicSelected(await selectSessionClinic(clinic.id, session.token)); }
    catch (requestError) { setError(getErrorMessage(requestError)); }
  };

  return {
    clinics, sortedClinics, loading, saving, error, success, editing, formOpen, form, photoPreview, sortBy, sortDirection,
    setForm, setPhotoPreview, changeSort, loadClinics, openNew, openEdit, closeForm, handlePhotoChange, submit, deactivate, switchClinic,
  };
}
