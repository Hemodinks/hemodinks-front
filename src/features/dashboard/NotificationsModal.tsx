import { Bell, X } from 'lucide-react';
import type { DashboardNotification } from '../../types';
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
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel notifications-modal" role="dialog" aria-modal="true" aria-labelledby="notifications-title">
        <div className="panel-title">
          <div>
            <span className="eyebrow">Central de avisos</span>
            <h2 id="notifications-title">Notificacoes</h2>
          </div>
          <button type="button" className="icon-button muted" onClick={onClose} title="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="notification-summary-line">
          <Bell size={17} />
          <span>{totalCount === 1 ? '1 pendencia encontrada' : `${totalCount} pendencias encontradas`}</span>
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
                      <span>{notification.nomePaciente}</span>
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
      </section>
    </div>
  );
}
