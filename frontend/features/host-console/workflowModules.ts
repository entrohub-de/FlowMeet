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

export const WORKFLOW_MODULE_LIBRARY: WorkflowModule[] = [
  {
    id: 'opening-checkin',
    title: '签到与入场',
    description: '人员到场、破冰准备与分区指引。',
    durationMinutes: 20,
    category: 'opening',
  },
  {
    id: 'opening-intro',
    title: '开场与规则说明',
    description: '主持人说明目标、流程、时间规则。',
    durationMinutes: 10,
    category: 'opening',
  },
  {
    id: 'networking-free-talk',
    title: '自由交流',
    description: '开放走动交流，适合快速建立连接。',
    durationMinutes: 25,
    category: 'networking',
  },
  {
    id: 'networking-speed',
    title: '快速轮转交流',
    description: '短时多轮对话，提升触达人数。',
    durationMinutes: 20,
    category: 'networking',
  },
  {
    id: 'group-small',
    title: '小组交流',
    description: '按主题分组讨论，每组输出结论。',
    durationMinutes: 35,
    category: 'group',
  },
  {
    id: 'industry-peer',
    title: '同行业交流',
    description: '同赛道交流，聚焦行业资源与合作。',
    durationMinutes: 30,
    category: 'industry',
  },
  {
    id: 'industry-cross',
    title: '跨行业交流',
    description: '不同背景交叉讨论，提升视角多样性。',
    durationMinutes: 30,
    category: 'industry',
  },
  {
    id: 'closing-share',
    title: '总结分享',
    description: '代表发言与关键收获回顾。',
    durationMinutes: 15,
    category: 'closing',
  },
];

const STORAGE_KEY_PREFIX = 'flowmeet:host:workflow:v1';
const CUSTOM_MODULE_STORAGE_KEY = 'flowmeet:host:custom-modules:v1';

function buildStorageKey(eventId: string): string {
  return `${STORAGE_KEY_PREFIX}:${eventId}`;
}

export function createStepFromModule(
  moduleId: string,
  moduleLibrary: WorkflowModule[] = WORKFLOW_MODULE_LIBRARY
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

export function getDefaultWorkflowConfig(): WorkflowStepConfig[] {
  const moduleIds = [
    'opening-checkin',
    'opening-intro',
    'networking-free-talk',
    'group-small',
    'industry-peer',
    'closing-share',
  ];

  return moduleIds
    .map((moduleId) => createStepFromModule(moduleId))
    .filter((step): step is WorkflowStepConfig => step !== null);
}

export function resolveWorkflow(
  config: WorkflowStepConfig[],
  moduleLibrary: WorkflowModule[] = WORKFLOW_MODULE_LIBRARY
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

export function loadCustomWorkflowModules(): WorkflowModule[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(CUSTOM_MODULE_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as WorkflowModule[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item) =>
        typeof item?.id === 'string' &&
        typeof item?.title === 'string' &&
        typeof item?.description === 'string' &&
        typeof item?.durationMinutes === 'number' &&
        (item?.category === 'opening' ||
          item?.category === 'networking' ||
          item?.category === 'group' ||
          item?.category === 'industry' ||
          item?.category === 'closing')
    );
  } catch {
    return [];
  }
}

export function saveCustomWorkflowModules(modules: WorkflowModule[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CUSTOM_MODULE_STORAGE_KEY, JSON.stringify(modules));
}
