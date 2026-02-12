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

function buildStorageKey(eventId: string): string {
  return `${STORAGE_KEY_PREFIX}:${eventId}`;
}

export function createStepFromModule(moduleId: string): WorkflowStepConfig | null {
  const module = WORKFLOW_MODULE_LIBRARY.find((item) => item.id === moduleId);
  if (!module) return null;

  return {
    stepId: `${moduleId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    moduleId: module.id,
    durationMinutes: module.durationMinutes,
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

export function resolveWorkflow(config: WorkflowStepConfig[]): WorkflowResolvedStep[] {
  return config
    .map((step) => {
      const module = WORKFLOW_MODULE_LIBRARY.find((item) => item.id === step.moduleId);
      if (!module) return null;

      return {
        ...step,
        title: module.title,
        description: module.description,
        category: module.category,
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
          typeof step?.durationMinutes === 'number'
      )
      .map((step) => ({
        stepId: step.stepId,
        moduleId: step.moduleId,
        durationMinutes: Math.max(1, Math.round(step.durationMinutes)),
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
