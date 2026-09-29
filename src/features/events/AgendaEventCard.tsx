import { Bell, Check, Clock, Pencil, Trash2 } from 'lucide-react';
import type { AgendaEvent } from '../../types';
import { IconButton } from '../../shared/components/ui';
import { eventTime } from './agendaMonth';
import { formatDateTime, toDateKey, allDayEventLabel } from './agendaUtils';

export type AgendaEventActions = {
  isAdmin: boolean; currentUserId: number;
  onComplete: (event: AgendaEvent) => void;
  onEdit: (event: AgendaEvent) => void;
  onDelete: (event: AgendaEvent) => void;
};
export function AgendaEventCard({ agendaEvent, isAdmin, currentUserId, onComplete, onEdit, onDelete, idSuffix }: AgendaEventActions & { agendaEvent: AgendaEvent; idSuffix?: string }) {
  const canManage = isAdmin || agendaEvent.userId === currentUserId;
  return (
    <article className={`agenda-event-item ${agendaEvent.isCompleted ? 'completed' : ''}`} key={agendaEvent.id} id={`agenda-event-${agendaEvent.id}${idSuffix ? `-${idSuffix}` : ''}`} tabIndex={-1}>
      <div className="agenda-event-main">
        <span className="agenda-event-time">
          <Clock size={15} />
          {agendaEvent.isAllDay ? allDayEventLabel(agendaEvent) : toDateKey(new Date(agendaEvent.start)) === toDateKey(new Date(agendaEvent.end)) ? `${eventTime(agendaEvent.start)} - ${eventTime(agendaEvent.end)}` : `${formatDateTime(agendaEvent.start)} - ${formatDateTime(agendaEvent.end)}`}
        </span>
        <strong>{agendaEvent.title}</strong>
        {agendaEvent.userName && <span className="agenda-event-owner">Responsável: {agendaEvent.userName}</span>}
        {agendaEvent.description && <p>{agendaEvent.description}</p>}
        <div className="agenda-event-meta">
          {!agendaEvent.isCompleted && (agendaEvent.notifyUser || agendaEvent.notifyMedicalProfile) && <span><Bell size={14} /> Lembrete ativo</span>}
          {agendaEvent.notifyMedicalProfile && <span><Bell size={14} /> {agendaEvent.medicalUserName || 'Perfil médico'}</span>}
          {agendaEvent.isCompleted && <span><Check size={14} /> Concluido</span>}
        </div>
      </div>
      {canManage && (
        <div className="agenda-event-actions">
          {!agendaEvent.isCompleted && (
            <IconButton label="Concluir" tone="muted" onClick={() => onComplete(agendaEvent)}>
              <Check size={17} />
            </IconButton>
          )}
          <IconButton label="Editar" tone="muted" onClick={() => onEdit(agendaEvent)}>
            <Pencil size={17} />
          </IconButton>
          <IconButton label="Excluir" tone="danger" onClick={() => onDelete(agendaEvent)}>
            <Trash2 size={17} />
          </IconButton>
        </div>
      )}
    </article>
  );
}
