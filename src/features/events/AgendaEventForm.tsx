import type { Dispatch, FormEvent, SetStateAction } from 'react';
import {
  ChevronLeft,
  Plus,
  Save,
  X,
} from 'lucide-react';
import type { AgendaMedicalUser, AgendaNotificationRecipientOptions } from '../../types';
import { formatProfileName } from '../../shared/utils/formatters';
import { Button, CheckboxField, FormPanel, IconButton, SelectField, TextField, TextareaField } from '../../shared/components/ui';
import type { AgendaFormData } from './agendaUtils';

type AgendaEventFormProps = {
  editingEventId: number | null;
  formData: AgendaFormData;
  formLoading: boolean;
  medicalUsers: AgendaMedicalUser[];
  notificationRecipientOptions: AgendaNotificationRecipientOptions | null;
  notificationRecipientsLoading: boolean;
  notificationRecipientsError: string;
  setFormData: Dispatch<SetStateAction<AgendaFormData>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onOpenCalendarSection: () => void;
  onResetForm: () => void;
  onToggleNotificationUser: (userId: number) => void;
  onToggleNotificationGroup: (groupId: number) => void;
};

export function AgendaEventForm({
  editingEventId,
  formData,
  formLoading,
  medicalUsers,
  notificationRecipientOptions,
  notificationRecipientsLoading,
  notificationRecipientsError,
  setFormData,
  onSubmit,
  onOpenCalendarSection,
  onResetForm,
  onToggleNotificationUser,
  onToggleNotificationGroup,
}: AgendaEventFormProps) {
  return (
    <FormPanel className="agenda-form-panel">
      <div className="panel-title">
        <div>
          <span className="eyebrow">{editingEventId ? 'Edição' : 'Cadastro'}</span>
          <h2>{editingEventId ? 'Editar evento' : 'Novo evento'}</h2>
        </div>
        <div className="agenda-panel-actions">
          <Button type="button" variant="ghost" onClick={onOpenCalendarSection}>
            <ChevronLeft size={17} />
            Calendário
          </Button>
          {editingEventId && (
            <IconButton label="Cancelar edição" tone="muted" onClick={onResetForm}>
              <X size={18} />
            </IconButton>
          )}
        </div>
      </div>

      <form className="stack agenda-form" onSubmit={onSubmit}>
        <div className="agenda-form-section">
          <TextField
            label="Título"
            type="text"
            value={formData.title}
            onValueChange={(value) => setFormData((current) => ({ ...current, title: value.slice(0, 255) }))}
            maxLength={255}
            required
          />

          <TextField
            label="Descrição"
            type="text"
            value={formData.description}
            onValueChange={(value) => setFormData((current) => ({ ...current, description: value.slice(0, 2000) }))}
            maxLength={2000}
          />

          <div className="two-column-fields">
            <TextField
              label="Início"
              type="date"
              value={formData.startDate}
              onValueChange={(value) => setFormData((current) => ({ ...current, startDate: value }))}
              required
            />
            <TextField
              label="Hora"
              type="time"
              value={formData.startTime}
              onValueChange={(value) => setFormData((current) => ({ ...current, startTime: value }))}
              required
            />
          </div>

          <div className="two-column-fields">
            <TextField
              label="Término"
              type="date"
              value={formData.endDate}
              onValueChange={(value) => setFormData((current) => ({ ...current, endDate: value }))}
              required
            />
            <TextField
              label="Hora"
              type="time"
              value={formData.endTime}
              onValueChange={(value) => setFormData((current) => ({ ...current, endTime: value }))}
              required
            />
          </div>

          <CheckboxField
            label="Notificar perfil médico"
            checked={formData.notifyMedicalProfile}
            onCheckedChange={(checked) => setFormData((current) => ({ ...current, notifyMedicalProfile: checked }))}
          />

          {formData.notifyMedicalProfile && (
            <SelectField
              label="Médico"
              value={formData.medicalUserId}
              onChange={(event) => setFormData((current) => ({ ...current, medicalUserId: event.target.value }))}
            >
              <option value="">Perfil médico</option>
              {medicalUsers.map((user) => (
                <option key={user.id} value={user.id}>{user.nome}</option>
              ))}
            </SelectField>
          )}

          <CheckboxField
            label="Receber lembretes"
            checked={formData.notifyUser}
            onCheckedChange={(checked) => setFormData((current) => ({ ...current, notifyUser: checked }))}
          />

          {(formData.notifyUser || formData.notifyMedicalProfile) && (
            <SelectField
              label="Intervalo de lembretes"
              value={formData.reminderPeriodMinutes}
              onChange={(event) => setFormData((current) => ({ ...current, reminderPeriodMinutes: event.target.value }))}
            >
              <option value="60">A cada 1 hora</option>
              <option value="360">A cada 6 horas</option>
              <option value="720">A cada 12 horas</option>
              <option value="1440">A cada 1 dia</option>
              <option value="2880">A cada 2 dias</option>
            </SelectField>
          )}
        </div>

        <div className="agenda-form-section agenda-notification-section">
          <TextareaField
            label="Mensagem da notificação"
            value={formData.notificationMessage}
            onValueChange={(value) => setFormData((current) => ({ ...current, notificationMessage: value.slice(0, 500) }))}
            maxLength={500}
            placeholder="Explique a reunião, evento, auditoria ou videoconferência."
            className="agenda-notification-message"
          />

          {notificationRecipientOptions ? (
            <>
              <CheckboxField
                label={notificationRecipientOptions.allRecipientsLabel}
                checked={formData.notifyAllAllowedRecipients}
                onCheckedChange={(checked) => setFormData((current) => ({ ...current, notifyAllAllowedRecipients: checked }))}
              />

              {notificationRecipientOptions.users.length > 0 && (
                <div className="agenda-recipient-group">
                  <strong>Destinatários individuais</strong>
                  <div className="agenda-recipient-list">
                    {notificationRecipientOptions.users.map((user) => (
                      <CheckboxField
                        key={user.id}
                        label={`${user.nome} (${formatProfileName(user.perfilId, user.perfilNome)})`}
                        checked={formData.notificationUserIds.includes(user.id)}
                        onCheckedChange={() => onToggleNotificationUser(user.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {notificationRecipientOptions.groups.length > 0 && (
                <div className="agenda-recipient-group">
                  <strong>Grupos médicos</strong>
                  <div className="agenda-recipient-list">
                    {notificationRecipientOptions.groups.map((group) => (
                      <CheckboxField
                        key={group.id}
                        label={`${group.nome} (${group.membrosCount})`}
                        checked={formData.notificationGroupIds.includes(group.id)}
                        onCheckedChange={() => onToggleNotificationGroup(group.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : notificationRecipientsError ? (
            <p className="agenda-empty agenda-empty-error">
              Não foi possível carregar os destinatários. {notificationRecipientsError}
            </p>
          ) : notificationRecipientsLoading ? (
            <p className="agenda-empty">Carregando destinatários disponíveis...</p>
          ) : (
            <p className="agenda-empty">Nenhum destinatário disponível.</p>
          )}
        </div>

        <Button variant="primary" type="submit" disabled={formLoading}>
          {editingEventId ? <Save size={18} /> : <Plus size={18} />}
          {formLoading ? 'Salvando...' : editingEventId ? 'Salvar evento' : 'Cadastrar evento'}
        </Button>
      </form>
    </FormPanel>
  );
}
