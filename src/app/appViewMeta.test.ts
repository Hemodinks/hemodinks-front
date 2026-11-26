import { describe, expect, it, vi } from 'vitest';
import type { AppView } from '../appTypes';
import { buildBreadcrumbItems } from './appViewMeta';

function handlers() {
  return {
    dashboard: vi.fn(),
    users: vi.fn(),
    profile: vi.fn(),
    patients: vi.fn(),
    billing: vi.fn(),
    billingHistory: vi.fn(),
    reports: vi.fn(),
    tutorials: vi.fn(),
    medicalGroups: vi.fn(),
    agenda: vi.fn(),
    settings: vi.fn(),
    clinics: vi.fn(),
  } satisfies Record<AppView, () => void>;
}

describe('buildBreadcrumbItems', () => {
  it('mantém o dashboard como raiz sem formulário', () => {
    const openModuleByView = handlers();
    const items = buildBreadcrumbItems({
      activeView: 'dashboard', moduleMode: 'list', editingId: null,
      editingPacienteId: null, patientReadOnly: false, editingGroupId: null,
      openDashboard: openModuleByView.dashboard, openModuleByView,
    });
    expect(items.map((item) => item.label)).toEqual(['Início', 'Painel inicial']);
  });

  it('oferece retorno à lista e identifica edição de paciente', () => {
    const openModuleByView = handlers();
    const items = buildBreadcrumbItems({
      activeView: 'patients', moduleMode: 'form', editingId: null,
      editingPacienteId: 42, patientReadOnly: false, editingGroupId: null,
      openDashboard: openModuleByView.dashboard, openModuleByView,
    });
    expect(items.map((item) => item.label)).toEqual(['Início', 'Pacientes', 'Editar paciente']);
    items[1].onClick?.();
    expect(openModuleByView.patients).toHaveBeenCalledOnce();
  });
});
