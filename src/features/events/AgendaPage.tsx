import { CalendarDays, CheckCircle2, Plus, RefreshCw } from 'lucide-react';
import type { AuthSession } from '../../types';
import { AlertMessage, Button, DataPanel, IconButton, ToastMessage } from '../../shared/components/ui';
import { AgendaCalendarSection } from './AgendaCalendarSection';
import { AgendaEventForm } from './AgendaEventForm';
import { useAgendaController } from './useAgendaController';
import './events.css';

type AgendaPageProps = { session: AuthSession; isAdmin: boolean; isMedical: boolean };
export { buildEmptyForm } from './agendaUtils';

export function AgendaPage({ session, isAdmin, isMedical }: AgendaPageProps) {
  const agenda = useAgendaController({ session, isMedical });
  return <section className="workspace agenda-workspace" data-tour="agenda-overview">
    <DataPanel className="agenda-panel">
      <div className="data-header agenda-header">
        <div><span className="eyebrow">Agenda e notificações</span><h2>Agenda e notificações</h2>
          <span className="agenda-subtitle">{agenda.pendingEventsCount} eventos ativos</span></div>
        <div className="table-tools agenda-tools">
          <Button type="button" variant="ghost" className={`agenda-section-tab ${agenda.activeSection === 'calendario' ? 'is-active' : ''}`}
            onClick={agenda.openCalendarSection} aria-pressed={agenda.activeSection === 'calendario'}><CalendarDays size={17} />Calendário</Button>
          <Button type="button" variant="ghost" className={`agenda-section-tab agenda-new-event-button ${agenda.activeSection === 'cadastro' ? 'is-active' : ''}`}
            data-tour="agenda-new" onClick={agenda.openCadastroSection} aria-pressed={agenda.activeSection === 'cadastro'}><Plus size={17} />Novo evento</Button>
          <Button onClick={agenda.handleToday}><CalendarDays size={17} />Hoje</Button>
          <IconButton label="Atualizar agenda" onClick={() => void agenda.loadEvents()}><RefreshCw size={18} /></IconButton>
        </div>
      </div>
      {agenda.successMessage && <ToastMessage type="success" icon={<CheckCircle2 size={17} />}>{agenda.successMessage}</ToastMessage>}
      {agenda.error && <AlertMessage type="error">{agenda.error}</AlertMessage>}
      {agenda.holidayError && <AlertMessage type="warning">{agenda.holidayError}</AlertMessage>}
      {agenda.activeSection === 'calendario' ? <AgendaCalendarSection
        visibleMonth={agenda.visibleMonth} days={agenda.days} events={agenda.events} selectedDate={agenda.selectedDate}
        selectedEvents={agenda.selectedEvents} selectedHoliday={agenda.selectedHoliday} holidayByDate={agenda.holidayByDate}
        todayKey={agenda.todayKey} loading={agenda.loading} holidayLoading={agenda.holidayLoading} isAdmin={isAdmin}
        currentUserId={session.user.id} onPreviousMonth={agenda.handlePreviousMonth} onNextMonth={agenda.handleNextMonth}
        onSelectDate={agenda.handleSelectDate} onOpenDraftForSelectedDate={agenda.openDraftForSelectedDate}
        onComplete={agenda.handleComplete} onEdit={agenda.handleEdit} onDelete={agenda.handleDelete}
      /> : <AgendaEventForm
        editingEventId={agenda.editingEventId} formData={agenda.formData} formLoading={agenda.formLoading}
        medicalUsers={agenda.medicalUsers} notificationRecipientOptions={agenda.notificationRecipientOptions}
        notificationRecipientsLoading={agenda.notificationRecipientsLoading} notificationRecipientsError={agenda.notificationRecipientsError}
        setFormData={agenda.setFormData} onSubmit={agenda.handleSubmit} onOpenCalendarSection={agenda.openCalendarSection}
        onResetForm={() => agenda.resetForm()} onToggleNotificationUser={agenda.toggleNotificationUser}
        onToggleNotificationGroup={agenda.toggleNotificationGroup}
      />}
    </DataPanel>
    {agenda.confirmationDialog}
  </section>;
}
