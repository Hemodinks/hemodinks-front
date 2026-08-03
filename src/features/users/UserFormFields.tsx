import { type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { FileText, FileUp, ImagePlus, Trash2, X } from 'lucide-react';
import { DateInput } from '../../shared/components/DateInput';
import { SecureFileDownloadButton } from '../../shared/components/SecureFileDownloadButton';
import { UserAvatar } from '../../shared/components/UserAvatar';
import { Button, IconButton, SelectField, TextField } from '../../shared/components/ui';
import {
  BRAZIL_UF_OPTIONS,
  formatPhoneInput,
  isMedicalProfileId,
  MAX_CRM_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PHONE_LENGTH,
  PATIENT_PROFILE_ID,
  PROFILE_OPTIONS,
  USER_PROFILE_OPTIONS,
} from '../../shared/utils/formatters';
import type { User, UserFormData } from './userTypes';
import { useUserDocuments } from './useUserDocuments';

type FormStateProps = {
  formData: UserFormData;
  isFormBusy: boolean;
  setFormData: Dispatch<SetStateAction<UserFormData>>;
};

type UserProfilePhotoFieldProps = Pick<FormStateProps, 'formData' | 'isFormBusy'> & {
  editingId: number | null;
  photoInputKey: number;
  sessionToken: string;
  onProfilePhotoChange: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onRemoveProfilePhoto: () => void;
};

export function UserProfilePhotoField({
  editingId,
  formData,
  isFormBusy,
  onProfilePhotoChange,
  onRemoveProfilePhoto,
  photoInputKey,
  sessionToken,
}: UserProfilePhotoFieldProps) {
  return (
    <div className="profile-photo-field">
      <label className="field-label" htmlFor="profile-photo-input">
        Foto do perfil
      </label>
      <div className="photo-uploader">
        <UserAvatar
          userId={editingId ?? undefined}
          name={formData.nome || 'Usuário'}
          photo={formData.fotoPerfil}
          authToken={sessionToken}
          size="lg"
        />
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
        disabled={isFormBusy}
        onChange={(event) => void onProfilePhotoChange(event)}
      />
      <span className="file-hint">PNG, JPG ou WEBP até 1 MB.</span>
    </div>
  );
}

type UserIdentityFieldsProps = FormStateProps & {
  canAccessUsers: boolean;
  canAssignAllProfiles: boolean;
  canUseUserForm: boolean;
};

export function UserIdentityFields({
  canAccessUsers,
  canAssignAllProfiles,
  canUseUserForm,
  formData,
  isFormBusy,
  setFormData,
}: UserIdentityFieldsProps) {
  return (
    <>
      <div className="two-column-fields user-form-columns">
        <div className="user-form-column">
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
            disabled={isFormBusy || !canAccessUsers}
            required
          >
            {(canAssignAllProfiles ? PROFILE_OPTIONS : USER_PROFILE_OPTIONS).map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.nome}
              </option>
            ))}
          </SelectField>

          <TextField
            label="Nome completo"
            type="text"
            value={formData.nome}
            onValueChange={(value) =>
              setFormData((current) => ({ ...current, nome: value.slice(0, MAX_NAME_LENGTH) }))
            }
            maxLength={MAX_NAME_LENGTH}
            disabled={isFormBusy}
            required
          />

          <div className="user-form-date-field">
            <DateInput
              id="user-birth-date"
              label="Data de nascimento"
              value={formData.dataNascimento}
              onChange={(value) =>
                setFormData((current) => ({ ...current, dataNascimento: value }))
              }
              disabled={isFormBusy}
            />
          </div>
        </div>

        <div className="user-form-column">
          <TextField
            label="Email"
            type="email"
            value={formData.email}
            onValueChange={(value) =>
              setFormData((current) => ({ ...current, email: value.slice(0, MAX_EMAIL_LENGTH) }))
            }
            maxLength={MAX_EMAIL_LENGTH}
            disabled={isFormBusy || (!canAccessUsers && formData.perfilId === PATIENT_PROFILE_ID)}
            required
          />

          <TextField
            label="Telefone"
            type="tel"
            value={formData.telefone}
            onFocus={() =>
              setFormData((current) => ({
                ...current,
                telefone: formatPhoneInput(current.telefone),
              }))
            }
            onValueChange={(value) =>
              setFormData((current) => ({ ...current, telefone: formatPhoneInput(value) }))
            }
            inputMode="numeric"
            maxLength={MAX_PHONE_LENGTH}
            placeholder="+55 (81) 99999-9999"
            disabled={isFormBusy}
            required
          />
        </div>
      </div>

      {isMedicalProfileId(formData.perfilId) && (
        <div className="two-column-fields medical-registration-fields">
          <TextField
            label="CRM"
            type="text"
            value={formData.crm}
            onValueChange={(value) =>
              setFormData((current) => ({ ...current, crm: value.slice(0, MAX_CRM_LENGTH) }))
            }
            maxLength={MAX_CRM_LENGTH}
            placeholder="Ex.: 12345"
            disabled={isFormBusy || !canUseUserForm}
            required
          />

          <SelectField
            label="UF do CRM"
            value={formData.crmUf}
            onChange={(event) =>
              setFormData((current) => ({ ...current, crmUf: event.target.value }))
            }
            disabled={isFormBusy || !canUseUserForm}
            required
          >
            <option value="">Selecione</option>
            {BRAZIL_UF_OPTIONS.map((uf) => (
              <option key={uf} value={uf}>
                {uf}
              </option>
            ))}
          </SelectField>
        </div>
      )}
    </>
  );
}

type UserMedicalDocumentsFieldProps = Pick<FormStateProps, 'isFormBusy'> & {
  editingUserDetails: User | null;
  pendingUserFiles: File[];
  sessionToken: string;
  userFileInputKey: number;
  onDeleteUserArquivo: (user: User, arquivoId: number) => void | Promise<void>;
  onRemovePendingUserFile: (index: number) => void;
  onUserFilesChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function UserMedicalDocumentsField({
  editingUserDetails,
  isFormBusy,
  onDeleteUserArquivo,
  onRemovePendingUserFile,
  onUserFilesChange,
  pendingUserFiles,
  sessionToken,
  userFileInputKey,
}: UserMedicalDocumentsFieldProps) {
  const userDocuments = useUserDocuments(sessionToken);

  return (
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
        aria-label="Documentos do médico"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx,.txt,.csv,.ppt,.pptx"
        multiple
        disabled={isFormBusy}
        onChange={onUserFilesChange}
      />
      <span className="file-hint">PDF, Office, imagens, TXT ou CSV até 10 MB.</span>

      {pendingUserFiles.length > 0 && (
        <ul className="file-list">
          {pendingUserFiles.map((file, index) => (
            <li key={`${file.name}-${index}`}>
              <FileText size={15} />
              <span>{file.name}</span>
              <IconButton
                label="Remover arquivo"
                tone="muted"
                className="mini"
                onClick={() => onRemovePendingUserFile(index)}
              >
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
              <SecureFileDownloadButton
                fileName={arquivo.nomeOriginal}
                label={arquivo.nomeOriginal}
                loadFile={() => userDocuments.download(editingUserDetails.id, arquivo.id)}
              />
              <IconButton
                label="Excluir arquivo"
                tone="muted"
                className="mini"
                onClick={() => void onDeleteUserArquivo(editingUserDetails, arquivo.id)}
              >
                <Trash2 size={14} />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
