export type DashboardModuleId =
  | 'users'
  | 'profile'
  | 'patients'
  | 'controller'
  | 'clinics'
  | 'medicalGroups'
  | 'agenda'
  | 'settings';

const DASHBOARD_MODULE_ORDER_KEY = 'hemodinks.dashboard.module-order';
const DASHBOARD_DEFAULT_MODULE_ORDER: DashboardModuleId[] = [
  'users',
  'profile',
  'patients',
  'controller',
  'clinics',
  'medicalGroups',
  'agenda',
  'settings',
];

export function readStoredDashboardModuleOrder() {
  if (typeof window === 'undefined') return [...DASHBOARD_DEFAULT_MODULE_ORDER];

  try {
    const rawValue = localStorage.getItem(DASHBOARD_MODULE_ORDER_KEY);
    if (!rawValue) return [...DASHBOARD_DEFAULT_MODULE_ORDER];

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [...DASHBOARD_DEFAULT_MODULE_ORDER];

    return parsed.filter((value): value is DashboardModuleId =>
      DASHBOARD_DEFAULT_MODULE_ORDER.includes(value as DashboardModuleId),
    );
  } catch {
    return [...DASHBOARD_DEFAULT_MODULE_ORDER];
  }
}

export function persistDashboardModuleOrder(order: DashboardModuleId[]) {
  localStorage.setItem(DASHBOARD_MODULE_ORDER_KEY, JSON.stringify(order));
}

export function normalizeDashboardModuleOrder(
  currentOrder: DashboardModuleId[],
  visibleModuleIds: DashboardModuleId[],
) {
  return [
    ...currentOrder.filter((moduleId) => visibleModuleIds.includes(moduleId)),
    ...visibleModuleIds.filter((moduleId) => !currentOrder.includes(moduleId)),
  ];
}

export function sameDashboardModuleOrder(left: DashboardModuleId[], right: DashboardModuleId[]) {
  return left.length === right.length && left.every((moduleId, index) => moduleId === right[index]);
}

export function reorderDashboardModuleOrder(
  currentOrder: DashboardModuleId[],
  draggedModuleId: DashboardModuleId,
  targetModuleId: DashboardModuleId,
) {
  const nextOrder = [...currentOrder];
  const draggedIndex = nextOrder.indexOf(draggedModuleId);
  const targetIndex = nextOrder.indexOf(targetModuleId);
  if (draggedIndex < 0 || targetIndex < 0 || draggedIndex === targetIndex) return currentOrder;

  nextOrder.splice(draggedIndex, 1);
  nextOrder.splice(targetIndex, 0, draggedModuleId);
  return nextOrder;
}
