import { type DragEvent, useEffect, useState } from 'react';
import { ArrowRight, GripVertical } from 'lucide-react';
import {
  normalizeDashboardModuleOrder,
  persistDashboardModuleOrder,
  readStoredDashboardModuleOrder,
  reorderDashboardModuleOrder,
  sameDashboardModuleOrder,
  type DashboardModuleId,
} from './dashboardModuleOrder';
import type { DashboardModule } from './dashboardTypes';

type DashboardModuleGridProps = {
  modules: DashboardModule[];
};

export function DashboardModuleGrid({ modules }: DashboardModuleGridProps) {
  const [moduleOrder, setModuleOrder] = useState<DashboardModuleId[]>(() =>
    readStoredDashboardModuleOrder(),
  );
  const [draggedModuleId, setDraggedModuleId] = useState<DashboardModuleId | null>(null);
  const [dropTargetModuleId, setDropTargetModuleId] = useState<DashboardModuleId | null>(null);
  const visibleModuleIds = modules.map((module) => module.id);
  const normalizedModuleOrder = normalizeDashboardModuleOrder(moduleOrder, visibleModuleIds);
  const orderedModules = [...modules].sort(
    (left, right) =>
      normalizedModuleOrder.indexOf(left.id) - normalizedModuleOrder.indexOf(right.id),
  );
  const visibleModuleIdsKey = visibleModuleIds.join('|');
  const normalizedModuleOrderKey = normalizedModuleOrder.join('|');

  useEffect(() => {
    if (!sameDashboardModuleOrder(moduleOrder, normalizedModuleOrder)) {
      setModuleOrder(normalizedModuleOrder);
    }
  }, [moduleOrder, normalizedModuleOrder, visibleModuleIdsKey]);

  useEffect(() => {
    if (typeof window !== 'undefined') persistDashboardModuleOrder(normalizedModuleOrder);
  }, [normalizedModuleOrderKey]);

  const handleDragStart = (moduleId: DashboardModuleId) => (event: DragEvent<HTMLSpanElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', moduleId);
    setDraggedModuleId(moduleId);
    setDropTargetModuleId(moduleId);
  };

  const handleDrop = (moduleId: DashboardModuleId) => (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const droppedModuleId = (event.dataTransfer.getData('text/plain') ||
      draggedModuleId) as DashboardModuleId | null;
    if (droppedModuleId && droppedModuleId !== moduleId) {
      setModuleOrder((current) =>
        reorderDashboardModuleOrder(
          normalizeDashboardModuleOrder(current, visibleModuleIds),
          droppedModuleId,
          moduleId,
        ),
      );
    }
    setDraggedModuleId(null);
    setDropTargetModuleId(null);
  };

  return (
    <div className="module-grid">
      {orderedModules.map((module) => (
        <button
          key={module.id}
          type="button"
          className={`module-card ${module.className}${draggedModuleId === module.id ? ' is-dragging' : ''}${dropTargetModuleId === module.id && draggedModuleId !== module.id ? ' is-drop-target' : ''}`}
          onClick={module.onOpen}
          onDragEnter={(event) => {
            event.preventDefault();
            if (draggedModuleId && draggedModuleId !== module.id) setDropTargetModuleId(module.id);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (draggedModuleId && draggedModuleId !== module.id) setDropTargetModuleId(module.id);
          }}
          onDrop={handleDrop(module.id)}
          aria-label={module.ariaLabel}
          aria-grabbed={draggedModuleId === module.id}
        >
          <span
            className="module-card-menu"
            aria-hidden="true"
            title="Arraste para reorganizar"
            draggable
            onClick={(event) => event.stopPropagation()}
            onDragStart={handleDragStart(module.id)}
            onDragEnd={() => {
              setDraggedModuleId(null);
              setDropTargetModuleId(null);
            }}
          >
            <GripVertical size={20} />
          </span>
          <span className="module-icon">{module.icon}</span>
          <span className="module-title">{module.title}</span>
          <span className="module-metric">{module.metric}</span>
          <span className="module-card-foot">
            <span>{module.footerLabel}</span>
            {module.badge && <span className="module-badge">{module.badge}</span>}
            <ArrowRight size={20} />
          </span>
        </button>
      ))}
    </div>
  );
}
