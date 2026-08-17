import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, CheckCircle2, ImagePlus, Pencil, Plus, RefreshCw, RotateCcw, Save, Trash2 } from 'lucide-react';
import {
  createPlatformClinic,
  deactivatePlatformClinic,
  listPlatformClinics,
  selectSessionClinic,
  updatePlatformClinic,
} from '../../services';
import type { AuthSession, ClinicPayload, PlatformClinic, SelectClinicResponse, TeamIdentificationMode } from '../../types';
import { AlertMessage, Button, DataPanel, IconButton, TextField } from '../../shared/components/ui';
import { readProfilePhoto } from '../../shared/utils/files';
import {
  ALLOWED_PROFILE_PHOTO_TYPES,
  API_ASSET_BASE_URL,
  formatPhoneInput,
  getLocalBrazilPhoneDigits,
  getErrorMessage,
  isValidBrazilMobilePhone,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PROFILE_PHOTO_BYTES,
  normalizePhoneForPayload,
} from '../../shared/utils/formatters';
import { CompanyLogo } from '../../shared/components/CompanyLogo';
import { getTeamIdentificationDescription, TEAM_IDENTIFICATION_OPTIONS } from '../../shared/utils/teamIdentification';
import { ClinicTeamsPanel } from '../settings/TeamAdminPanel';
import './clinics.css';

type ClinicForm = {
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
  criarEquipeInicial: boolean;
  equipeNome: string;
  equipeEmail: string;
  equipeSenha: string;
  equipeTelefone: string;
  equipeModoIdentificacao: TeamIdentificationMode;
};

const EMPTY_FORM: ClinicForm = {
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
  criarEquipeInicial: true,
  equipeNome: '',
  equipeEmail: '',
  equipeSenha: '',
  equipeTelefone: '',
  equipeModoIdentificacao: 'Pin',
};

const CLINIC_MODULE_OPTIONS = [
  { value: 'usuarios', label: 'Usuários' },
  { value: 'pacientes', label: 'Pacientes' },
  { value: 'faturamento', label: 'Faturamento médico' },
  { value: 'grupos-medicos', label: 'Grupos médicos' },
  { value: 'agenda', label: 'Agenda e notificações' },
];

const MAX_CLINIC_NAME_LENGTH = 120;
const MAX_CLINIC_SLUG_LENGTH = 120;
const MAX_ADMIN_PASSWORD_LENGTH = 200;
const MAX_BRAZIL_MOBILE_MASK_LENGTH = 19;
const MAX_USER_LIMIT = 2_147_483_647;

type ClinicsPageProps = {
  session: AuthSession;
  onClinicSelected: (result: SelectClinicResponse) => void;
};

export function ClinicsPage({ session, onClinicSelected }: ClinicsPageProps) {
  const [clinics, setClinics] = useState<PlatformClinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState<PlatformClinic | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ClinicForm>(EMPTY_FORM);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'nome' | 'plano' | 'assinatura' | 'usuarios' | 'status'>('nome');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const sortedClinics = useMemo(() => {
    const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
    const direction = sortDirection === 'asc' ? 1 : -1;

    return [...clinics].sort((left, right) => {
      let comparison = 0;

      switch (sortBy) {
        case 'plano':
          comparison = collator.compare(left.plano, right.plano);
          break;
        case 'assinatura':
          comparison = collator.compare(left.assinaturaStatus, right.assinaturaStatus);
          break;
        case 'usuarios':
          comparison = (left.usuarios ?? -1) - (right.usuarios ?? -1);
          break;
        case 'status':
          comparison = Number(left.ativa) - Number(right.ativa);
          break;
        default:
          comparison = collator.compare(left.nome, right.nome);
      }

      return comparison === 0 ? (left.id - right.id) * direction : comparison * direction;
    });
  }, [clinics, sortBy, sortDirection]);

  const changeSort = (field: typeof sortBy) => {
    if (field === sortBy) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }

    setSortBy(field);
    setSortDirection('asc');
  };

  const sortHeader = (field: typeof sortBy, label: string) => (
    <button
      type="button"
      className="sort-header-button"
      onClick={() => changeSort(field)}
      aria-sort={sortBy === field ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      {label}
      {sortBy === field && <span className="sort-indicator">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
    </button>
  );

  const loadClinics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setClinics(await listPlatformClinics(session.token));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [session.token]);

  useEffect(() => { void loadClinics(); }, [loadClinics]);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPhotoPreview(null);
    setFormOpen(true);
    setError('');
    setSuccess('');
  };

  const openEdit = (clinic: PlatformClinic) => {
    setEditing(clinic);
    setForm({
      ...EMPTY_FORM,
      nome: clinic.nome,
      slug: clinic.slug,
      plano: clinic.plano,
      modulosLiberados: clinic.modulosLiberados ?? [],
      assinaturaStatus: clinic.assinaturaStatus,
      ativa: clinic.ativa,
      limiteUsuarios: clinic.limiteUsuarios?.toString() ?? '',
      trialAte: clinic.trialAte?.slice(0, 10) ?? '',
      assinaturaValidaAte: clinic.assinaturaValidaAte?.slice(0, 10) ?? '',
      criarEquipeInicial: false,
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
      setError('A foto deve ter no maximo 2 MB.');
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
    if (form.plano === 'Parcial' && form.modulosLiberados.length === 0) {
      setError('Selecione ao menos um módulo para o plano Parcial.');
      return;
    }
    if (form.criarEquipeInicial && form.limiteUsuarios && Number(form.limiteUsuarios) < 2) {
      setError('O limite deve permitir ao menos um administrador e uma equipe.');
      return;
    }
    const administratorPhoneDigits = getLocalBrazilPhoneDigits(form.administradorTelefone);
    if (!editing && administratorPhoneDigits && !isValidBrazilMobilePhone(form.administradorTelefone)) {
      setError('Informe um telefone celular brasileiro válido com DDD.');
      return;
    }
    const teamPhoneDigits = getLocalBrazilPhoneDigits(form.equipeTelefone);
    if (form.criarEquipeInicial && teamPhoneDigits && !isValidBrazilMobilePhone(form.equipeTelefone)) {
      setError('Informe um telefone celular brasileiro válido com DDD para a equipe.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    const payload: ClinicPayload = {
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
      ...(!editing ? {
        administradorNome: form.administradorNome.trim(),
        administradorEmail: form.administradorEmail.trim(),
        administradorSenha: form.administradorSenha,
        administradorTelefone: administratorPhoneDigits ? normalizePhoneForPayload(form.administradorTelefone) : null,
        equipeInicial: form.criarEquipeInicial ? {
          nome: form.equipeNome.trim(),
          email: form.equipeEmail.trim(),
          senha: form.equipeSenha,
          telefone: teamPhoneDigits ? normalizePhoneForPayload(form.equipeTelefone) : null,
          modoIdentificacao: form.equipeModoIdentificacao,
        } : null,
      } : {
        novaEquipe: form.criarEquipeInicial ? {
          nome: form.equipeNome.trim(),
          email: form.equipeEmail.trim(),
          senha: form.equipeSenha,
          telefone: teamPhoneDigits ? normalizePhoneForPayload(form.equipeTelefone) : null,
          modoIdentificacao: form.equipeModoIdentificacao,
        } : null,
      }),
    };

    try {
      if (editing) {
        await updatePlatformClinic(editing.id, payload, session.token);
        setSuccess(form.criarEquipeInicial ? 'Clinica atualizada e nova equipe adicionada com sucesso.' : 'Clinica atualizada com sucesso.');
      } else {
        await createPlatformClinic(payload, session.token);
        setSuccess(form.criarEquipeInicial ? 'Clinica e equipe inicial criadas com sucesso.' : 'Clinica criada com sucesso.');
      }
      setFormOpen(false);
      await loadClinics();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (clinic: PlatformClinic) => {
    if (!window.confirm(`Desativar a clinica ${clinic.nome}? Os dados serao preservados.`)) return;
    setError('');
    try {
      await deactivatePlatformClinic(clinic.id, session.token);
      setSuccess('Clinica desativada.');
      await loadClinics();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const switchClinic = async (clinic: PlatformClinic) => {
    setError('');
    try {
      onClinicSelected(await selectSessionClinic(clinic.id, session.token));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  return (
    <section className="workspace clinics-workspace" data-tour="clinics-overview">
      <DataPanel>
        <div className="data-header">
          <div>
            <span className="eyebrow">Plataforma multiclinica</span>
            <h2>{clinics.length} clinicas cadastradas</h2>
          </div>
          <div className="table-tools">
            <Button onClick={openNew} data-tour="clinics-new"><Plus size={17} />Nova clinica</Button>
            <IconButton label="Atualizar clinicas" onClick={() => void loadClinics()}><RefreshCw size={18} /></IconButton>
          </div>
        </div>

        {success && <AlertMessage type="success" icon={<CheckCircle2 size={17} />}>{success}</AlertMessage>}
        {error && <AlertMessage type="error">{error}</AlertMessage>}

        <div className="table-wrap" data-tour="clinics-switch">
          <table className="users-table clinics-table">
            <thead><tr><th>{sortHeader('nome', 'Clinica')}</th><th>{sortHeader('plano', 'Plano')}</th><th>{sortHeader('assinatura', 'Assinatura')}</th><th>{sortHeader('usuarios', 'Usuarios')}</th><th>{sortHeader('status', 'Status')}</th><th aria-label="Acoes" /></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="empty-row">Carregando clinicas...</td></tr> : sortedClinics.map((clinic) => (
                <tr key={clinic.id}>
                  <td data-label="Clinica"><div className="clinic-name-cell"><CompanyLogo companyName={clinic.nome} photo={clinic.fotoUrl ? `${API_ASSET_BASE_URL}${clinic.fotoUrl}` : null} className="clinic-list-logo" /><span><strong>{clinic.nome}</strong><small>{clinic.slug}</small></span></div></td>
                  <td data-label="Plano">{clinic.plano}</td>
                  <td data-label="Assinatura">{clinic.assinaturaStatus}</td>
                  <td data-label="Usuarios">{clinic.usuarios ?? '-'}</td>
                  <td data-label="Status"><span className={`status-pill ${clinic.ativa ? 'ok' : 'warning'}`}>{clinic.ativa ? 'Ativa' : 'Inativa'}</span></td>
                  <td data-label="Acoes"><div className="row-actions">
                    {clinic.ativa && clinic.id !== session.user.clinicaId && <IconButton label={`Acessar ${clinic.nome}`} onClick={() => void switchClinic(clinic)}><RotateCcw size={17} /></IconButton>}
                    <IconButton label={`Editar ${clinic.nome}`} tone="muted" onClick={() => openEdit(clinic)}><Pencil size={17} /></IconButton>
                    {clinic.ativa && clinic.id !== session.user.clinicaId && <IconButton label={`Desativar ${clinic.nome}`} tone="danger" onClick={() => void deactivate(clinic)}><Trash2 size={17} /></IconButton>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataPanel>

      {formOpen && <DataPanel className="clinic-form-panel" data-tour="clinics-form">
        <div className="settings-section-heading"><span className="settings-section-icon"><Building2 size={19} /></span><div><span className="eyebrow">{editing ? 'Edicao' : 'Onboarding'}</span><h3>{editing ? `Editar ${editing.nome}` : 'Nova clinica'}</h3></div></div>
        <form className="clinic-form" onSubmit={submit}>
          <div className="clinic-brand-editor">
            <CompanyLogo companyName={form.nome || 'Clinica'} photo={photoPreview} className="clinic-brand-photo" />
            <div className="clinic-brand-actions"><label className="ghost-button file-action" htmlFor="clinic-photo-input"><ImagePlus size={17} />Selecionar foto</label><input id="clinic-photo-input" className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void handlePhotoChange(event)} />{photoPreview && <Button variant="danger-ghost" onClick={() => { setForm((current) => ({ ...current, fotoClinica: '' })); setPhotoPreview(null); }}><Trash2 size={16} />Remover foto</Button>}</div>
          </div>
          <div className="clinic-form-grid" data-tour="clinics-identity">
            <TextField label="Nome da clinica" value={form.nome} onValueChange={(nome) => setForm((current) => ({ ...current, nome: nome.slice(0, MAX_CLINIC_NAME_LENGTH) }))} maxLength={MAX_CLINIC_NAME_LENGTH} required />
            <TextField label="Slug" value={form.slug} onValueChange={(slug) => setForm((current) => ({ ...current, slug: slug.slice(0, MAX_CLINIC_SLUG_LENGTH) }))} maxLength={MAX_CLINIC_SLUG_LENGTH} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
            <label>Plano<select value={form.plano} onChange={(event) => setForm((current) => ({
              ...current,
              plano: event.target.value,
              trialAte: event.target.value === 'Trial' ? current.trialAte : '',
              assinaturaStatus: event.target.value === 'Trial' ? 'Trial' : current.assinaturaStatus === 'Trial' ? 'Ativa' : current.assinaturaStatus,
            }))}><option value="Trial">Trial</option><option value="Parcial">Parcial</option><option value="Completa">Completa</option></select></label>
            <label>Status da assinatura<select value={form.assinaturaStatus} onChange={(event) => setForm((current) => ({ ...current, assinaturaStatus: event.target.value }))}><option>Trial</option><option>Ativa</option><option>Suspensa</option><option>Cancelada</option></select></label>
            <TextField label="Limite de usuarios" type="number" min={form.criarEquipeInicial ? 2 : 1} max={MAX_USER_LIMIT} value={form.limiteUsuarios} onValueChange={(limiteUsuarios) => setForm((current) => ({ ...current, limiteUsuarios }))} />
            {form.plano === 'Trial' && <TextField label="Trial ate" type="date" value={form.trialAte} onValueChange={(trialAte) => setForm((current) => ({ ...current, trialAte }))} />}
            <TextField label="Assinatura valida ate" type="date" value={form.assinaturaValidaAte} onValueChange={(assinaturaValidaAte) => setForm((current) => ({ ...current, assinaturaValidaAte }))} />
            {editing && <label className="toggle-row"><input type="checkbox" checked={form.ativa} onChange={(event) => setForm((current) => ({ ...current, ativa: event.target.checked }))} />Clinica ativa</label>}
          </div>
          {form.plano === 'Parcial' && <fieldset className="clinic-modules-fieldset"><legend>Módulos contratados</legend><div className="clinic-module-options">{CLINIC_MODULE_OPTIONS.map((module) => <label key={module.value}><input type="checkbox" checked={form.modulosLiberados.includes(module.value)} onChange={(event) => setForm((current) => ({ ...current, modulosLiberados: event.target.checked ? [...current.modulosLiberados, module.value] : current.modulosLiberados.filter((value) => value !== module.value) }))} />{module.label}</label>)}</div></fieldset>}
          {!editing && <fieldset className="clinic-admin-fields"><legend>Administrador inicial</legend><div className="clinic-form-grid"><TextField label="Nome" value={form.administradorNome} onValueChange={(administradorNome) => setForm((current) => ({ ...current, administradorNome: administradorNome.slice(0, MAX_NAME_LENGTH) }))} maxLength={MAX_NAME_LENGTH} required /><TextField label="Email" type="email" value={form.administradorEmail} onValueChange={(administradorEmail) => setForm((current) => ({ ...current, administradorEmail: administradorEmail.slice(0, MAX_EMAIL_LENGTH) }))} maxLength={MAX_EMAIL_LENGTH} required /><TextField label="Senha inicial" type="password" minLength={8} maxLength={MAX_ADMIN_PASSWORD_LENGTH} value={form.administradorSenha} onValueChange={(administradorSenha) => setForm((current) => ({ ...current, administradorSenha: administradorSenha.slice(0, MAX_ADMIN_PASSWORD_LENGTH) }))} required /><TextField label="Telefone" type="tel" inputMode="tel" autoComplete="tel" value={form.administradorTelefone} onValueChange={(administradorTelefone) => setForm((current) => ({ ...current, administradorTelefone: formatPhoneInput(administradorTelefone) }))} maxLength={MAX_BRAZIL_MOBILE_MASK_LENGTH} placeholder="+55 (DDD) 99999-9999" /></div></fieldset>}
          <fieldset className="clinic-team-fields" data-tour="clinics-team">
            <legend>{editing ? 'Adicionar equipe' : 'Equipe inicial'}</legend>
            <label className="clinic-team-toggle">
              <input type="checkbox" checked={form.criarEquipeInicial} onChange={(event) => setForm((current) => ({ ...current, criarEquipeInicial: event.target.checked }))} />
              {editing ? 'Adicionar uma nova equipe a esta clínica' : 'Cadastrar uma equipe junto com a clínica'}
            </label>
            <small className="file-hint">A equipe usará uma conta coletiva vinculada exclusivamente a esta clínica.</small>
            {form.criarEquipeInicial && <div className="clinic-team-content">
              <div className="clinic-form-grid">
                <TextField label="Nome da equipe" value={form.equipeNome} onValueChange={(equipeNome) => setForm((current) => ({ ...current, equipeNome: equipeNome.slice(0, MAX_NAME_LENGTH) }))} maxLength={MAX_NAME_LENGTH} required />
                <TextField label="E-mail coletivo" type="email" value={form.equipeEmail} onValueChange={(equipeEmail) => setForm((current) => ({ ...current, equipeEmail: equipeEmail.slice(0, MAX_EMAIL_LENGTH) }))} maxLength={MAX_EMAIL_LENGTH} required />
                <TextField label="Senha coletiva inicial" type="password" minLength={8} maxLength={MAX_ADMIN_PASSWORD_LENGTH} value={form.equipeSenha} onValueChange={(equipeSenha) => setForm((current) => ({ ...current, equipeSenha: equipeSenha.slice(0, MAX_ADMIN_PASSWORD_LENGTH) }))} required />
                <TextField label="Telefone da equipe" type="tel" inputMode="tel" autoComplete="tel" value={form.equipeTelefone} onValueChange={(equipeTelefone) => setForm((current) => ({ ...current, equipeTelefone: formatPhoneInput(equipeTelefone) }))} maxLength={MAX_BRAZIL_MOBILE_MASK_LENGTH} placeholder="+55 (DDD) 99999-9999" />
              </div>
              <label>
                Identificação dos membros da equipe
                <select value={form.equipeModoIdentificacao} onChange={(event) => setForm((current) => ({ ...current, equipeModoIdentificacao: event.target.value as TeamIdentificationMode }))}>
                  {TEAM_IDENTIFICATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <small className="file-hint">{getTeamIdentificationDescription(form.equipeModoIdentificacao)}</small>
              <div className="team-identification-options" aria-label="Explicação dos modos de identificação" data-tour="clinics-identification-mode">
                {TEAM_IDENTIFICATION_OPTIONS.map((option) => <p key={option.value}><strong>{option.label}:</strong> {option.description}</p>)}
              </div>
            </div>}
          </fieldset>
          {editing && <ClinicTeamsPanel key={editing.id} session={session} clinicId={editing.id} clinicName={editing.nome} />}
          <div className="button-row" data-tour="clinics-save"><Button onClick={() => setFormOpen(false)}>Cancelar</Button><Button variant="primary" type="submit" disabled={saving}><Save size={18} />{saving ? 'Salvando...' : 'Salvar clinica'}</Button></div>
        </form>
      </DataPanel>}
    </section>
  );
}
