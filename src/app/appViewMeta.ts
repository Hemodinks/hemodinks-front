import type { AppView } from '../appTypes';

type FormBreadcrumbOptions = {
  activeView: AppView;
  editingId: number | null;
  editingPacienteId: number | null;
  patientReadOnly: boolean;
  editingGroupId: number | null;
};

export function getAppTitle(activeView: AppView) {
  return activeView === 'dashboard'
    ? 'Painel inicial'
    : activeView === 'users' ? 'Usuários'
      : activeView === 'profile' ? 'Meu cadastro'
        : activeView === 'patients' ? 'Pacientes'
          : activeView === 'billing' ? 'Faturamento médico'
            : activeView === 'medicalGroups' ? 'Grupos médicos'
              : activeView === 'settings' ? 'Configuração do sistema'
                : activeView === 'clinics' ? 'Clínicas' : 'Agenda e notificações';
}

export function getActiveModuleLabel(activeView: AppView) {
  return activeView === 'users'
    ? 'Usuários'
    : activeView === 'profile' ? 'Meu cadastro'
      : activeView === 'patients' ? 'Pacientes'
        : activeView === 'billing' ? 'Faturamento médico'
          : activeView === 'medicalGroups' ? 'Grupos médicos'
            : activeView === 'settings' ? 'Configuração do sistema'
              : activeView === 'clinics' ? 'Clínicas' : 'Agenda e notificações';
}

export function getFormBreadcrumbLabel({
  activeView,
  editingId,
  editingPacienteId,
  patientReadOnly,
  editingGroupId,
}: FormBreadcrumbOptions) {
  return activeView === 'users'
    ? editingId ? 'Editar usuário' : 'Novo usuário'
    : activeView === 'profile' ? 'Meu cadastro'
      : activeView === 'patients' ? editingPacienteId ? patientReadOnly ? 'Visualizar paciente' : 'Editar paciente' : 'Novo paciente'
        : activeView === 'medicalGroups' ? editingGroupId ? 'Editar grupo médico' : 'Novo grupo médico'
          : activeView === 'settings' ? 'Configuração do sistema'
            : 'Agenda e notificações';
}
