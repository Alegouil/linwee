import type { AppSettings, SettingsColorMap } from '../types';

export const settingsColorPalette = [
  '#dc2626',
  '#ea580c',
  '#d97706',
  '#ca8a04',
  '#65a30d',
  '#16a34a',
  '#059669',
  '#0f766e',
  '#0891b2',
  '#0284c7',
  '#2563eb',
  '#4f46e5',
  '#7c3aed',
  '#9333ea',
  '#c026d3',
  '#db2777',
  '#e11d48',
  '#64748b',
  '#475569',
  '#334155',
];

export function getRandomSettingsColor() {
  return settingsColorPalette[Math.floor(Math.random() * settingsColorPalette.length)] ?? '#2563eb';
}

const defaultDealStatuses = ['Nouveau', 'En cours', 'Signé'];
const defaultProjectStatuses = ['Planifié', 'En cours', 'Livré'];
const defaultProjectTypes = ['Site vitrine', 'E-commerce', 'Maintenance', 'Application'];
const defaultTaskStates = ['À faire', 'En cours', 'Terminé'];
const defaultTaskPriorities = ['Haute', 'Moyenne', 'Basse'];
const defaultTaskCategories = ['Coordination', 'Design', 'Production', 'QA'];

function makeColorMap(values: string[], colors: string[]) {
  return Object.fromEntries(values.map((value, index) => [value, colors[index % colors.length]])) as SettingsColorMap;
}

export const defaultAppSettings: AppSettings = {
  dealStatuses: defaultDealStatuses,
  dealStatusColors: makeColorMap(defaultDealStatuses, ['#2563eb', '#f59e0b', '#16a34a']),
  projectStatuses: defaultProjectStatuses,
  projectStatusColors: makeColorMap(defaultProjectStatuses, ['#64748b', '#2563eb', '#16a34a']),
  projectTypes: defaultProjectTypes,
  projectTypeColors: makeColorMap(defaultProjectTypes, ['#0f766e', '#c2410c', '#7c3aed', '#2563eb']),
  taskStates: defaultTaskStates,
  taskStateColors: makeColorMap(defaultTaskStates, ['#64748b', '#2563eb', '#16a34a']),
  taskPriorities: defaultTaskPriorities,
  taskPriorityColors: makeColorMap(defaultTaskPriorities, ['#dc2626', '#d97706', '#0284c7']),
  taskCategories: defaultTaskCategories,
  taskCategoryColors: makeColorMap(defaultTaskCategories, ['#0f766e', '#7c3aed', '#2563eb', '#475569']),
};

export function getCompletedTaskState(settings: AppSettings) {
  return settings.taskStates[settings.taskStates.length - 1] ?? defaultAppSettings.taskStates[defaultAppSettings.taskStates.length - 1];
}

export function getCompletedProjectStatus(settings: AppSettings) {
  return settings.projectStatuses[settings.projectStatuses.length - 1] ?? defaultAppSettings.projectStatuses[defaultAppSettings.projectStatuses.length - 1];
}

export function getDefaultProjectType(settings: AppSettings) {
  return settings.projectTypes[0] ?? defaultAppSettings.projectTypes[0];
}

export function getDefaultTaskPriority(settings: AppSettings) {
  return settings.taskPriorities[1] ?? settings.taskPriorities[0] ?? defaultAppSettings.taskPriorities[0];
}

export function getDefaultTaskCategory(settings: AppSettings) {
  return settings.taskCategories[0] ?? defaultAppSettings.taskCategories[0];
}

export function normalizeColor(value: string | undefined, fallback: string) {
  const candidate = value?.trim() ?? '';
  return /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate : fallback;
}

export function buildSettingsColorMap(values: string[], input: SettingsColorMap | undefined, fallbackMap: SettingsColorMap) {
  return Object.fromEntries(
    values.map((value, index) => [
      value,
      normalizeColor(input?.[value], fallbackMap[value] ?? Object.values(fallbackMap)[index % Math.max(1, Object.values(fallbackMap).length)] ?? '#64748b'),
    ]),
  ) as SettingsColorMap;
}

export function withAlpha(color: string, alphaHex: string) {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? `${color}${alphaHex}` : color;
}

export function getBadgeColors(color: string) {
  const normalized = normalizeColor(color, '#64748b');
  const hex = normalized.replace('#', '');
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (red * 0.299 + green * 0.587 + blue * 0.114) / 255;
  return {
    backgroundColor: withAlpha(normalized, 'E6'),
    color: luminance > 0.62 ? '#0f172a' : '#ffffff',
  };
}
