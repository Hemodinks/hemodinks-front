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
    : activeView === 'users' ? 'Usuarios'
      : activeView === 'profile' ? 'Meu cadastro'
        : activeView === 'patients' ? 'Pacientes'
          : activeView === 'billing' ? 'Faturamento medico'
            : activeView === 'medicalGroups' ? 'Grupos medicos'
              : activeView === 'settings' ? 'Configuracao do sistema' : 'Agenda e notificacoes';
}

export function getActiveModuleLabel(activeView: AppView) {
  return activeView === 'users'
    ? 'Usuarios'
    : activeView === 'profile' ? 'Meu cadastro'
      : activeView === 'patients' ? 'Pacientes'
        : activeView === 'billing' ? 'Faturamento medico'
          : activeView === 'medicalGroups' ? 'Grupos medicos'
            : activeView === 'settings' ? 'Configuracao do sistema' : 'Agenda e notificacoes';
}

export function getFormBreadcrumbLabel({
  activeView,
  editingId,
  editingPacienteId,
  patientReadOnly,
  editingGroupId,
}: FormBreadcrumbOptions) {
  return activeView === 'users'
    ? editingId ? 'Editar usuario' : 'Novo usuario'
    : activeView === 'profile' ? 'Meu cadastro'
      : activeView === 'patients' ? editingPacienteId ? patientReadOnly ? 'Visualizar paciente' : 'Editar paciente' : 'Novo paciente'
        : activeView === 'medicalGroups' ? editingGroupId ? 'Editar grupo medico' : 'Novo grupo medico'
          : activeView === 'settings' ? 'Configuracao do sistema'
            : 'Agenda e notificacoes';
}
