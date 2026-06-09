import { type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { FileText, FileUp, ImagePlus, Plus, Save, Trash2, X } from 'lucide-react';
import type { User, UserFormData } from '../../types';
import { DateInput } from '../../shared/components/DateInput';
import {
  BRAZIL_UF_OPTIONS,
  DEFAULT_PASSWORD,
  formatCpfInput,
  formatPhoneInput,
  isMedicalProfileId,
  MAX_CPF_LENGTH,
  MAX_CRM_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PHONE_LENGTH,
  MEDICAL_PROFILE_ID,
  PROFILE_OPTIONS,
} from '../../shared/utils/formatters';
import { UserAvatar } from './UserAvatar';

type UserFormProps = {
  canAccessUsers: boolean;
  canUseUserForm: boolean;
  editingId: number | null;
  editingUserDetails: User | null;
  formData: UserFormData;
  formError: string;
  formLoading: boolean;
  pendingUserFiles: File[];
  photoInputKey: number;
  userFileInputKey: number;
  sessionToken: string;
  setFormData: Dispatch<SetStateAction<UserFormData>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onProfilePhotoChange: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onRemoveProfilePhoto: () => void;
  onUserFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemovePendingUserFile: (index: number) => void;
  onDeleteUserArquivo: (user: User, arquivoId: number) => void | Promise<void>;
};

export function UserForm({
  canAccessUsers,
  canUseUserForm,
  editingId,
  editingUserDetails,
  formData,
  formError,
  formLoading,
  pendingUserFiles,
  photoInputKey,
  userFileInputKey,
  sessionToken,
  setFormData,
  onClose,
  onSubmit,
  onProfilePhotoChange,
  onRemoveProfilePhoto,
  onUserFilesChange,
  onRemovePendingUserFile,
  onDeleteUserArquivo,
}: UserFormProps) {
  return (
    <aside className="form-panel module-form-panel">
      <div className="panel-title">
        <div>
          <span className="eyebrow">{canAccessUsers ? editingId ? 'Edicao' : 'Cadastro' : 'Perfil'}</span>
          <h2>{canAccessUsers ? editingId ? 'Editar usuario' : 'Novo usuario' : 'Meu cadastro'}</h2>
        </div>
        <div className="panel-title-actions">
          {canAccessUsers && !editingId && <span className="password-chip">Senha: {DEFAULT_PASSWORD}</span>}
          <button type="button" className="icon-button muted" onClick={onClose} title="Voltar para lista">
            <X size={18} />
          </button>
        </div>
      </div>

      <form className="stack module-form-grid" onSubmit={onSubmit}>
        <div className="profile-photo-field">
          <label className="field-label" htmlFor="profile-photo-input">
            Foto do perfil
          </label>
          <div className="photo-uploader">
            <UserAvatar userId={editingId ?? undefined} name={formData.nome || 'Usuario'} photo={formData.fotoPerfil} authToken={sessionToken} size="lg" />
            <div className="photo-actions">
              <label className="ghost-button file-action" htmlFor="profile-photo-input">
                <ImagePlus size={17} />
                {formData.fotoPerfil ? 'Trocar foto' : 'Adicionar foto'}
              </label>
              {formData.fotoPerfil && (
                <button type="button" className="ghost-button danger-text" onClick={onRemoveProfilePhoto}>
                  <Trash2 size={17} />
                  Remover
                </button>
              )}
            </div>
          </div>
          <input
            key={photoInputKey}
            id="profile-photo-input"
            className="sr-only"
            type="file"
            aria-label="Foto do perfil"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => void onProfilePhotoChange(event)}
          />
          <span className="file-hint">PNG, JPG ou WEBP ate 1 MB.</span>
        </div>

        <label>
          Nome completo
          <input
            type="text"
            value={formData.nome}
            onChange={(event) => setFormData((current) => ({ ...current, nome: event.target.value.slice(0, MAX_NAME_LENGTH) }))}
            maxLength={MAX_NAME_LENGTH}
            required
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={formData.email}
            onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value.slice(0, MAX_EMAIL_LENGTH) }))}
            maxLength={MAX_EMAIL_LENGTH}
            required
          />
        </label>

        <label>
          Telefone
          <input
            type="tel"
            value={formData.telefone}
            onFocus={() => setFormData((current) => ({ ...current, telefone: formatPhoneInput(current.telefone) }))}
            onChange={(event) => setFormData((current) => ({ ...current, telefone: formatPhoneInput(event.target.value) }))}
            inputMode="numeric"
            maxLength={MAX_PHONE_LENGTH}
            placeholder="+55 (81) 99999-9999"
            required
          />
        </label>

        <label>
          CPF
          <input
            type="text"
            value={formData.cpf}
            onChange={(event) => setFormData((current) => ({ ...current, cpf: formatCpfInput(event.target.value) }))}
            inputMode="numeric"
            maxLength={MAX_CPF_LENGTH}
            placeholder="000.000.000-00"
            required
          />
        </label>

        <DateInput
          id="user-birth-date"
          label="Data de nascimento"
          value={formData.dataNascimento}
          onChange={(value) => setFormData((current) => ({ ...current, dataNascimento: value }))}
          required
        />

        <label>
          Perfil
          <select
            value={formData.perfilId}
            onChange={(event) => {
              const perfilId = Number(event.target.value);
              setFormData((current) => ({
                ...current,
                perfilId,
                crm: isMedicalProfileId(perfilId) ? current.crm : '',
                crmUf: isMedicalProfileId(perfilId) ? current.crmUf : '',
              }));
            }}
            disabled={!canAccessUsers}
            required
          >
            {PROFILE_OPTIONS.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.nome}
              </option>
            ))}
          </select>
        </label>

        {isMedicalProfileId(formData.perfilId) && (
          <div className="two-column-fields medical-registration-fields">
            <label>
              CRM
              <input
                type="text"
                value={formData.crm}
                onChange={(event) => setFormData((current) => ({ ...current, crm: event.target.value.slice(0, MAX_CRM_LENGTH) }))}
                maxLength={MAX_CRM_LENGTH}
                placeholder="Ex.: 12345"
                disabled={!canUseUserForm}
                required
              />
            </label>

            <label>
              UF do CRM
              <select
                value={formData.crmUf}
                onChange={(event) => setFormData((current) => ({ ...current, crmUf: event.target.value }))}
                disabled={!canUseUserForm}
                required
              >
                <option value="">Selecione</option>
                {BRAZIL_UF_OPTIONS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        {formData.perfilId === MEDICAL_PROFILE_ID && canUseUserForm && (
          <div className="profile-photo-field">
            <label className="field-label" htmlFor="user-file-input">
              Documentos
            </label>
            <label className="ghost-button file-action full-width" htmlFor="user-file-input">
              <FileUp size={17} />
              Selecionar documentos
            </label>
            <input
              key={userFileInputKey}
              id="user-file-input"
              className="sr-only"
              type="file"
              aria-label="Documentos do medico"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt,.csv,.ppt,.pptx"
              multiple
              onChange={onUserFilesChange}
            />
            <span className="file-hint">PDF, Office, imagens, TXT ou CSV ate 10 MB.</span>

            {pendingUserFiles.length > 0 && (
              <ul className="file-list">
                {pendingUserFiles.map((file, index) => (
                  <li key={`${file.name}-${index}`}>
                    <FileText size={15} />
                    <span>{file.name}</span>
                    <button type="button" className="icon-button muted mini" onClick={() => onRemovePendingUserFile(index)} title="Remover arquivo">
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {editingUserDetails?.arquivos?.length ? (
              <ul className="file-list">
                {editingUserDetails.arquivos.map((arquivo) => (
                  <li key={arquivo.id}>
                    <FileText size={15} />
                    <a href={arquivo.url} target="_blank" rel="noreferrer">{arquivo.nomeOriginal}</a>
                    <button type="button" className="icon-button muted mini" onClick={() => void onDeleteUserArquivo(editingUserDetails, arquivo.id)} title="Excluir arquivo">
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={formData.ativo}
            onChange={(event) => setFormData((current) => ({ ...current, ativo: event.target.checked }))}
            disabled={!canAccessUsers}
          />
          Usuario ativo
        </label>

        {formError && <p className="alert error">{formError}</p>}

        <button className="primary-action" type="submit" disabled={formLoading}>
          {editingId ? <Save size={18} /> : <Plus size={18} />}
          {formLoading ? 'Salvando...' : editingId ? 'Salvar alteracoes' : 'Cadastrar usuario'}
        </button>
      </form>
    </aside>
  );
}
