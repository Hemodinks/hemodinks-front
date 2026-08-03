import { type ChangeEvent, type FormEvent, useCallback, useEffect, useState } from 'react';
import type { AuthSession } from '../../shared/domain/sessionTypes';
import type { ClinicPayload, PlatformClinic, SelectClinicResponse } from './clinicTypes';
import { readProfilePhoto } from '../../shared/utils/files';
import {
  ALLOWED_PROFILE_PHOTO_TYPES,
  API_ASSET_BASE_URL,
  getErrorMessage,
  MAX_PROFILE_PHOTO_BYTES,
} from '../../shared/utils/formatters';
import { useAsyncOperation } from '../../shared/hooks/useAsyncOperation';
import { useClinicsGateway } from './useClinicsGateway';

export type ClinicForm = {
  nome: string;
  slug: string;
  plano: string;
  modulosLiberados: string[];
  assinaturaStatus: string;
  ativa: boolean;
  limiteUsuarios: string;
  trialAte: string;
  assinaturaValidaAte: string;
  fotoClinica?: string | null;
  administradorNome: string;
  administradorEmail: string;
  administradorSenha: string;
  administradorTelefone: string;
};

export const EMPTY_CLINIC_FORM: ClinicForm = {
  nome: '',
  slug: '',
  plano: 'Trial',
  modulosLiberados: [],
  assinaturaStatus: 'Trial',
  ativa: true,
  limiteUsuarios: '',
  trialAte: '',
  assinaturaValidaAte: '',
  fotoClinica: undefined,
  administradorNome: '',
  administradorEmail: '',
  administradorSenha: '',
  administradorTelefone: '',
};

type ClinicsControllerOptions = {
  session: AuthSession;
  isSuperAdmin: boolean;
  onClinicSelected: (result: SelectClinicResponse) => void;
};

export function useClinicsController({
  session,
  isSuperAdmin,
  onClinicSelected,
}: ClinicsControllerOptions) {
  const clinicsGateway = useClinicsGateway(session.token);
  const [clinics, setClinics] = useState<PlatformClinic[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<PlatformClinic | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ClinicForm>(EMPTY_CLINIC_FORM);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const loadOperation = useAsyncOperation(() => clinicsGateway.list());
  const saveOperation = useAsyncOperation((_signal, id: number | null, payload: ClinicPayload) =>
    id ? clinicsGateway.update(id, payload) : clinicsGateway.create(payload),
  );
  const deactivateOperation = useAsyncOperation((_signal, id: number) =>
    clinicsGateway.deactivate(id),
  );
  const selectOperation = useAsyncOperation((_signal, id: number) => clinicsGateway.select(id));

  const loadClinics = useCallback(async () => {
    setError('');
    try {
      setClinics(await loadOperation.execute());
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }, [loadOperation.execute]);

  useEffect(() => void loadClinics(), [loadClinics]);

  const openNew = () => {
    if (!isSuperAdmin) return;
    setEditing(null);
    setForm(EMPTY_CLINIC_FORM);
    setPhotoPreview(null);
    setFormOpen(true);
    setError('');
    setSuccess('');
  };

  const openEdit = (clinic: PlatformClinic) => {
    setEditing(clinic);
    setForm({
      ...EMPTY_CLINIC_FORM,
      nome: clinic.nome,
      slug: clinic.slug,
      plano: clinic.plano,
      modulosLiberados: clinic.modulosLiberados ?? [],
      assinaturaStatus: clinic.assinaturaStatus,
      ativa: clinic.ativa,
      limiteUsuarios: clinic.limiteUsuarios?.toString() ?? '',
      trialAte: clinic.trialAte?.slice(0, 10) ?? '',
      assinaturaValidaAte: clinic.assinaturaValidaAte?.slice(0, 10) ?? '',
    });
    setPhotoPreview(clinic.fotoUrl ? `${API_ASSET_BASE_URL}${clinic.fotoUrl}` : null);
    setFormOpen(true);
    setError('');
    setSuccess('');
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!ALLOWED_PROFILE_PHOTO_TYPES.has(file.type)) {
      setError('Use uma foto PNG, JPG ou WEBP.');
      return;
    }
    if (file.size > MAX_PROFILE_PHOTO_BYTES) {
      setError('A foto deve ter no maximo 1 MB.');
      return;
    }
    try {
      const photo = await readProfilePhoto(file);
      setForm((current) => ({ ...current, fotoClinica: photo }));
      setPhotoPreview(photo);
      setError('');
    } catch (photoError) {
      setError(getErrorMessage(photoError));
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSuperAdmin && form.plano === 'Parcial' && form.modulosLiberados.length === 0) {
      setError('Selecione ao menos um módulo para o plano Parcial.');
      return;
    }
    setError('');
    setSuccess('');
    const payload: ClinicPayload = isSuperAdmin
      ? {
          nome: form.nome.trim(),
          slug: form.slug.trim().toLowerCase(),
          plano: form.plano.trim(),
          modulosLiberados: form.plano === 'Parcial' ? form.modulosLiberados : [],
          assinaturaStatus: form.assinaturaStatus,
          ativa: form.ativa,
          limiteUsuarios: form.limiteUsuarios ? Number(form.limiteUsuarios) : null,
          trialAte: form.plano === 'Trial' ? form.trialAte || null : null,
          assinaturaValidaAte: form.assinaturaValidaAte || null,
          fotoClinica: form.fotoClinica,
          ...(!editing
            ? {
                administradorNome: form.administradorNome.trim(),
                administradorEmail: form.administradorEmail.trim(),
                administradorSenha: form.administradorSenha,
                administradorTelefone: form.administradorTelefone.trim() || null,
              }
            : {}),
        }
      : {
          nome: form.nome.trim(),
          slug: form.slug.trim().toLowerCase(),
          fotoClinica: form.fotoClinica,
        };

    try {
      await saveOperation.execute(editing?.id ?? null, payload);
      setSuccess(editing ? 'Clinica atualizada com sucesso.' : 'Clinica criada com sucesso.');
      setFormOpen(false);
      await loadClinics();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const deactivate = async (clinic: PlatformClinic) => {
    if (!window.confirm(`Desativar a clinica ${clinic.nome}? Os dados serao preservados.`)) return;
    setError('');
    try {
      await deactivateOperation.execute(clinic.id);
      setSuccess('Clinica desativada.');
      await loadClinics();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const switchClinic = async (clinic: PlatformClinic) => {
    setError('');
    try {
      onClinicSelected(await selectOperation.execute(clinic.id));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  return {
    clinics,
    error,
    success,
    editing,
    formOpen,
    setFormOpen,
    form,
    setForm,
    photoPreview,
    setPhotoPreview,
    loading: loadOperation.isLoading,
    saving: saveOperation.isLoading,
    loadClinics,
    openNew,
    openEdit,
    handlePhotoChange,
    submit,
    deactivate,
    switchClinic,
  };
}
