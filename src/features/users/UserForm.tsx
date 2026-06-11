import { type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { FileText, FileUp, ImagePlus, Plus, Save, Trash2, X } from 'lucide-react';
import type { User, UserFormData } from '../../types';
import { DateInput } from '../../shared/components/DateInput';
import { AlertMessage, Button, CheckboxField, FormPanel, IconButton, SelectField, TextField } from '../../shared/components/ui';
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
    <FormPanel className="module-form-panel">
      <div className="panel-title">
        <div>
          <span className="eyebrow">{canAccessUsers ? editingId ? 'Edicao' : 'Cadastro' : 'Perfil'}</span>
          <h2>{canAccessUsers ? editingId ? 'Editar usuario' : 'Novo usuario' : 'Meu cadastro'}</h2>
        </div>
        <div className="panel-title-actions">
          {canAccessUsers && !editingId && <span className="password-chip">Senha: {DEFAULT_PASSWORD}</span>}
          <IconButton label="Voltar para lista" tone="muted" onClick={onClose}>
            <X size={18} />
          </IconButton>
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
                <Button variant="danger-ghost" onClick={onRemoveProfilePhoto}>
                  <Trash2 size={17} />
                  Remover
                </Button>
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

        <TextField
          label="Nome completo"
          type="text"
          value={formData.nome}
          onValueChange={(value) => setFormData((current) => ({ ...current, nome: value.slice(0, MAX_NAME_LENGTH) }))}
          maxLength={MAX_NAME_LENGTH}
          required
        />

        <TextField
          label="Email"
          type="email"
          value={formData.email}
          onValueChange={(value) => setFormData((current) => ({ ...current, email: value.slice(0, MAX_EMAIL_LENGTH) }))}
          maxLength={MAX_EMAIL_LENGTH}
          required
        />

        <TextField
          label="Telefone"
          type="tel"
          value={formData.telefone}
          onFocus={() => setFormData((current) => ({ ...current, telefone: formatPhoneInput(current.telefone) }))}
          onValueChange={(value) => setFormData((current) => ({ ...current, telefone: formatPhoneInput(value) }))}
          inputMode="numeric"
          maxLength={MAX_PHONE_LENGTH}
          placeholder="+55 (81) 99999-9999"
          required
        />

        <TextField
          label="CPF"
          type="text"
          value={formData.cpf}
          onValueChange={(value) => setFormData((current) => ({ ...current, cpf: formatCpfInput(value) }))}
          inputMode="numeric"
          maxLength={MAX_CPF_LENGTH}
          placeholder="000.000.000-00"
          required
        />

        <DateInput
          id="user-birth-date"
          label="Data de nascimento"
          value={formData.dataNascimento}
          onChange={(value) => setFormData((current) => ({ ...current, dataNascimento: value }))}
          required
        />

        <SelectField
          label="Perfil"
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
        </SelectField>

        {isMedicalProfileId(formData.perfilId) && (
          <div className="two-column-fields medical-registration-fields">
            <TextField
              label="CRM"
              type="text"
              value={formData.crm}
              onValueChange={(value) => setFormData((current) => ({ ...current, crm: value.slice(0, MAX_CRM_LENGTH) }))}
              maxLength={MAX_CRM_LENGTH}
              placeholder="Ex.: 12345"
              disabled={!canUseUserForm}
              required
            />

            <SelectField
              label="UF do CRM"
              value={formData.crmUf}
              onChange={(event) => setFormData((current) => ({ ...current, crmUf: event.target.value }))}
              disabled={!canUseUserForm}
              required
            >
                <option value="">Selecione</option>
                {BRAZIL_UF_OPTIONS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
            </SelectField>
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
                    <IconButton label="Remover arquivo" tone="muted" className="mini" onClick={() => onRemovePendingUserFile(index)}>
                      <X size={14} />
                    </IconButton>
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
                    <IconButton label="Excluir arquivo" tone="muted" className="mini" onClick={() => void onDeleteUserArquivo(editingUserDetails, arquivo.id)}>
                      <Trash2 size={14} />
                    </IconButton>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        <CheckboxField
          label="Usuario ativo"
          checked={formData.ativo}
          onCheckedChange={(checked) => setFormData((current) => ({ ...current, ativo: checked }))}
          disabled={!canAccessUsers}
        />

        {formError && <AlertMessage type="error">{formError}</AlertMessage>}

        <Button variant="primary" type="submit" disabled={formLoading}>
          {editingId ? <Save size={18} /> : <Plus size={18} />}
          {formLoading ? 'Salvando...' : editingId ? 'Salvar alteracoes' : 'Cadastrar usuario'}
        </Button>
      </form>
    </FormPanel>
  );
}
