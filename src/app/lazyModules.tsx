import { lazy } from 'react';

export const NotificationsModal = lazy(() => import('../features/dashboard/NotificationsModal').then((module) => ({ default: module.NotificationsModal })));
export const AgendaPage = lazy(() => import('../features/events/AgendaPage').then((module) => ({ default: module.AgendaPage })));
export const BillingPage = lazy(() => import('../features/billing/BillingPage').then((module) => ({ default: module.BillingPage })));
export const ClinicsPage = lazy(() => import('../features/clinics/ClinicsPage').then((module) => ({ default: module.ClinicsPage })));
export const MedicalGroupsPage = lazy(() => import('../features/medicalGroups/MedicalGroupsPage').then((module) => ({ default: module.MedicalGroupsPage })));
export const SystemSettingsPage = lazy(() => import('../features/settings/SystemSettingsPage').then((module) => ({ default: module.SystemSettingsPage })));
export const CbhpmLookupModal = lazy(() => import('../features/patients/CbhpmLookupModal').then((module) => ({ default: module.CbhpmLookupModal })));
export const PatientInfoModal = lazy(() => import('../features/patients/PatientModals').then((module) => ({ default: module.PatientInfoModal })));
export const PatientFilesModal = lazy(() => import('../features/patients/PatientModals').then((module) => ({ default: module.PatientFilesModal })));
export const PatientObservacoesModal = lazy(() => import('../features/patients/PatientObservacoesModal').then((module) => ({ default: module.PatientObservacoesModal })));
export const PatientsPage = lazy(() => import('../features/patients/PatientsPage').then((module) => ({ default: module.PatientsPage })));
export const UsersPage = lazy(() => import('../features/users/UsersPage').then((module) => ({ default: module.UsersPage })));
export const PasswordModal = lazy(() => import('../shared/components/PasswordModal').then((module) => ({ default: module.PasswordModal })));

export function ModuleFallback() {
  return (
    <section className="workspace" aria-live="polite">
      <section className="data-panel">
        <p className="agenda-empty" role="status">Carregando modulo...</p>
      </section>
    </section>
  );
}
