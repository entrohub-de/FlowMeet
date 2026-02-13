'use client';

import { useState, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n/context';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import type {
  WorkflowResolvedStep,
  WorkflowStepConfig,
} from '@/features/host-console/workflowModules';
import SortableStepCard, { StepCardOverlay } from './SortableStepCard';

interface WorkflowStepListProps {
  resolvedSteps: WorkflowResolvedStep[];
  onReorder: (updater: (prev: WorkflowStepConfig[]) => WorkflowStepConfig[]) => void;
  onDurationChange: (stepId: string, duration: number) => void;
  onRemove: (stepId: string) => void;
  onAddModule: () => void;
  lastAction: string;
}

export default function WorkflowStepList({
  resolvedSteps,
  onReorder,
  onDurationChange,
  onRemove,
  onAddModule,
  lastAction,
}: WorkflowStepListProps) {
  const { t } = useTranslation();
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const totalDuration = useMemo(
    () => resolvedSteps.reduce((sum, step) => sum + step.durationMinutes, 0),
    [resolvedSteps]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder((prev) => {
      const from = prev.findIndex((step) => step.stepId === active.id);
      const to = prev.findIndex((step) => step.stepId === over.id);
      if (from < 0 || to < 0) return prev;
      return arrayMove(prev, from, to);
    });
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  const activeDragStep = activeDragId
    ? resolvedSteps.find((s) => s.stepId === activeDragId) ?? null
    : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{t('host.workflows.current.title')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('host.workflows.current.summary', {
              count: resolvedSteps.length,
              minutes: totalDuration,
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={onAddModule}
          className="h-12 px-4 inline-flex items-center gap-1 rounded-button bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          {t('host.workflows.current.addModule')}
        </button>
      </div>

      {lastAction && (
        <p className="text-xs text-primary bg-primary/10 border border-primary/20 rounded px-3 py-2 mb-3">
          {t('host.workflows.messages.lastAction', { action: lastAction })}
        </p>
      )}

      {resolvedSteps.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          <p>{t('host.workflows.current.empty')}</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={resolvedSteps.map((s) => s.stepId)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {resolvedSteps.map((step, index) => (
                <SortableStepCard
                  key={step.stepId}
                  step={step}
                  index={index}
                  onDurationChange={onDurationChange}
                  onRemove={onRemove}
                  stepLabel={t('host.workflows.current.stepLabel', { index: index + 1 })}
                  durationLabel={t('host.workflows.current.duration')}
                  minuteUnit={t('host.workflows.current.minuteUnit')}
                  dragAria={t('host.workflows.current.dragAria')}
                  deleteAria={t('host.workflows.current.deleteStepAria')}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
            {activeDragStep ? (
              <StepCardOverlay
                step={activeDragStep}
                stepLabel={t('host.workflows.current.stepLabel', {
                  index: resolvedSteps.findIndex((s) => s.stepId === activeDragId) + 1,
                })}
                durationLabel={t('host.workflows.current.duration')}
                minuteUnit={t('host.workflows.current.minuteUnit')}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
