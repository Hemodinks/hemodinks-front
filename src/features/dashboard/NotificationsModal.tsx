import { Bell, X } from 'lucide-react';
import type { DashboardNotification } from '../../types';
import { Modal } from '../../shared/components/Modal';
import { AlertMessage, IconButton } from '../../shared/components/ui';
import { toNotificationDate } from '../../shared/utils/formatters';
import './dashboard.css';

type NotificationsModalProps = {
  notifications: DashboardNotification[];
  loading: boolean;
  error: string;
  totalCount: number;
  onOpenObservation: (pacienteId: number) => void | Promise<void>;
  onClose: () => void;
};

export function NotificationsModal({ notifications, loading, error, totalCount, onOpenObservation, onClose }: NotificationsModalProps) {
  return (
    <Modal titleId="notifications-title" className="notifications-modal" onClose={onClose}>
        <div className="panel-title">
          <div>
            <span className="eyebrow">Central de avisos</span>
            <h2 id="notifications-title">Notificações</h2>
          </div>
          <IconButton label="Fechar notificações" title="Fechar" tone="muted" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>

        <div className="notification-summary-line">
          <Bell size={17} />
          <span>{totalCount === 1 ? '1 aviso encontrado' : `${totalCount} avisos encontrados`}</span>
        </div>

        {loading && <AlertMessage type="success" icon={<Bell size={17} />}>Carregando notificações...</AlertMessage>}
        {error && <AlertMessage type="error">{error}</AlertMessage>}

        {notifications.length ? (
          <ul className="notifications-list">
            {notifications.map((notification) => {
              const date = toNotificationDate(notification.data);

              return (
                <li key={`${notification.tipo}-${notification.id}`} className={notification.dataLeitura ? 'is-read' : 'is-unread'}>
                  <span className="notification-item-icon"><Bell size={17} /></span>
                  <div className="notification-item-body">
                    <strong>{notification.titulo}</strong>
                    <p>{notification.mensagem}</p>
                    <div className="notification-meta-row">
                      {notification.nomePaciente && <span>{notification.nomePaciente}</span>}
                      {notification.autor && <span>De: {notification.autor}</span>}
                      {notification.medico && <span>Médico: {notification.medico}</span>}
                      {notification.procedimento && <span>Procedimento: {notification.procedimento}</span>}
                      {date && <span>{date}</span>}
                      <span className={`notification-read-status ${notification.dataLeitura ? 'is-read' : 'is-unread'}`}>
                        {notification.dataLeitura ? 'Lida' : 'Não lida'}
                      </span>
                    </div>
                    {notification.tipo === 'ObservacaoPaciente' && notification.pacienteId > 0 && (
                      <div className="notification-actions">
                        <button
                          type="button"
                          className="ghost-button notification-open-thread-action"
                          onClick={() => void onOpenObservation(notification.pacienteId)}
                        >
                          Abrir conversa
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : !loading && !error ? (
          <p className="empty-row">Nenhuma notificação para este usuário.</p>
        ) : null}
      </Modal>
  );
}
