export type WorkflowModuleCategory =
  | 'opening'
  | 'networking'
  | 'group'
  | 'industry'
  | 'closing';

export interface WorkflowModule {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  category: WorkflowModuleCategory;
}

export interface WorkflowStepConfig {
  stepId: string;
  moduleId: string;
  durationMinutes: number;
  titleSnapshot?: string;
  descriptionSnapshot?: string;
  categorySnapshot?: WorkflowModuleCategory;
}

export interface WorkflowResolvedStep extends WorkflowStepConfig {
  title: string;
  description: string;
  category: WorkflowModuleCategory;
}

const DEFAULT_MODULE_IDS = [
  'opening-checkin',
  'opening-intro',
  'networking-free-talk',
  'group-small',
  'industry-peer',
  'closing-share',
];

const STORAGE_KEY_PREFIX = 'flowmeet:host:workflow:v1';

function buildStorageKey(eventId: string): string {
  return `${STORAGE_KEY_PREFIX}:${eventId}`;
}

export function createStepFromModule(
  moduleId: string,
  moduleLibrary: WorkflowModule[]
): WorkflowStepConfig | null {
  const module = moduleLibrary.find((item) => item.id === moduleId);
  if (!module) return null;

  return {
    stepId: `${moduleId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    moduleId: module.id,
    durationMinutes: module.durationMinutes,
    titleSnapshot: module.title,
    descriptionSnapshot: module.description,
    categorySnapshot: module.category,
  };
}

export function getDefaultWorkflowConfig(moduleLibrary: WorkflowModule[]): WorkflowStepConfig[] {
  return DEFAULT_MODULE_IDS
    .map((moduleId) => createStepFromModule(moduleId, moduleLibrary))
    .filter((step): step is WorkflowStepConfig => step !== null);
}

export function resolveWorkflow(
  config: WorkflowStepConfig[],
  moduleLibrary: WorkflowModule[]
): WorkflowResolvedStep[] {
  return config
    .map((step) => {
      const module = moduleLibrary.find((item) => item.id === step.moduleId);
      if (!module && !step.titleSnapshot) return null;

      return {
        ...step,
        title: module?.title ?? step.titleSnapshot ?? '',
        description: module?.description ?? step.descriptionSnapshot ?? '',
        category: module?.category ?? step.categorySnapshot ?? 'opening',
      };
    })
    .filter((step): step is WorkflowResolvedStep => step !== null);
}

export function loadEventWorkflow(eventId: string): WorkflowStepConfig[] | null {
  if (typeof window === 'undefined' || !eventId) return null;

  const raw = window.localStorage.getItem(buildStorageKey(eventId));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as WorkflowStepConfig[];
    if (!Array.isArray(parsed)) return null;

    const normalized = parsed
      .filter(
        (step) =>
          typeof step?.stepId === 'string' &&
          typeof step?.moduleId === 'string' &&
          typeof step?.durationMinutes === 'number' &&
          (typeof step?.titleSnapshot === 'undefined' || typeof step?.titleSnapshot === 'string') &&
          (typeof step?.descriptionSnapshot === 'undefined' ||
            typeof step?.descriptionSnapshot === 'string') &&
          (typeof step?.categorySnapshot === 'undefined' ||
            step?.categorySnapshot === 'opening' ||
            step?.categorySnapshot === 'networking' ||
            step?.categorySnapshot === 'group' ||
            step?.categorySnapshot === 'industry' ||
            step?.categorySnapshot === 'closing')
      )
      .map((step) => ({
        stepId: step.stepId,
        moduleId: step.moduleId,
        durationMinutes: Math.max(1, Math.round(step.durationMinutes)),
        titleSnapshot: step.titleSnapshot,
        descriptionSnapshot: step.descriptionSnapshot,
        categorySnapshot: step.categorySnapshot,
      }));

    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
}

export function saveEventWorkflow(eventId: string, steps: WorkflowStepConfig[]): void {
  if (typeof window === 'undefined' || !eventId) return;
  window.localStorage.setItem(buildStorageKey(eventId), JSON.stringify(steps));
}
