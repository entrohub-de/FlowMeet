'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2 } from 'lucide-react';
import type { WorkflowResolvedStep } from '@/features/host-console/workflowModules';

interface SortableStepCardProps {
  step: WorkflowResolvedStep;
  index: number;
  onDurationChange: (stepId: string, duration: number) => void;
  onRemove: (stepId: string) => void;
  stepLabel: string;
  durationLabel: string;
  minuteUnit: string;
  dragAria: string;
  deleteAria: string;
}

export default function SortableStepCard({
  step,
  onDurationChange,
  onRemove,
  stepLabel,
  durationLabel,
  minuteUnit,
  dragAria,
  deleteAria,
}: SortableStepCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.stepId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border p-3 bg-background cursor-grab active:cursor-grabbing touch-none ${
        isDragging
          ? 'opacity-30 border-dashed border-primary/50'
          : 'border-border'
      }`}
      aria-label={dragAria}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs text-muted-foreground">{stepLabel}</p>
          <div className="font-medium text-foreground">{step.title}</div>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onRemove(step.stepId)}
            className="h-8 w-8 inline-flex items-center justify-center rounded-button border border-red-200 text-red-600 hover:bg-red-50"
            aria-label={deleteAria}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
        <label htmlFor={`duration-${step.stepId}`} className="text-xs text-muted-foreground">
          {durationLabel}
        </label>
        <input
          id={`duration-${step.stepId}`}
          type="number"
          min={1}
          value={step.durationMinutes}
          onChange={(event) => onDurationChange(step.stepId, Number(event.target.value))}
          className="h-8 w-20 rounded-button border border-border px-2 bg-background text-sm cursor-auto"
        />
        <span className="text-xs text-muted-foreground">{minuteUnit}</span>
      </div>
    </div>
  );
}

/** Presentational-only card used inside DragOverlay (no sortable hooks). */
export function StepCardOverlay({
  step,
  stepLabel,
  durationLabel,
  minuteUnit,
}: Pick<SortableStepCardProps, 'step' | 'stepLabel' | 'durationLabel' | 'minuteUnit'>) {
  return (
    <div className="rounded-lg border border-primary/50 p-3 bg-background shadow-xl scale-[1.03] rotate-[1deg] opacity-90">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-xs text-muted-foreground">{stepLabel}</p>
          <div className="font-medium text-foreground">{step.title}</div>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{durationLabel}</span>
        <span className="h-8 w-20 rounded-button border border-border px-2 bg-background text-sm inline-flex items-center">
          {step.durationMinutes}
        </span>
        <span className="text-xs text-muted-foreground">{minuteUnit}</span>
      </div>
    </div>
  );
}
