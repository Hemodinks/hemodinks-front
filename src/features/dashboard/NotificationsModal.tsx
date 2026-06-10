import { Bell, X } from 'lucide-react';
import type { DashboardNotification } from '../../types';
import { Modal } from '../../shared/components/Modal';
import { toNotificationDate } from '../../shared/utils/formatters';

type NotificationsModalProps = {
  notifications: DashboardNotification[];
  loading: boolean;
  error: string;
  totalCount: number;
  onClose: () => void;
};

export function NotificationsModal({ notifications, loading, error, totalCount, onClose }: NotificationsModalProps) {
  return (
    <Modal titleId="notifications-title" className="notifications-modal" onClose={onClose}>
        <div className="panel-title">
          <div>
            <span className="eyebrow">Central de avisos</span>
            <h2 id="notifications-title">Notificacoes</h2>
          </div>
          <button type="button" className="icon-button muted" onClick={onClose} title="Fechar" aria-label="Fechar notificacoes">
            <X size={18} />
          </button>
        </div>

        <div className="notification-summary-line">
          <Bell size={17} />
          <span>{totalCount === 1 ? '1 aviso encontrado' : `${totalCount} avisos encontrados`}</span>
        </div>

        {loading && <p className="alert success"><Bell size={17} />Carregando notificacoes...</p>}
        {error && <p className="alert error">{error}</p>}

        {notifications.length ? (
          <ul className="notifications-list">
            {notifications.map((notification) => {
              const date = toNotificationDate(notification.data);

              return (
                <li key={`${notification.tipo}-${notification.id}`}>
                  <span className="notification-item-icon"><Bell size={17} /></span>
                  <div className="notification-item-body">
                    <strong>{notification.titulo}</strong>
                    <p>{notification.mensagem}</p>
                    <div className="notification-meta-row">
                      {notification.nomePaciente && <span>{notification.nomePaciente}</span>}
                      {notification.medico && <span>Medico: {notification.medico}</span>}
                      {notification.procedimento && <span>Procedimento: {notification.procedimento}</span>}
                      {date && <span>{date}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : !loading && !error ? (
          <p className="empty-row">Nenhuma notificacao para este usuario.</p>
        ) : null}
      </Modal>
  );
}
