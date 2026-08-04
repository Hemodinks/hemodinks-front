import { type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { Plus, Save, X } from 'lucide-react';
import {
  AlertMessage,
  Button,
  CheckboxField,
  FormPanel,
  IconButton,
} from '../../shared/components/ui';
import { MEDICAL_PROFILE_ID } from '../../shared/utils/formatters';
import {
  UserIdentityFields,
  UserMedicalDocumentsField,
  UserProfilePhotoField,
} from './UserFormFields';
import type { User, UserFormData } from './userTypes';

type UserFormProps = {
  canAccessUsers: boolean;
  canUseUserForm: boolean;
  canAssignAllProfiles: boolean;
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

export function UserForm(props: UserFormProps) {
  const isFormBusy = props.formLoading;

  return (
    <FormPanel className="module-form-panel">
      <div className="panel-title">
        <div>
          <span className="eyebrow">
            {props.canAccessUsers ? (props.editingId ? 'Edição' : 'Cadastro') : 'Perfil'}
          </span>
          <h2>
            {props.canAccessUsers
              ? props.editingId
                ? 'Editar usuário'
                : 'Novo usuário'
              : 'Meu cadastro'}
          </h2>
        </div>
        <div className="panel-title-actions">
          <IconButton label="Voltar para lista" tone="muted" onClick={props.onClose}>
            <X size={18} />
          </IconButton>
        </div>
      </div>

      <form className="stack module-form-grid" onSubmit={props.onSubmit} aria-busy={isFormBusy}>
        <UserProfilePhotoField {...props} isFormBusy={isFormBusy} />

        <UserIdentityFields {...props} isFormBusy={isFormBusy} />

        {props.formData.perfilId === MEDICAL_PROFILE_ID && props.canUseUserForm && (
          <UserMedicalDocumentsField {...props} isFormBusy={isFormBusy} />
        )}

        <CheckboxField
          label="Usuário ativo"
          checked={props.formData.ativo}
          onCheckedChange={(checked) =>
            props.setFormData((current) => ({ ...current, ativo: checked }))
          }
          disabled={isFormBusy || !props.canAccessUsers}
        />

        {props.formError && <AlertMessage type="error">{props.formError}</AlertMessage>}

        <Button variant="primary" type="submit" disabled={props.formLoading}>
          {props.editingId ? <Save size={18} /> : <Plus size={18} />}
          {props.formLoading
            ? 'Salvando...'
            : props.editingId
              ? 'Salvar alterações'
              : 'Cadastrar usuário'}
        </Button>
      </form>
    </FormPanel>
  );
}
