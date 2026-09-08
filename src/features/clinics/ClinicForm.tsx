import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from 'react';
import { Building2, ImagePlus, Save, Trash2 } from 'lucide-react';
import type { AuthSession, PlatformClinic } from '../../types';
import { CompanyLogo } from '../../shared/components/CompanyLogo';
import { PasswordInput } from '../../shared/components/PasswordInput';
import { Button, DataPanel, TextField } from '../../shared/components/ui';
import { formatPhoneInput, MAX_EMAIL_LENGTH, MAX_NAME_LENGTH } from '../../shared/utils/formatters';
import { focusFirstInvalidFormField } from '../../shared/utils/focusInvalidFormField';
import { ClinicTeamsPanel } from '../settings/TeamAdminPanel';
import { CLINIC_MODULE_OPTIONS, MAX_ADMIN_PASSWORD_LENGTH, MAX_BRAZIL_MOBILE_MASK_LENGTH, MAX_CLINIC_NAME_LENGTH, MAX_CLINIC_SLUG_LENGTH, MAX_USER_LIMIT, type ClinicFormData } from './clinicFormModel';
import { ClinicFormTeamFields } from './ClinicFormTeamFields';
import { CnpjField } from './CnpjField';

type Props = {
  session: AuthSession;
  editing: PlatformClinic | null;
  form: ClinicFormData;
  setForm: Dispatch<SetStateAction<ClinicFormData>>;
  photoPreview: string | null;
  setPhotoPreview: (value: string | null) => void;
  saving: boolean;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onClose: () => void;
};

export function ClinicForm({ session, editing, form, setForm, photoPreview, setPhotoPreview, saving, onPhotoChange, onSubmit, onClose }: Props) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!event.currentTarget.checkValidity()) {
      event.preventDefault();
      return;
    }
    void onSubmit(event);
  };

  return (
    <DataPanel className="clinic-form-panel" data-tour="clinics-form">
      <div className="settings-section-heading"><span className="settings-section-icon"><Building2 size={19} /></span><div><span className="eyebrow">{editing ? 'Edicao' : 'Onboarding'}</span><h3>{editing ? `Editar ${editing.nome}` : 'Nova clinica'}</h3></div></div>
      <form className="clinic-form" onSubmit={handleSubmit} onInvalid={focusFirstInvalidFormField}>
        <div className="clinic-brand-editor">
          <CompanyLogo companyName={form.nome || 'Clinica'} photo={photoPreview} className="clinic-brand-photo" />
          <div className="clinic-brand-actions"><label className="ghost-button file-action" htmlFor="clinic-photo-input"><ImagePlus size={17} />Selecionar foto</label><input id="clinic-photo-input" className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void onPhotoChange(event)} />{photoPreview && <Button variant="danger-ghost" onClick={() => { setForm((current) => ({ ...current, fotoClinica: '' })); setPhotoPreview(null); }}><Trash2 size={16} />Remover foto</Button>}</div>
        </div>
        <div className="clinic-form-grid" data-tour="clinics-identity">
          <TextField label="Nome da clinica" value={form.nome} onValueChange={(nome) => setForm((current) => ({ ...current, nome: nome.slice(0, MAX_CLINIC_NAME_LENGTH) }))} maxLength={MAX_CLINIC_NAME_LENGTH} required />
          <TextField label="Slug" value={form.slug} onValueChange={(slug) => setForm((current) => ({ ...current, slug: slug.slice(0, MAX_CLINIC_SLUG_LENGTH) }))} maxLength={MAX_CLINIC_SLUG_LENGTH} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
          <CnpjField value={form.cnpj} onValueChange={(cnpj) => setForm((current) => ({ ...current, cnpj }))} />
          <label>Plano<select value={form.plano} onChange={(event) => setForm((current) => ({ ...current, plano: event.target.value, trialAte: event.target.value === 'Trial' ? current.trialAte : '', assinaturaStatus: event.target.value === 'Trial' ? 'Trial' : current.assinaturaStatus === 'Trial' ? 'Ativa' : current.assinaturaStatus }))}><option value="Trial">Trial</option><option value="Parcial">Parcial</option><option value="Completa">Completa</option></select></label>
          <label>Status da assinatura<select value={form.assinaturaStatus} onChange={(event) => setForm((current) => ({ ...current, assinaturaStatus: event.target.value }))}><option>Trial</option><option>Ativa</option><option>Suspensa</option><option>Cancelada</option></select></label>
          <TextField label="Limite de usuarios" type="number" min={form.criarEquipeInicial ? 2 : 1} max={MAX_USER_LIMIT} value={form.limiteUsuarios} onValueChange={(limiteUsuarios) => setForm((current) => ({ ...current, limiteUsuarios }))} />
          {form.plano === 'Trial' && <TextField label="Trial ate" type="date" value={form.trialAte} onValueChange={(trialAte) => setForm((current) => ({ ...current, trialAte }))} />}
          <TextField label="Assinatura valida ate" type="date" value={form.assinaturaValidaAte} onValueChange={(assinaturaValidaAte) => setForm((current) => ({ ...current, assinaturaValidaAte }))} />
          {editing && <label className="toggle-row"><input type="checkbox" checked={form.ativa} onChange={(event) => setForm((current) => ({ ...current, ativa: event.target.checked }))} />Clinica ativa</label>}
        </div>
        {form.plano === 'Parcial' && <fieldset className="clinic-modules-fieldset"><legend>Módulos contratados</legend><div className="clinic-module-options">{CLINIC_MODULE_OPTIONS.map((module) => <label key={module.value}><input type="checkbox" checked={form.modulosLiberados.includes(module.value)} onChange={(event) => setForm((current) => ({ ...current, modulosLiberados: event.target.checked ? [...current.modulosLiberados, module.value] : current.modulosLiberados.filter((value) => value !== module.value) }))} />{module.label}</label>)}</div></fieldset>}
        {!editing && <fieldset className="clinic-admin-fields"><legend>Administrador inicial</legend><div className="clinic-form-grid"><TextField label="Nome" value={form.administradorNome} onValueChange={(administradorNome) => setForm((current) => ({ ...current, administradorNome: administradorNome.slice(0, MAX_NAME_LENGTH) }))} maxLength={MAX_NAME_LENGTH} required /><TextField label="Email" type="email" value={form.administradorEmail} onValueChange={(administradorEmail) => setForm((current) => ({ ...current, administradorEmail: administradorEmail.slice(0, MAX_EMAIL_LENGTH) }))} maxLength={MAX_EMAIL_LENGTH} required /><PasswordInput id="clinic-administrator-password" label="Senha inicial" value={form.administradorSenha} onChange={(administradorSenha) => setForm((current) => ({ ...current, administradorSenha: administradorSenha.slice(0, MAX_ADMIN_PASSWORD_LENGTH) }))} autoComplete="new-password" minLength={8} maxLength={MAX_ADMIN_PASSWORD_LENGTH} required /><TextField label="Telefone" type="tel" inputMode="tel" autoComplete="tel" value={form.administradorTelefone} onValueChange={(administradorTelefone) => setForm((current) => ({ ...current, administradorTelefone: formatPhoneInput(administradorTelefone) }))} maxLength={MAX_BRAZIL_MOBILE_MASK_LENGTH} placeholder="+55 (DDD) 99999-9999" /></div></fieldset>}
        {editing && <fieldset className="clinic-admin-fields"><legend>Segurança do administrador principal</legend><div className="clinic-form-grid"><PasswordInput id="clinic-administrator-new-password" label="Definir nova senha" value={form.administradorNovaSenha} onChange={(administradorNovaSenha) => setForm((current) => ({ ...current, administradorNovaSenha: administradorNovaSenha.slice(0, MAX_ADMIN_PASSWORD_LENGTH) }))} autoComplete="new-password" minLength={8} maxLength={MAX_ADMIN_PASSWORD_LENGTH} /></div><small className="file-hint">A senha atual não pode ser visualizada. Deixe em branco para mantê-la; ao redefinir, o administrador deverá trocá-la no próximo acesso.</small></fieldset>}
        <ClinicFormTeamFields editing={Boolean(editing)} form={form} setForm={setForm} />
        {editing && <ClinicTeamsPanel key={editing.id} session={session} clinicId={editing.id} clinicName={editing.nome} />}
        <div className="button-row" data-tour="clinics-save"><Button onClick={onClose}>Cancelar</Button><Button variant="primary" type="submit" disabled={saving}><Save size={18} />{saving ? 'Salvando...' : 'Salvar clinica'}</Button></div>
      </form>
    </DataPanel>
  );
}
