import type { AppNotification, AppSettings, Company, Contact, Deal, Project, Task, TaskComment, User } from '../types';
import { buildSettingsColorMap, defaultAppSettings } from './appSettings';
import { isDevelopment, supabase } from './supabaseClient';

export interface AppDataPayload {
  appSettings: AppSettings | null;
  users: User[];
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  projects: Project[];
  tasks: Task[];
  taskComments: TaskComment[];
  notifications: AppNotification[];
}

export interface SyncResult {
  ok: boolean;
  error?: string;
}

type DbRow = Record<string, unknown>;
let omitArchivedAtColumns = false;

function readValue<T>(row: DbRow, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (key in row) {
      return row[key] as T;
    }
  }
  return undefined;
}

function stripArchivedAtFields<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripArchivedAtFields(item)) as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== 'archivedat' && key !== 'archivedAt')
      .map(([key, entryValue]) => [key, stripArchivedAtFields(entryValue)]);
    return Object.fromEntries(entries) as T;
  }

  return value;
}

async function executeUpsert(table: string, payload: unknown) {
  const client = supabase as any;
  let currentPayload = omitArchivedAtColumns ? stripArchivedAtFields(payload) : payload;
  let result = await client.from(table).upsert(currentPayload);

  if (result.error?.message?.includes("Could not find the 'archivedat' column")) {
    omitArchivedAtColumns = true;
    currentPayload = stripArchivedAtFields(payload);
    result = await client.from(table).upsert(currentPayload);
  }

  return result;
}

function normalizeUserRow(row: DbRow): User {
  const firstName = readValue<string>(row, 'firstName', 'firstname') ?? '';
  const lastName = readValue<string>(row, 'lastName', 'lastname') ?? '';
  const fallbackName = `${firstName} ${lastName}`.trim();

  return {
    id: String(readValue(row, 'id') ?? ''),
    firstName,
    lastName,
    name: readValue<string>(row, 'name') ?? fallbackName,
    email: readValue<string>(row, 'email') ?? '',
    role: (readValue<string>(row, 'role') as User['role']) ?? 'utilisateur',
    kind: (readValue<string>(row, 'kind') as User['kind']) ?? 'internal',
    jobTitle: readValue<string>(row, 'jobTitle', 'jobtitle') ?? '',
    phone: readValue<string>(row, 'phone') ?? '',
    color: readValue<string>(row, 'color') ?? '#2563eb',
    avatar: readValue<string>(row, 'avatar') ?? '',
    createdAt: readValue<string>(row, 'createdAt', 'createdat') ?? new Date().toISOString().slice(0, 10),
    archivedAt: readValue<string>(row, 'archivedAt', 'archivedat'),
  };
}

function toUserRow(user: User) {
  return {
    id: user.id,
    firstname: user.firstName,
    lastname: user.lastName,
    name: user.name,
    email: user.email,
    role: user.role,
    kind: user.kind,
    jobtitle: user.jobTitle,
    phone: user.phone,
    color: user.color,
    avatar: user.avatar ?? '',
    createdat: user.createdAt,
    archivedat: user.archivedAt ?? null,
  };
}

function normalizeCompanyRow(row: DbRow): Company {
  return {
    id: String(readValue(row, 'id') ?? ''),
    name: readValue<string>(row, 'name') ?? '',
    address: readValue<string>(row, 'address') ?? '',
    postalCode: readValue<string>(row, 'postalCode', 'postalcode') ?? '',
    city: readValue<string>(row, 'city') ?? '',
    phone: readValue<string>(row, 'phone') ?? '',
    siret: readValue<string>(row, 'siret') ?? '',
    category: (readValue<string>(row, 'category') as Company['category']) ?? 'prospect',
    createdAt: readValue<string>(row, 'createdAt', 'createdat') ?? new Date().toISOString().slice(0, 10),
    acquisitionChannel: (readValue<string>(row, 'acquisitionChannel', 'acquisitionchannel') as Company['acquisitionChannel']) ?? 'Inbound',
    archivedAt: readValue<string>(row, 'archivedAt', 'archivedat'),
  };
}

function toCompanyRow(company: Company) {
  return {
    id: company.id,
    name: company.name,
    address: company.address,
    postalcode: company.postalCode,
    city: company.city,
    phone: company.phone,
    siret: company.siret,
    category: company.category,
    createdat: company.createdAt,
    acquisitionchannel: company.acquisitionChannel,
    archivedat: company.archivedAt ?? null,
  };
}

function normalizeContactRow(row: DbRow): Contact {
  return {
    id: String(readValue(row, 'id') ?? ''),
    civility: (readValue<string>(row, 'civility') as Contact['civility']) ?? 'M.',
    firstName: readValue<string>(row, 'firstName', 'firstname') ?? '',
    lastName: readValue<string>(row, 'lastName', 'lastname') ?? '',
    category: (readValue<string>(row, 'category') as Contact['category']) ?? 'prospect',
    phone: readValue<string>(row, 'phone') ?? '',
    secondaryPhone: readValue<string>(row, 'secondaryPhone', 'secondaryphone'),
    secondaryPhoneLabel: readValue<string>(row, 'secondaryPhoneLabel', 'secondaryphonelabel'),
    email: readValue<string>(row, 'email') ?? '',
    companyId: readValue<string>(row, 'companyId', 'companyid') ?? '',
    createdAt: readValue<string>(row, 'createdAt', 'createdat') ?? new Date().toISOString().slice(0, 10),
    acquisitionChannel: (readValue<string>(row, 'acquisitionChannel', 'acquisitionchannel') as Contact['acquisitionChannel']) ?? 'Inbound',
    lastInteractionAt: readValue<string>(row, 'lastInteractionAt', 'lastinteractionat') ?? new Date().toISOString().slice(0, 10),
    archivedAt: readValue<string>(row, 'archivedAt', 'archivedat'),
  };
}

function toContactRow(contact: Contact) {
  return {
    id: contact.id,
    civility: contact.civility,
    firstname: contact.firstName,
    lastname: contact.lastName,
    category: contact.category,
    phone: contact.phone,
    secondaryphone: contact.secondaryPhone ?? null,
    secondaryphonelabel: contact.secondaryPhoneLabel ?? null,
    email: contact.email,
    companyid: contact.companyId,
    createdat: contact.createdAt,
    acquisitionchannel: contact.acquisitionChannel,
    lastinteractionat: contact.lastInteractionAt,
    archivedat: contact.archivedAt ?? null,
  };
}

function normalizeDealRow(row: DbRow): Deal {
  return {
    id: String(readValue(row, 'id') ?? ''),
    title: readValue<string>(row, 'title') ?? '',
    clientId: readValue<string>(row, 'clientId', 'clientid') ?? '',
    status: (readValue<string>(row, 'status') as Deal['status']) ?? 'Nouveau',
    date: readValue<string>(row, 'date') ?? new Date().toISOString().slice(0, 10),
    amount: Number(readValue(row, 'amount') ?? 0),
    createdAt: readValue<string>(row, 'createdAt', 'createdat') ?? new Date().toISOString().slice(0, 10),
    expectedCloseDate: readValue<string>(row, 'expectedCloseDate', 'expectedclosedate') ?? new Date().toISOString().slice(0, 10),
    closedAt: readValue<string>(row, 'closedAt', 'closedat'),
    outcome: (readValue<string>(row, 'outcome') as Deal['outcome']) ?? 'pending',
    description: readValue<string>(row, 'description') ?? '',
    notes: readValue<string>(row, 'notes') ?? '',
    lines: (readValue(row, 'lines') as Deal['lines']) ?? [],
    archivedAt: readValue<string>(row, 'archivedAt', 'archivedat'),
  };
}

function toDealRow(deal: Deal) {
  return {
    id: deal.id,
    title: deal.title,
    clientid: deal.clientId,
    status: deal.status,
    date: deal.date,
    amount: deal.amount,
    createdat: deal.createdAt,
    expectedclosedate: deal.expectedCloseDate,
    closedat: deal.closedAt ?? null,
    outcome: deal.outcome,
    description: deal.description,
    notes: deal.notes,
    lines: deal.lines,
    archivedat: deal.archivedAt ?? null,
  };
}

function normalizeProjectRow(row: DbRow): Project {
  return {
    id: String(readValue(row, 'id') ?? ''),
    title: readValue<string>(row, 'title') ?? '',
    type: readValue<string>(row, 'type', 'projecttype') ?? defaultAppSettings.projectTypes[0],
    dealId: readValue<string>(row, 'dealId', 'dealid') ?? '',
    ownerId: readValue<string>(row, 'ownerId', 'ownerid') ?? '',
    status: (readValue<string>(row, 'status') as Project['status']) ?? 'Planifié',
    startDate: readValue<string>(row, 'startDate', 'startdate') ?? new Date().toISOString().slice(0, 10),
    endDate: readValue<string>(row, 'endDate', 'enddate') ?? new Date().toISOString().slice(0, 10),
    budget: Number(readValue(row, 'budget') ?? 0),
    health: (readValue<string>(row, 'health') as Project['health']) ?? 'Vert',
    tasks: (readValue(row, 'tasks') as Task[]) ?? [],
    archivedAt: readValue<string>(row, 'archivedAt', 'archivedat'),
  };
}

function toProjectRow(project: Project) {
  return {
    id: project.id,
    title: project.title,
    projecttype: project.type,
    dealid: project.dealId,
    ownerid: project.ownerId,
    status: project.status,
    startdate: project.startDate,
    enddate: project.endDate,
    budget: project.budget,
    health: project.health,
    tasks: project.tasks,
    archivedat: project.archivedAt ?? null,
  };
}

function normalizeAppSettingsRow(row: DbRow | null | undefined): AppSettings {
  if (!row) return defaultAppSettings;

  const dealStatuses = (readValue(row, 'dealStatuses', 'dealstatuses') as string[]) ?? defaultAppSettings.dealStatuses;
  const projectStatuses = (readValue(row, 'projectStatuses', 'projectstatuses') as string[]) ?? defaultAppSettings.projectStatuses;
  const projectTypes = (readValue(row, 'projectTypes', 'projecttypes') as string[]) ?? defaultAppSettings.projectTypes;
  const taskStates = (readValue(row, 'taskStates', 'taskstates') as string[]) ?? defaultAppSettings.taskStates;
  const taskPriorities = (readValue(row, 'taskPriorities', 'taskpriorities') as string[]) ?? defaultAppSettings.taskPriorities;
  const taskCategories = (readValue(row, 'taskCategories', 'taskcategories') as string[]) ?? defaultAppSettings.taskCategories;

  return {
    dealStatuses,
    dealStatusColors: buildSettingsColorMap(dealStatuses, readValue(row, 'dealStatusColors', 'dealstatuscolors') as AppSettings['dealStatusColors'], defaultAppSettings.dealStatusColors),
    projectStatuses,
    projectStatusColors: buildSettingsColorMap(projectStatuses, readValue(row, 'projectStatusColors', 'projectstatuscolors') as AppSettings['projectStatusColors'], defaultAppSettings.projectStatusColors),
    projectTypes,
    projectTypeColors: buildSettingsColorMap(projectTypes, readValue(row, 'projectTypeColors', 'projecttypecolors') as AppSettings['projectTypeColors'], defaultAppSettings.projectTypeColors),
    taskStates,
    taskStateColors: buildSettingsColorMap(taskStates, readValue(row, 'taskStateColors', 'taskstatecolors') as AppSettings['taskStateColors'], defaultAppSettings.taskStateColors),
    taskPriorities,
    taskPriorityColors: buildSettingsColorMap(taskPriorities, readValue(row, 'taskPriorityColors', 'taskprioritycolors') as AppSettings['taskPriorityColors'], defaultAppSettings.taskPriorityColors),
    taskCategories,
    taskCategoryColors: buildSettingsColorMap(taskCategories, readValue(row, 'taskCategoryColors', 'taskcategorycolors') as AppSettings['taskCategoryColors'], defaultAppSettings.taskCategoryColors),
  };
}

function toAppSettingsRow(settings: AppSettings) {
  return {
    id: 'global',
    dealstatuses: settings.dealStatuses,
    dealstatuscolors: settings.dealStatusColors,
    projectstatuses: settings.projectStatuses,
    projectstatuscolors: settings.projectStatusColors,
    projecttypes: settings.projectTypes,
    projecttypecolors: settings.projectTypeColors,
    taskstates: settings.taskStates,
    taskstatecolors: settings.taskStateColors,
    taskpriorities: settings.taskPriorities,
    taskprioritycolors: settings.taskPriorityColors,
    taskcategories: settings.taskCategories,
    taskcategorycolors: settings.taskCategoryColors,
  };
}

function normalizeTaskRow(row: DbRow): Task {
  return {
    id: String(readValue(row, 'id') ?? ''),
    title: readValue<string>(row, 'title') ?? '',
    ownerId: readValue<string>(row, 'ownerId', 'ownerid') ?? '',
    projectId: readValue<string>(row, 'projectId', 'projectid') ?? '',
    parentTaskId: (readValue<string | null>(row, 'parentTaskId', 'parenttaskid') ?? null),
    order: Number(readValue(row, 'order') ?? 0),
    state: (readValue<string>(row, 'state') as Task['state']) ?? 'À faire',
    dueDate: readValue<string>(row, 'dueDate', 'duedate') ?? new Date().toISOString().slice(0, 10),
    priority: (readValue<string>(row, 'priority') as Task['priority']) ?? 'Moyenne',
    category: (readValue<string>(row, 'category') as Task['category']) ?? defaultAppSettings.taskCategories[0],
    createdAt: readValue<string>(row, 'createdAt', 'createdat') ?? new Date().toISOString().slice(0, 10),
    completedAt: readValue<string>(row, 'completedAt', 'completedat'),
    estimatedHours: Number(readValue(row, 'estimatedHours', 'estimatedhours') ?? 0),
    description: readValue<string>(row, 'description') ?? '',
    checklist: (readValue(row, 'checklist') as Task['checklist']) ?? [],
    archivedAt: readValue<string>(row, 'archivedAt', 'archivedat'),
  };
}

function toTaskRow(task: Task) {
  return {
    id: task.id,
    title: task.title,
    ownerid: task.ownerId,
    projectid: task.projectId,
    parenttaskid: task.parentTaskId ?? null,
    order: task.order,
    state: task.state,
    duedate: task.dueDate,
    priority: task.priority,
    category: task.category,
    createdat: task.createdAt,
    completedat: task.completedAt ?? null,
    estimatedhours: task.estimatedHours,
    description: task.description,
    checklist: task.checklist,
    archivedat: task.archivedAt ?? null,
  };
}

function normalizeTaskCommentRow(row: DbRow): TaskComment {
  return {
    id: String(readValue(row, 'id') ?? ''),
    taskId: readValue<string>(row, 'taskId', 'taskid') ?? '',
    authorId: readValue<string>(row, 'authorId', 'authorid') ?? '',
    content: readValue<string>(row, 'content') ?? '',
    createdAt: readValue<string>(row, 'createdAt', 'createdat') ?? new Date().toISOString(),
    mentionUserIds: (readValue(row, 'mentionUserIds', 'mentionuserids') as string[]) ?? [],
    archivedAt: readValue<string>(row, 'archivedAt', 'archivedat'),
  };
}

function toTaskCommentRow(comment: TaskComment) {
  return {
    id: comment.id,
    taskid: comment.taskId,
    authorid: comment.authorId,
    content: comment.content,
    createdat: comment.createdAt,
    mentionuserids: comment.mentionUserIds,
    archivedat: comment.archivedAt ?? null,
  };
}

function normalizeNotificationRow(row: DbRow): AppNotification {
  return {
    id: String(readValue(row, 'id') ?? ''),
    userId: readValue<string>(row, 'userId', 'userid') ?? '',
    type: (readValue<string>(row, 'type') as AppNotification['type']) ?? 'task_assigned',
    taskId: readValue<string>(row, 'taskId', 'taskid'),
    commentId: readValue<string>(row, 'commentId', 'commentid'),
    title: readValue<string>(row, 'title') ?? '',
    body: readValue<string>(row, 'body') ?? '',
    createdAt: readValue<string>(row, 'createdAt', 'createdat') ?? new Date().toISOString(),
    read: Boolean(readValue(row, 'read') ?? false),
    archivedAt: readValue<string>(row, 'archivedAt', 'archivedat'),
  };
}

function toNotificationRow(notification: AppNotification) {
  return {
    id: notification.id,
    userid: notification.userId,
    type: notification.type,
    taskid: notification.taskId ?? null,
    commentid: notification.commentId ?? null,
    title: notification.title,
    body: notification.body,
    createdat: notification.createdAt,
    read: notification.read,
    archivedat: notification.archivedAt ?? null,
  };
}

function normalizeRows<T>(rows: DbRow[], table: string): T[] {
  switch (table) {
    case 'users':
      return rows.map((row) => normalizeUserRow(row)) as T[];
    case 'companies':
      return rows.map((row) => normalizeCompanyRow(row)) as T[];
    case 'contacts':
      return rows.map((row) => normalizeContactRow(row)) as T[];
    case 'deals':
      return rows.map((row) => normalizeDealRow(row)) as T[];
    case 'projects':
      return rows.map((row) => normalizeProjectRow(row)) as T[];
    case 'tasks':
      return rows.map((row) => normalizeTaskRow(row)) as T[];
    case 'task_comments':
      return rows.map((row) => normalizeTaskCommentRow(row)) as T[];
    case 'notifications':
      return rows.map((row) => normalizeNotificationRow(row)) as T[];
    case 'app_settings':
      return rows.map((row) => normalizeAppSettingsRow(row)) as T[];
    default:
      return rows as T[];
  }
}

function toDbRow<T>(table: string, row: T) {
  switch (table) {
    case 'users':
      return toUserRow(row as User);
    case 'companies':
      return toCompanyRow(row as Company);
    case 'contacts':
      return toContactRow(row as Contact);
    case 'deals':
      return toDealRow(row as Deal);
    case 'projects':
      return toProjectRow(row as Project);
    case 'tasks':
      return toTaskRow(row as Task);
    case 'task_comments':
      return toTaskCommentRow(row as TaskComment);
    case 'notifications':
      return toNotificationRow(row as AppNotification);
    case 'app_settings':
      return toAppSettingsRow(row as AppSettings);
    default:
      return row;
  }
}

function inferNameFromEmail(email: string) {
  const localPart = email.split('@')[0] ?? 'utilisateur';
  const cleaned = localPart.replace(/[._-]+/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  const formatWord = (value: string) => value.slice(0, 1).toUpperCase() + value.slice(1);

  if (words.length === 0) {
    return { firstName: 'Nouvel', lastName: 'utilisateur' };
  }

  if (words.length === 1) {
    return { firstName: formatWord(words[0]), lastName: '' };
  }

  return {
    firstName: formatWord(words[0]),
    lastName: words.slice(1).map(formatWord).join(' '),
  };
}

export async function ensureUserProfile(authUser: { id?: string; email?: string; user_metadata?: Record<string, unknown> }) {
  if (isDevelopment || !authUser.id || !authUser.email) return null;

  const client = supabase as any;
  const byIdResult = await client.from('users').select('*').eq('id', authUser.id).maybeSingle();
  if (byIdResult.data) {
    return normalizeUserRow(byIdResult.data);
  }

  const byEmailResult = await client.from('users').select('*').eq('email', authUser.email).maybeSingle();
  if (byEmailResult.data) {
    return normalizeUserRow(byEmailResult.data);
  }

  const metadata = authUser.user_metadata ?? {};
  const firstName = typeof metadata.firstName === 'string'
    ? metadata.firstName
    : typeof metadata.first_name === 'string'
      ? metadata.first_name
      : inferNameFromEmail(authUser.email).firstName;
  const lastName = typeof metadata.lastName === 'string'
    ? metadata.lastName
    : typeof metadata.last_name === 'string'
      ? metadata.last_name
      : inferNameFromEmail(authUser.email).lastName;
  const newUser: User = {
    id: authUser.id,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim() || authUser.email,
    email: authUser.email,
    role: 'utilisateur',
    kind: 'internal',
    jobTitle: '',
    phone: '',
    color: '#2563eb',
    avatar: '',
    createdAt: new Date().toISOString().slice(0, 10),
  };

  const { error } = await executeUpsert('users', toUserRow(newUser));
  if (error) {
    console.error('Supabase user profile provisioning failed', error);
    return null;
  }

  return newUser;
}

export async function loadAppData(): Promise<AppDataPayload | null> {
  if (isDevelopment) {
    return null;
  }

  const client = supabase as any;
  const [appSettingsResult, usersResult, companiesResult, contactsResult, dealsResult, projectsResult, tasksResult, taskCommentsResult, notificationsResult] =
    await Promise.all([
      client.from('app_settings').select('*').eq('id', 'global').maybeSingle(),
      client.from('users').select('*'),
      client.from('companies').select('*'),
      client.from('contacts').select('*'),
      client.from('deals').select('*'),
      client.from('projects').select('*'),
      client.from('tasks').select('*'),
      client.from('task_comments').select('*'),
      client.from('notifications').select('*'),
    ]);

  const errors = [
    usersResult.error,
    companiesResult.error,
    contactsResult.error,
    dealsResult.error,
    projectsResult.error,
    tasksResult.error,
    taskCommentsResult.error,
    notificationsResult.error,
  ].filter(Boolean);

  if (appSettingsResult.error) {
    errors.unshift(appSettingsResult.error);
  }

  if (errors.length > 0) {
    console.error('Supabase data load failed', errors);
    return null;
  }

  return {
    appSettings: appSettingsResult.data ? normalizeAppSettingsRow(appSettingsResult.data as DbRow) : null,
    users: normalizeRows<User>((usersResult.data ?? []) as DbRow[], 'users'),
    companies: normalizeRows<Company>((companiesResult.data ?? []) as DbRow[], 'companies'),
    contacts: normalizeRows<Contact>((contactsResult.data ?? []) as DbRow[], 'contacts'),
    deals: normalizeRows<Deal>((dealsResult.data ?? []) as DbRow[], 'deals'),
    projects: normalizeRows<Project>((projectsResult.data ?? []) as DbRow[], 'projects'),
    tasks: normalizeRows<Task>((tasksResult.data ?? []) as DbRow[], 'tasks'),
    taskComments: normalizeRows<TaskComment>((taskCommentsResult.data ?? []) as DbRow[], 'task_comments'),
    notifications: normalizeRows<AppNotification>((notificationsResult.data ?? []) as DbRow[], 'notifications'),
  };
}

export async function upsertRow<T>(table: string, row: T): Promise<SyncResult> {
  if (isDevelopment) return { ok: true };
  const payload = toDbRow(table, row);
  const { error } = await executeUpsert(table, payload);
  if (error) {
    console.error(`Supabase upsert failed for ${table}`, error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function upsertRows<T>(table: string, rows: T[]): Promise<SyncResult> {
  if (isDevelopment) return { ok: true };
  if (rows.length === 0) return { ok: true };
  const payload = rows.map((row) => toDbRow(table, row));
  const { error } = await executeUpsert(table, payload);
  if (error) {
    console.error(`Supabase bulk upsert failed for ${table}`, error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function deleteRow(table: string, id: string): Promise<SyncResult> {
  if (isDevelopment) return { ok: true };
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) {
    console.error(`Supabase delete failed for ${table}`, error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
