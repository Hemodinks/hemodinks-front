import { type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { Plus, Save, ShieldPlus, X } from 'lucide-react';
import type { MedicalGroupFormData, MedicalUserOption } from '../../types';
import { AlertMessage, Button, CheckboxField, FormPanel, IconButton, TextField } from '../../shared/components/ui';
import { MAX_NAME_LENGTH } from '../../shared/utils/formatters';

type MedicalGroupFormProps = {
  editingGroupId: number | null;
  formData: MedicalGroupFormData;
  formError: string;
  formLoading: boolean;
  availableMedicalUsers: MedicalUserOption[];
  setFormData: Dispatch<SetStateAction<MedicalGroupFormData>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function MedicalGroupForm({
  editingGroupId,
  formData,
  formError,
  formLoading,
  availableMedicalUsers,
  setFormData,
  onClose,
  onSubmit,
}: MedicalGroupFormProps) {
  const toggleMember = (userId: number) => {
    setFormData((current) => ({
      ...current,
      medicoUserIds: current.medicoUserIds.includes(userId)
        ? current.medicoUserIds.filter((currentUserId) => currentUserId !== userId)
        : [...current.medicoUserIds, userId],
    }));
  };

  return (
    <FormPanel className="module-form-panel">
      <div className="panel-title">
        <div>
          <span className="eyebrow">{editingGroupId ? 'Edicao' : 'Cadastro'}</span>
          <h2>{editingGroupId ? 'Editar grupo medico' : 'Novo grupo medico'}</h2>
        </div>
        <div className="panel-title-actions">
          <IconButton label="Voltar para lista" tone="muted" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
      </div>

      <form className="stack module-form-grid" onSubmit={onSubmit}>
        <fieldset className="form-fieldset" disabled={formLoading}>
          <TextField
            label="Nome do grupo"
            type="text"
            value={formData.nome}
            onValueChange={(value) => setFormData((current) => ({ ...current, nome: value.slice(0, MAX_NAME_LENGTH) }))}
            maxLength={MAX_NAME_LENGTH}
            required
          />

          <CheckboxField
            label="Grupo ativo"
            checked={formData.ativo}
            onCheckedChange={(checked) => setFormData((current) => ({ ...current, ativo: checked }))}
          />

          <section className="medical-group-members-field">
            <div className="medical-group-members-header">
              <span className="field-label">Médicos do grupo</span>
              <span className="medical-group-members-count">{formData.medicoUserIds.length} selecionados</span>
            </div>

            {availableMedicalUsers.length ? (
              <div className="medical-group-members-grid">
                {availableMedicalUsers.map((user) => {
                  const checked = formData.medicoUserIds.includes(user.id);

                  return (
                    <label key={user.id} className={`medical-group-member-card ${checked ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMember(user.id)}
                      />
                      <span className="medical-group-member-icon" aria-hidden="true">
                        <ShieldPlus size={16} />
                      </span>
                      <span className="medical-group-member-name">{user.nome}</span>
                      <span className="medical-group-member-email">{user.email}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="file-hint">Nenhum medico cadastrado para vincular ao grupo.</p>
            )}
          </section>
        </fieldset>

        {formError && <AlertMessage type="error">{formError}</AlertMessage>}

        <Button variant="primary" type="submit" disabled={formLoading}>
          {editingGroupId ? <Save size={18} /> : <Plus size={18} />}
          {formLoading ? 'Salvando...' : editingGroupId ? 'Salvar grupo medico' : 'Cadastrar grupo medico'}
        </Button>
      </form>
    </FormPanel>
  );
}
