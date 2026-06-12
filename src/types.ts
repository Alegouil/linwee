export type UserRole = 'admin' | 'gestion' | 'utilisateur' | 'invite';
export type UserKind = 'internal' | 'external';
export type AcquisitionChannel = 'Inbound' | 'Sortant' | 'Referral' | 'Réseau' | 'Campagne';
export type DealOutcome = 'pending' | 'won' | 'lost';
export type ProjectHealth = 'Vert' | 'Attention' | 'Critique';
export type NotificationType = 'task_assigned' | 'task_overdue' | 'task_comment';
export type SettingsColorMap = Record<string, string>;

export interface AppSettings {
  dealStatuses: string[];
  dealStatusColors: SettingsColorMap;
  projectStatuses: string[];
  projectStatusColors: SettingsColorMap;
  projectTypes: string[];
  projectTypeColors: SettingsColorMap;
  taskStates: string[];
  taskStateColors: SettingsColorMap;
  taskPriorities: string[];
  taskPriorityColors: SettingsColorMap;
  taskCategories: string[];
  taskCategoryColors: SettingsColorMap;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: UserRole;
  kind: UserKind;
  jobTitle: string;
  phone: string;
  color: string;
  avatar?: string;
  createdAt: string;
  archivedAt?: string;
}

export type ContactCategory = 'suspect' | 'prospect' | 'client';

export interface Company {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  siret: string;
  category: ContactCategory;
  createdAt: string;
  acquisitionChannel: AcquisitionChannel;
  archivedAt?: string;
}

export interface Contact {
  id: string;
  civility: 'Mme' | 'M.';
  firstName: string;
  lastName: string;
  category: ContactCategory;
  phone: string;
  secondaryPhone?: string;
  secondaryPhoneLabel?: string;
  email: string;
  companyId: string;
  createdAt: string;
  acquisitionChannel: AcquisitionChannel;
  lastInteractionAt: string;
  archivedAt?: string;
}

export interface DealLine {
  id: string;
  title: string;
  description: string;
  price: number;
}

export interface Deal {
  id: string;
  title: string;
  clientId: string;
  status: string;
  date: string;
  amount: number;
  createdAt: string;
  expectedCloseDate: string;
  closedAt?: string;
  outcome: DealOutcome;
  description: string;
  notes: string;
  lines: DealLine[];
  archivedAt?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  ownerId: string;
  projectId: string;
  parentTaskId?: string | null;
  order: number;
  state: string;
  dueDate: string;
  priority: string;
  category: string;
  createdAt: string;
  completedAt?: string;
  estimatedHours: number;
  description: string;
  checklist: ChecklistItem[];
  archivedAt?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  mentionUserIds: string[];
  archivedAt?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  taskId?: string;
  commentId?: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  archivedAt?: string;
}

export interface Project {
  id: string;
  title: string;
  type: string;
  dealId: string;
  ownerId: string;
  status: string;
  startDate: string;
  endDate: string;
  budget: number;
  health: ProjectHealth;
  tasks: Task[];
  archivedAt?: string;
}
