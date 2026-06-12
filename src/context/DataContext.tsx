import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { User as AuthUser } from '@supabase/supabase-js';
import {
    companies as initialCompanies,
    contacts as initialContacts,
    deals as initialDeals,
    notifications as initialNotifications,
    projects as initialProjects,
    taskComments as initialTaskComments,
    tasks as initialTasks,
} from '../data/mock';
import { isDevelopment, supabase } from '../lib/supabaseClient';
import { ensureUserProfile, loadAppData, upsertRow, upsertRows } from '../lib/supabaseData';
import { buildSettingsColorMap, defaultAppSettings, getCompletedProjectStatus, getCompletedTaskState, getDefaultProjectType, getDefaultTaskCategory, getDefaultTaskPriority, getRandomSettingsColor } from '../lib/appSettings';
import { collectDescendantTaskIds, isDescendantTask } from '../lib/taskTree';
import { formatUserName, readStoredUsers, writeStoredUsers } from '../lib/userStore';
import { useTheme } from './ThemeContext';
import type { AppNotification, AppSettings, ChecklistItem, Company, Contact, Deal, DealLine, Project, Task, TaskComment, User } from '../types';

interface DataContextValue {
  isReady: boolean;
  appSettings: AppSettings;
  companies: Company[];
  users: User[];
  currentUser: User | null;
  contacts: Contact[];
  deals: Deal[];
  projects: Project[];
  tasks: Task[];
  taskComments: TaskComment[];
  notifications: AppNotification[];
  lastSyncError: string | null;
  clearLastSyncError: () => void;
  updateAppSettings: (updates: Partial<AppSettings>) => void;
  createUser: (input?: Partial<User>) => string;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  createCompany: (input?: Partial<Company>) => string;
  updateCompany: (companyId: string, updates: Partial<Company>) => void;
  deleteCompany: (companyId: string) => void;
  createContact: (input?: Partial<Contact>) => string;
  updateContact: (contactId: string, updates: Partial<Contact>) => void;
  deleteContact: (contactId: string) => void;
  createDeal: (input?: Partial<Deal>) => string;
  updateDeal: (dealId: string, updates: Partial<Deal>) => void;
  updateDealLine: (dealId: string, lineId: string, updates: Partial<DealLine>) => void;
  reorderDealLines: (dealId: string, sourceIndex: number, destinationIndex: number) => void;
  moveDealToStatus: (dealId: string, status: Deal['status']) => void;
  deleteDeal: (dealId: string) => void;
  createProject: (input?: Partial<Project>) => string;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  moveProjectToStatus: (projectId: string, status: Project['status']) => void;
  deleteProject: (projectId: string) => void;
  createTask: (input?: Partial<Task>) => string;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  reorderTasksInProject: (projectId: string, orderedTaskIds: string[]) => void;
  reorderTaskSiblings: (orderedTaskIds: string[], parentTaskId: string | null, updates?: Partial<Pick<Task, 'ownerId' | 'projectId' | 'state' | 'dueDate'>>) => void;
  moveTaskToParent: (taskId: string, parentTaskId: string | null, updates?: Partial<Pick<Task, 'ownerId' | 'projectId' | 'state' | 'dueDate'>>) => void;
  updateTaskChecklistItem: (taskId: string, itemId: string, updates: Partial<ChecklistItem>) => void;
  createTaskComment: (taskId: string, content: string, mentionUserIds?: string[]) => string;
  setNotificationReadState: (notificationId: string, read: boolean) => void;
  deleteTask: (taskId: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

type ArchivableEntity = { id: string; archivedAt?: string };
type PendingArchive = {
  id: string;
  message: string;
  undo: () => void;
};
type EntityTable = 'users' | 'companies' | 'contacts' | 'deals' | 'projects' | 'tasks' | 'task_comments' | 'notifications';

function moveItem<T>(items: T[], sourceIndex: number, destinationIndex: number) {
  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(destinationIndex, 0, moved);
  return next;
}

function makeId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTimestamp(value = new Date()) {
  return value.toISOString();
}

function truncateText(value: string, max = 90) {
  return value.length > max ? `${value.slice(0, max).trim()}...` : value;
}

function formatSyncErrorMessage(error: string, table: string) {
  if (error.includes("Could not find the 'archivedat' column")) {
    return 'La colonne archivedat manque dans Supabase. Relance le SQL de migration puis recharge la page.';
  }

  if (error.includes('violates foreign key constraint "notifications_taskid_fkey"')) {
    return 'Une notification référence une tâche encore absente de Supabase. Recharge la page puis réessaie.';
  }

  return error || `Echec de synchronisation pour ${table}.`;
}

function normalizeSiblingOrders(items: Task[], parentTaskId: string | null, projectId?: string, ownerId?: string) {
  const siblings = items
    .filter((task) => (task.parentTaskId ?? null) === parentTaskId)
    .filter((task) => (projectId ? task.projectId === projectId : true))
    .filter((task) => (ownerId ? task.ownerId === ownerId : true))
    .sort((a, b) => a.order - b.order);

  const nextMap = new Map(siblings.map((task, index) => [task.id, index + 1]));
  return items.map((task) => (nextMap.has(task.id) ? { ...task, order: nextMap.get(task.id)! } : task));
}

function normalizeAppSettingsPayload(settings: AppSettings): AppSettings {
  return {
    dealStatuses: settings.dealStatuses,
    dealStatusColors: buildSettingsColorMap(settings.dealStatuses, settings.dealStatusColors, defaultAppSettings.dealStatusColors),
    projectStatuses: settings.projectStatuses,
    projectStatusColors: buildSettingsColorMap(settings.projectStatuses, settings.projectStatusColors, defaultAppSettings.projectStatusColors),
    projectTypes: settings.projectTypes,
    projectTypeColors: buildSettingsColorMap(settings.projectTypes, settings.projectTypeColors, defaultAppSettings.projectTypeColors),
    taskStates: settings.taskStates,
    taskStateColors: buildSettingsColorMap(settings.taskStates, settings.taskStateColors, defaultAppSettings.taskStateColors),
    taskPriorities: settings.taskPriorities,
    taskPriorityColors: buildSettingsColorMap(settings.taskPriorities, settings.taskPriorityColors, defaultAppSettings.taskPriorityColors),
    taskCategories: settings.taskCategories,
    taskCategoryColors: buildSettingsColorMap(settings.taskCategories, settings.taskCategoryColors, defaultAppSettings.taskCategoryColors),
  };
}

const APP_SETTINGS_STORAGE_KEY = 'app_settings_cache';

function readStoredAppSettings() {
  if (typeof window === 'undefined') return defaultAppSettings;
  try {
    const raw = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!raw) return defaultAppSettings;
    return normalizeAppSettingsPayload(JSON.parse(raw) as AppSettings);
  } catch {
    return defaultAppSettings;
  }
}

function hasStoredAppSettings() {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY));
  } catch {
    return false;
  }
}

function writeStoredAppSettings(settings: AppSettings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage write failures.
  }
}

function isActiveItem<T extends { archivedAt?: string }>(item: T) {
  return !item.archivedAt;
}

function mergeSnapshots<T extends ArchivableEntity>(items: T[], snapshots: T[]) {
  const byId = new Map(snapshots.map((item) => [item.id, item]));
  return items.map((item) => byId.get(item.id) ?? item);
}

function archiveEntities<T extends ArchivableEntity>(items: T[], ids: Set<string>, archivedAt: string) {
  return items.map((item) => (ids.has(item.id) ? { ...item, archivedAt } : item));
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  const [appSettings, setAppSettings] = useState<AppSettings>(() => readStoredAppSettings());
  const [companies, setCompanies] = useState<Company[]>(() => (isDevelopment ? initialCompanies : []));
  const [users, setUsers] = useState<User[]>(() => (isDevelopment ? readStoredUsers() : []));
  const [contacts, setContacts] = useState<Contact[]>(() => (isDevelopment ? initialContacts : []));
  const [deals, setDeals] = useState<Deal[]>(() => (isDevelopment ? initialDeals : []));
  const [projects, setProjects] = useState<Project[]>(() => (isDevelopment ? initialProjects : []));
  const [tasks, setTasks] = useState<Task[]>(() => (isDevelopment ? initialTasks : []));
  const [taskComments, setTaskComments] = useState<TaskComment[]>(() => (isDevelopment ? initialTaskComments : []));
  const [notifications, setNotifications] = useState<AppNotification[]>(() => (isDevelopment ? initialNotifications : []));
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [pendingArchive, setPendingArchive] = useState<PendingArchive | null>(null);
  const [dataLoaded, setDataLoaded] = useState(isDevelopment);
  const [authResolved, setAuthResolved] = useState(isDevelopment);
  const archiveTimeoutRef = useRef<number | null>(null);
  const [authUser, setAuthUser] = useState<{ id?: string; email?: string } | null>(() => {
    if (typeof window === 'undefined' || !isDevelopment) return null;
    try {
      const raw = window.localStorage.getItem('auth_user');
      return raw ? (JSON.parse(raw) as { id?: string; email?: string }) : null;
    } catch {
      return null;
    }
  });

  const currentUser = useMemo(() => {
    if (!authUser) return null;
    return users.find(
      (user) => user.email.toLowerCase() === authUser.email?.toLowerCase() || user.id === authUser.id,
    ) ?? null;
  }, [authUser, users]);

  const activeUsers = useMemo(() => users.filter(isActiveItem), [users]);
  const activeCompanies = useMemo(() => companies.filter(isActiveItem), [companies]);
  const activeContacts = useMemo(() => contacts.filter(isActiveItem), [contacts]);
  const activeDeals = useMemo(() => deals.filter(isActiveItem), [deals]);
  const activeProjects = useMemo(() => projects.filter(isActiveItem), [projects]);
  const activeTasks = useMemo(() => tasks.filter(isActiveItem), [tasks]);
  const activeTaskComments = useMemo(() => taskComments.filter(isActiveItem), [taskComments]);
  const activeNotifications = useMemo(() => notifications.filter(isActiveItem), [notifications]);

  useEffect(() => {
    if (!isDevelopment) return;
    writeStoredUsers(users);
  }, [users]);

  useEffect(() => {
    writeStoredAppSettings(appSettings);
  }, [appSettings]);

  useEffect(() => {
    if (isDevelopment) return;
    let active = true;

    (async () => {
      const data = await loadAppData();
      if (!active) return;
      if (!data) {
        setDataLoaded(true);
        return;
      }

      if (data.appSettings) {
        const nextSettings = hasStoredAppSettings()
          ? normalizeAppSettingsPayload({
              ...data.appSettings,
              ...readStoredAppSettings(),
            })
          : data.appSettings;
        setAppSettings(nextSettings);
      }
      setUsers(data.users);
      setCompanies(data.companies);
      setContacts(data.contacts);
      setDeals(data.deals);
      setProjects(data.projects);
      setTasks(data.tasks);
      setTaskComments(data.taskComments);
      setNotifications(data.notifications);
      setDataLoaded(true);
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isDevelopment) return;
    let active = true;

    supabase.auth.getSession().then((result: any) => {
      if (!active) return;
      setAuthUser(result.data.session?.user ?? null);
      setAuthResolved(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      if (!active) return;
      setAuthUser(session?.user ?? null);
      setAuthResolved(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isDevelopment || !authUser?.id || !authUser.email) return;
    if (users.some((user) => user.id === authUser.id || user.email.toLowerCase() === authUser.email?.toLowerCase())) return;

    let active = true;

    (async () => {
      const profile = await ensureUserProfile(authUser as AuthUser);
      if (!active || !profile) return;

      setUsers((current) => {
        const existingIndex = current.findIndex(
          (user) => user.id === profile.id || user.email.toLowerCase() === profile.email.toLowerCase(),
        );

        if (existingIndex === -1) {
          return [...current, profile];
        }

        const next = [...current];
        next[existingIndex] = {
          ...next[existingIndex],
          ...profile,
        };
        return next;
      });
    })();

    return () => {
      active = false;
    };
  }, [authUser, users]);

  const defaultInternalOwner = useMemo(() => activeUsers.find((user) => user.kind === 'internal' && user.role !== 'invite') ?? activeUsers[0] ?? null, [activeUsers]);
  const completedTaskState = useMemo(() => getCompletedTaskState(appSettings), [appSettings]);
  const completedProjectStatus = useMemo(() => getCompletedProjectStatus(appSettings), [appSettings]);
  const isReady = isDevelopment || (dataLoaded && authResolved);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setNotifications((current) => {
      const existingKeys = new Set(
        current
          .filter((notification) => notification.type === 'task_overdue' && notification.taskId)
          .map((notification) => `${notification.taskId}:${notification.userId}`),
      );

      const nextNotifications = activeTasks
        .filter((task) => task.state !== completedTaskState)
        .filter((task) => {
          const dueDate = new Date(task.dueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate.getTime() < today.getTime();
        })
        .filter((task) => !existingKeys.has(`${task.id}:${task.ownerId}`))
        .map<AppNotification>((task) => ({
          id: makeId('notification'),
          userId: task.ownerId,
          type: 'task_overdue',
          taskId: task.id,
          title: 'Tâche en retard',
          body: `${task.title} a dépassé son échéance.`,
          createdAt: formatTimestamp(),
          read: false,
        }));

      return nextNotifications.length > 0 ? [...current, ...nextNotifications] : current;
    });
  }, [activeTasks, completedTaskState]);

  const syncUpsert = (table: string, row: unknown) => {
    if (isDevelopment) return;
    if (table === 'notifications') {
      void syncNotifications([row as AppNotification]);
      return;
    }
    void upsertRow(table, row).then((result) => {
      if (!result.ok) {
        setLastSyncError(formatSyncErrorMessage(result.error ?? '', table));
        return;
      }
      setLastSyncError(null);
    });
  };

  const syncUpsertRows = (table: string, rows: unknown[]) => {
    if (isDevelopment) return;
    if (table === 'notifications') {
      void syncNotifications(rows as AppNotification[]);
      return;
    }
    void upsertRows(table, rows).then((result) => {
      if (!result.ok) {
        setLastSyncError(formatSyncErrorMessage(result.error ?? '', table));
        return;
      }
      setLastSyncError(null);
    });
  };

  const syncNotifications = async (rows: AppNotification[], relatedTasks: Task[] = []) => {
    if (isDevelopment || rows.length === 0) return;

    const taskIds = new Set(rows.map((notification) => notification.taskId).filter(Boolean));
    const taskRows = [
      ...relatedTasks.filter((task) => taskIds.has(task.id)),
      ...tasks.filter((task) => taskIds.has(task.id)),
    ];
    const uniqueTaskRows = Array.from(new Map(taskRows.map((task) => [task.id, task])).values());

    if (uniqueTaskRows.length > 0) {
      const taskResult = await upsertRows('tasks', uniqueTaskRows);
      if (!taskResult.ok) {
        setLastSyncError(formatSyncErrorMessage(taskResult.error ?? '', 'tasks'));
        return;
      }
    }

    const notificationResult = await upsertRows('notifications', rows);
    if (!notificationResult.ok) {
      setLastSyncError(formatSyncErrorMessage(notificationResult.error ?? '', 'notifications'));
      return;
    }
    setLastSyncError(null);
  };

  const syncNotificationAfter = async (table: 'tasks' | 'task_comments', row: Task | TaskComment, notification: AppNotification | AppNotification[]) => {
    if (isDevelopment) return;
    const result = await upsertRow(table, row as never);
    if (!result.ok) {
      setLastSyncError(formatSyncErrorMessage(result.error ?? '', table));
      return;
    }

    const notificationsToPersist = Array.isArray(notification) ? notification : [notification];
    const relatedTask = table === 'tasks'
      ? [row as Task]
      : tasks.filter((task) => task.id === (row as TaskComment).taskId);
    await syncNotifications(notificationsToPersist, relatedTask);
  };

  const persistRows = (table: EntityTable, rows: unknown[]) => {
    if (rows.length === 0) return;
    if (rows.length === 1) {
      syncUpsert(table, rows[0]);
      return;
    }
    syncUpsertRows(table, rows);
  };

  const schedulePendingArchive = (message: string, undo: () => void) => {
    if (archiveTimeoutRef.current) {
      window.clearTimeout(archiveTimeoutRef.current);
    }

    const pending: PendingArchive = {
      id: makeId('pending-archive'),
      message,
      undo: () => {
        if (archiveTimeoutRef.current) {
          window.clearTimeout(archiveTimeoutRef.current);
          archiveTimeoutRef.current = null;
        }
        undo();
        setPendingArchive(null);
      },
    };

    setPendingArchive(pending);
    archiveTimeoutRef.current = window.setTimeout(() => {
      setPendingArchive((current) => (current?.id === pending.id ? null : current));
      archiveTimeoutRef.current = null;
    }, 30000);
  };

  const value = useMemo<DataContextValue>(() => ({
    isReady,
    appSettings,
    companies: activeCompanies,
    users: activeUsers,
    currentUser,
    contacts: activeContacts,
    deals: activeDeals,
    projects: activeProjects,
    tasks: activeTasks,
    taskComments: activeTaskComments,
    notifications: activeNotifications,
    lastSyncError,
    clearLastSyncError: () => setLastSyncError(null),
    updateAppSettings: (updates) => {
      const nextSettings = normalizeAppSettingsPayload({
        ...appSettings,
        ...updates,
      });
      setAppSettings(nextSettings);
      syncUpsert('app_settings', nextSettings);
    },
    createUser: (input = {}) => {
      const id = makeId('user');
      const firstName = input.firstName ?? 'Nouveau';
      const lastName = input.lastName ?? 'user';
      const kind = input.kind ?? 'internal';
      const role = input.role ?? (kind === 'external' ? 'invite' : 'utilisateur');
      const today = new Date().toISOString().slice(0, 10);
      const newUser = {
        id,
        firstName,
        lastName,
        name: input.name ?? `${firstName} ${lastName}`.trim(),
        email: input.email ?? '',
        role: kind === 'external' ? 'invite' : role,
        kind,
        jobTitle: input.jobTitle ?? '',
        phone: input.phone ?? '',
        color: input.color ?? getRandomSettingsColor(),
        avatar: input.avatar ?? '',
        createdAt: input.createdAt ?? today,
      };
      setUsers((current) => [...current, newUser]);
      syncUpsert('users', newUser);
      return id;
    },
    updateUser: (userId, updates) => {
      setUsers((current) =>
        current.map((user) => {
          if (user.id !== userId) return user;
          const next = { ...user, ...updates };
          const nextRole = next.kind === 'external' ? 'invite' : next.role;
          const updatedUser = {
            ...next,
            role: nextRole,
            name: formatUserName(next),
          };
          syncUpsert('users', updatedUser);
          return updatedUser;
        }),
      );
    },
    deleteUser: (userId) => {
      const fallbackOwner = activeUsers.find((user) => user.id !== userId && user.kind === 'internal' && user.role !== 'invite') ?? null;
      const archivedAt = formatTimestamp();
      const userSnapshot = users.filter((user) => user.id === userId);
      const projectSnapshots = projects.filter((project) => project.ownerId === userId);
      const taskSnapshots = tasks.filter((task) => task.ownerId === userId);

      setUsers((current) => archiveEntities(current, new Set([userId]), archivedAt));
      if (fallbackOwner) {
        setProjects((current) => current.map((project) => (project.ownerId === userId ? { ...project, ownerId: fallbackOwner.id } : project)));
        setTasks((current) => current.map((task) => (task.ownerId === userId ? { ...task, ownerId: fallbackOwner.id } : task)));
      }

      persistRows('users', userSnapshot.map((user) => ({ ...user, archivedAt })));
      if (fallbackOwner) {
        persistRows('projects', projectSnapshots.map((project) => ({ ...project, ownerId: fallbackOwner.id })));
        persistRows('tasks', taskSnapshots.map((task) => ({ ...task, ownerId: fallbackOwner.id })));
      }

      schedulePendingArchive(`Utilisateur archivé`, () => {
        setUsers((current) => mergeSnapshots(current, userSnapshot));
        setProjects((current) => mergeSnapshots(current, projectSnapshots));
        setTasks((current) => mergeSnapshots(current, taskSnapshots));
        persistRows('users', userSnapshot);
        persistRows('projects', projectSnapshots);
        persistRows('tasks', taskSnapshots);
      });
    },
    createCompany: (input = {}) => {
      const id = makeId('company');
      const today = new Date().toISOString().slice(0, 10);
      const newCompany = {
        id,
        name: input.name ?? 'Nouvelle entreprise',
        address: input.address ?? '',
        postalCode: input.postalCode ?? '',
        city: input.city ?? '',
        phone: input.phone ?? '',
        siret: input.siret ?? '',
        category: input.category ?? 'prospect',
        createdAt: input.createdAt ?? today,
        acquisitionChannel: input.acquisitionChannel ?? 'Inbound',
      };
      setCompanies((current) => [...current, newCompany]);
      syncUpsert('companies', newCompany);
      return id;
    },
    updateCompany: (companyId, updates) => {
      setCompanies((current) =>
        current.map((company) => {
          if (company.id !== companyId) return company;
          const updatedCompany = { ...company, ...updates };
          syncUpsert('companies', updatedCompany);
          return updatedCompany;
        }),
      );
    },
    deleteCompany: (companyId) => {
      const archivedAt = formatTimestamp();
      const companySnapshots = companies.filter((company) => company.id === companyId);
      const contactSnapshots = contacts.filter((contact) => contact.companyId === companyId);
      const contactIds = new Set(contactSnapshots.map((contact) => contact.id));
      const dealSnapshots = deals.filter((deal) => contactIds.has(deal.clientId));
      const dealIds = new Set(dealSnapshots.map((deal) => deal.id));
      const projectSnapshots = projects.filter((project) => dealIds.has(project.dealId));
      const projectIds = new Set(projectSnapshots.map((project) => project.id));
      const taskSnapshots = tasks.filter((task) => projectIds.has(task.projectId));
      const taskIds = new Set(taskSnapshots.map((task) => task.id));
      const commentSnapshots = taskComments.filter((comment) => taskIds.has(comment.taskId));
      const notificationSnapshots = notifications.filter((notification) => notification.taskId && taskIds.has(notification.taskId));

      setCompanies((current) => archiveEntities(current, new Set([companyId]), archivedAt));
      setContacts((current) => archiveEntities(current, contactIds, archivedAt));
      setDeals((current) => archiveEntities(current, dealIds, archivedAt));
      setProjects((current) => archiveEntities(current, projectIds, archivedAt));
      setTasks((current) => archiveEntities(current, taskIds, archivedAt));
      setTaskComments((current) => archiveEntities(current, new Set(commentSnapshots.map((comment) => comment.id)), archivedAt));
      setNotifications((current) => archiveEntities(current, new Set(notificationSnapshots.map((notification) => notification.id)), archivedAt));

      persistRows('companies', companySnapshots.map((company) => ({ ...company, archivedAt })));
      persistRows('contacts', contactSnapshots.map((contact) => ({ ...contact, archivedAt })));
      persistRows('deals', dealSnapshots.map((deal) => ({ ...deal, archivedAt })));
      persistRows('projects', projectSnapshots.map((project) => ({ ...project, archivedAt })));
      persistRows('tasks', taskSnapshots.map((task) => ({ ...task, archivedAt })));
      persistRows('task_comments', commentSnapshots.map((comment) => ({ ...comment, archivedAt })));
      persistRows('notifications', notificationSnapshots.map((notification) => ({ ...notification, archivedAt })));

      schedulePendingArchive(`Entreprise archivée`, () => {
        setCompanies((current) => mergeSnapshots(current, companySnapshots));
        setContacts((current) => mergeSnapshots(current, contactSnapshots));
        setDeals((current) => mergeSnapshots(current, dealSnapshots));
        setProjects((current) => mergeSnapshots(current, projectSnapshots));
        setTasks((current) => mergeSnapshots(current, taskSnapshots));
        setTaskComments((current) => mergeSnapshots(current, commentSnapshots));
        setNotifications((current) => mergeSnapshots(current, notificationSnapshots));
        persistRows('companies', companySnapshots);
        persistRows('contacts', contactSnapshots);
        persistRows('deals', dealSnapshots);
        persistRows('projects', projectSnapshots);
        persistRows('tasks', taskSnapshots);
        persistRows('task_comments', commentSnapshots);
        persistRows('notifications', notificationSnapshots);
      });
    },
    createContact: (input = {}) => {
      const id = makeId('contact');
      const fallbackCompanyId = input.companyId ?? activeCompanies[0]?.id ?? '';
      const today = new Date().toISOString().slice(0, 10);
      const newContact = {
        id,
        civility: input.civility ?? 'M.',
        firstName: input.firstName ?? 'Nouveau',
        lastName: input.lastName ?? 'contact',
        category: input.category ?? 'prospect',
        phone: input.phone ?? '',
        secondaryPhone: input.secondaryPhone,
        secondaryPhoneLabel: input.secondaryPhoneLabel,
        email: input.email ?? '',
        companyId: fallbackCompanyId,
        createdAt: input.createdAt ?? today,
        acquisitionChannel: input.acquisitionChannel ?? 'Inbound',
        lastInteractionAt: input.lastInteractionAt ?? today,
      };
      setContacts((current) => [...current, newContact]);
      syncUpsert('contacts', newContact);
      return id;
    },
    updateContact: (contactId, updates) => {
      setContacts((current) =>
        current.map((contact) => {
          if (contact.id !== contactId) return contact;
          const updatedContact = { ...contact, ...updates };
          syncUpsert('contacts', updatedContact);
          return updatedContact;
        }),
      );
    },
    deleteContact: (contactId) => {
      const archivedAt = formatTimestamp();
      const contactSnapshots = contacts.filter((contact) => contact.id === contactId);
      const dealSnapshots = deals.filter((deal) => deal.clientId === contactId);
      const relatedProjectIds = new Set(dealSnapshots.map((deal) => deal.id));
      const projectSnapshots = projects.filter((project) => relatedProjectIds.has(project.dealId));
      const projectIds = new Set(projectSnapshots.map((project) => project.id));
      const taskSnapshots = tasks.filter((task) => projectIds.has(task.projectId));
      const taskIds = new Set(taskSnapshots.map((task) => task.id));
      const commentSnapshots = taskComments.filter((comment) => taskIds.has(comment.taskId));
      const notificationSnapshots = notifications.filter((notification) => (notification.taskId && taskIds.has(notification.taskId)) || (notification.userId === contactId));

      setContacts((current) => archiveEntities(current, new Set([contactId]), archivedAt));
      setDeals((current) => archiveEntities(current, new Set(dealSnapshots.map((deal) => deal.id)), archivedAt));
      setProjects((current) => archiveEntities(current, new Set(projectSnapshots.map((project) => project.id)), archivedAt));
      setTasks((current) => archiveEntities(current, new Set(taskSnapshots.map((task) => task.id)), archivedAt));
      setTaskComments((current) => archiveEntities(current, new Set(commentSnapshots.map((comment) => comment.id)), archivedAt));
      setNotifications((current) => archiveEntities(current, new Set(notificationSnapshots.map((notification) => notification.id)), archivedAt));

      persistRows('contacts', contactSnapshots.map((contact) => ({ ...contact, archivedAt })));
      persistRows('deals', dealSnapshots.map((deal) => ({ ...deal, archivedAt })));
      persistRows('projects', projectSnapshots.map((project) => ({ ...project, archivedAt })));
      persistRows('tasks', taskSnapshots.map((task) => ({ ...task, archivedAt })));
      persistRows('task_comments', commentSnapshots.map((comment) => ({ ...comment, archivedAt })));
      persistRows('notifications', notificationSnapshots.map((notification) => ({ ...notification, archivedAt })));

      schedulePendingArchive(`Contact archivé`, () => {
        setContacts((current) => mergeSnapshots(current, contactSnapshots));
        setDeals((current) => mergeSnapshots(current, dealSnapshots));
        setProjects((current) => mergeSnapshots(current, projectSnapshots));
        setTasks((current) => mergeSnapshots(current, taskSnapshots));
        setTaskComments((current) => mergeSnapshots(current, commentSnapshots));
        setNotifications((current) => mergeSnapshots(current, notificationSnapshots));
        persistRows('contacts', contactSnapshots);
        persistRows('deals', dealSnapshots);
        persistRows('projects', projectSnapshots);
        persistRows('tasks', taskSnapshots);
        persistRows('task_comments', commentSnapshots);
        persistRows('notifications', notificationSnapshots);
      });
    },
    createDeal: (input = {}) => {
      const id = makeId('deal');
      const clientId = input.clientId ?? activeContacts[0]?.id ?? '';
      const today = new Date().toISOString().slice(0, 10);
      const newDeal = {
        id,
        title: input.title ?? 'Nouvelle affaire',
        clientId,
        status: input.status ?? 'Nouveau',
        date: input.date ?? new Date().toISOString().slice(0, 10),
        amount: input.amount ?? 0,
        createdAt: input.createdAt ?? today,
        expectedCloseDate: input.expectedCloseDate ?? input.date ?? today,
        closedAt: input.closedAt,
        outcome: input.outcome ?? 'pending',
        description: input.description ?? '',
        notes: input.notes ?? '',
        lines: input.lines ?? [],
      };
      setDeals((current) => [...current, newDeal]);
      syncUpsert('deals', newDeal);
      return id;
    },
    updateDeal: (dealId, updates) => {
      setDeals((current) =>
        current.map((deal) => {
          if (deal.id !== dealId) return deal;
          const updatedDeal = { ...deal, ...updates };
          syncUpsert('deals', updatedDeal);
          return updatedDeal;
        }),
      );
    },
    updateDealLine: (dealId, lineId, updates) => {
      setDeals((current) =>
        current.map((deal) => {
          if (deal.id !== dealId) return deal;
          const updatedDeal = { ...deal, lines: deal.lines.map((line) => (line.id === lineId ? { ...line, ...updates } : line)) };
          syncUpsert('deals', updatedDeal);
          return updatedDeal;
        }),
      );
    },
    reorderDealLines: (dealId, sourceIndex, destinationIndex) => {
      setDeals((current) =>
        current.map((deal) => {
          if (deal.id !== dealId) return deal;
          const updatedDeal = { ...deal, lines: moveItem(deal.lines, sourceIndex, destinationIndex) };
          syncUpsert('deals', updatedDeal);
          return updatedDeal;
        }),
      );
    },
    moveDealToStatus: (dealId, status) => {
      setDeals((current) =>
        current.map((deal) => {
          if (deal.id !== dealId) return deal;
          const updatedDeal = { ...deal, status };
          syncUpsert('deals', updatedDeal);
          return updatedDeal;
        }),
      );
    },
    deleteDeal: (dealId) => {
      const archivedAt = formatTimestamp();
      const dealSnapshots = deals.filter((deal) => deal.id === dealId);
      const projectSnapshots = projects.filter((project) => project.dealId === dealId);
      const projectIds = new Set(projectSnapshots.map((project) => project.id));
      const taskSnapshots = tasks.filter((task) => projectIds.has(task.projectId));
      const taskIds = new Set(taskSnapshots.map((task) => task.id));
      const commentSnapshots = taskComments.filter((comment) => taskIds.has(comment.taskId));
      const notificationSnapshots = notifications.filter((notification) => notification.taskId && taskIds.has(notification.taskId));

      setDeals((current) => archiveEntities(current, new Set([dealId]), archivedAt));
      setProjects((current) => archiveEntities(current, projectIds, archivedAt));
      setTasks((current) => archiveEntities(current, taskIds, archivedAt));
      setTaskComments((current) => archiveEntities(current, new Set(commentSnapshots.map((comment) => comment.id)), archivedAt));
      setNotifications((current) => archiveEntities(current, new Set(notificationSnapshots.map((notification) => notification.id)), archivedAt));

      persistRows('deals', dealSnapshots.map((deal) => ({ ...deal, archivedAt })));
      persistRows('projects', projectSnapshots.map((project) => ({ ...project, archivedAt })));
      persistRows('tasks', taskSnapshots.map((task) => ({ ...task, archivedAt })));
      persistRows('task_comments', commentSnapshots.map((comment) => ({ ...comment, archivedAt })));
      persistRows('notifications', notificationSnapshots.map((notification) => ({ ...notification, archivedAt })));

      schedulePendingArchive(`Affaire archivée`, () => {
        setDeals((current) => mergeSnapshots(current, dealSnapshots));
        setProjects((current) => mergeSnapshots(current, projectSnapshots));
        setTasks((current) => mergeSnapshots(current, taskSnapshots));
        setTaskComments((current) => mergeSnapshots(current, commentSnapshots));
        setNotifications((current) => mergeSnapshots(current, notificationSnapshots));
        persistRows('deals', dealSnapshots);
        persistRows('projects', projectSnapshots);
        persistRows('tasks', taskSnapshots);
        persistRows('task_comments', commentSnapshots);
        persistRows('notifications', notificationSnapshots);
      });
    },
    createProject: (input = {}) => {
      const id = makeId('project');
      const dealId = input.dealId ?? activeDeals[0]?.id ?? '';
      const today = new Date().toISOString().slice(0, 10);
      const defaultEndDate = new Date();
      defaultEndDate.setDate(defaultEndDate.getDate() + 30);
      const newProject = {
        id,
        title: input.title ?? 'Nouveau projet',
        type: input.type ?? getDefaultProjectType(appSettings),
        dealId,
        ownerId: input.ownerId ?? defaultInternalOwner?.id ?? '',
        status: input.status ?? appSettings.projectStatuses[0] ?? defaultAppSettings.projectStatuses[0],
        startDate: input.startDate ?? today,
        endDate: input.endDate ?? defaultEndDate.toISOString().slice(0, 10),
        budget: input.budget ?? 0,
        health: input.health ?? 'Vert',
        tasks: [],
      };
      setProjects((current) => [...current, newProject]);
      syncUpsert('projects', newProject);
      return id;
    },
    updateProject: (projectId, updates) => {
      setProjects((current) =>
        current.map((project) => {
          if (project.id !== projectId) return project;
          const updatedProject = { ...project, ...updates };
          syncUpsert('projects', updatedProject);
          return updatedProject;
        }),
      );
    },
    moveProjectToStatus: (projectId, status) => {
      setProjects((current) =>
        current.map((project) => {
          if (project.id !== projectId) return project;
          const updatedProject = { ...project, status };
          syncUpsert('projects', updatedProject);
          return updatedProject;
        }),
      );
    },
    deleteProject: (projectId) => {
      const archivedAt = formatTimestamp();
      const projectSnapshots = projects.filter((project) => project.id === projectId);
      const taskSnapshots = tasks.filter((task) => task.projectId === projectId);
      const taskIds = new Set(taskSnapshots.map((task) => task.id));
      const commentSnapshots = taskComments.filter((comment) => taskIds.has(comment.taskId));
      const notificationSnapshots = notifications.filter((notification) => notification.taskId && taskIds.has(notification.taskId));

      setProjects((current) => archiveEntities(current, new Set([projectId]), archivedAt));
      setTasks((current) => archiveEntities(current, taskIds, archivedAt));
      setTaskComments((current) => archiveEntities(current, new Set(commentSnapshots.map((comment) => comment.id)), archivedAt));
      setNotifications((current) => archiveEntities(current, new Set(notificationSnapshots.map((notification) => notification.id)), archivedAt));

      persistRows('projects', projectSnapshots.map((project) => ({ ...project, archivedAt })));
      persistRows('tasks', taskSnapshots.map((task) => ({ ...task, archivedAt })));
      persistRows('task_comments', commentSnapshots.map((comment) => ({ ...comment, archivedAt })));
      persistRows('notifications', notificationSnapshots.map((notification) => ({ ...notification, archivedAt })));

      schedulePendingArchive(`Projet archivé`, () => {
        setProjects((current) => mergeSnapshots(current, projectSnapshots));
        setTasks((current) => mergeSnapshots(current, taskSnapshots));
        setTaskComments((current) => mergeSnapshots(current, commentSnapshots));
        setNotifications((current) => mergeSnapshots(current, notificationSnapshots));
        persistRows('projects', projectSnapshots);
        persistRows('tasks', taskSnapshots);
        persistRows('task_comments', commentSnapshots);
        persistRows('notifications', notificationSnapshots);
      });
    },
    createTask: (input = {}) => {
      const id = makeId('task');
      const projectId = input.projectId ?? activeProjects[0]?.id ?? '';
      const nextParentTaskId = input.parentTaskId ?? null;
      const nextOrder = activeTasks.filter((task) => task.projectId === projectId && (task.parentTaskId ?? null) === nextParentTaskId).length + 1;
      const today = new Date().toISOString().slice(0, 10);
      const resolvedState = input.state ?? appSettings.taskStates[0] ?? defaultAppSettings.taskStates[0];
      const ownerId = input.ownerId ?? defaultInternalOwner?.id ?? '';
      const title = input.title ?? 'Nouvelle tâche';
      const newTask = {
        id,
        title,
        ownerId,
        projectId,
        parentTaskId: nextParentTaskId,
        order: input.order ?? nextOrder,
        state: resolvedState,
        dueDate: input.dueDate ?? today,
        priority: input.priority ?? getDefaultTaskPriority(appSettings),
        category: input.category ?? getDefaultTaskCategory(appSettings),
        createdAt: input.createdAt ?? today,
        completedAt: input.completedAt ?? (resolvedState === completedTaskState ? today : undefined),
        estimatedHours: input.estimatedHours ?? 1,
        description: input.description ?? '',
        checklist: input.checklist ?? [],
      };
      setTasks((current) => [...current, newTask]);
      syncUpsert('tasks', newTask);
      if (ownerId) {
        const newNotification = {
          id: makeId('notification'),
          userId: ownerId,
          type: 'task_assigned' as const,
          taskId: id,
          title: 'Nouvelle tâche attribuée',
          body: `${title} vous a été attribuée.`,
          createdAt: formatTimestamp(),
          read: false,
        };
        setNotifications((current) => [...current, newNotification]);
        void syncNotificationAfter('tasks', newTask, newNotification);
      }
      return id;
    },
    updateTask: (taskId, updates) => {
      const previousTask = tasks.find((task) => task.id === taskId);
      setTasks((current) =>
        current.map((task) => {
          if (task.id !== taskId) return task;
          const next = { ...task, ...updates };
          if (updates.state && !updates.completedAt) {
            if (updates.state === completedTaskState) {
              next.completedAt = task.completedAt ?? new Date().toISOString().slice(0, 10);
            } else if (task.state === completedTaskState) {
              next.completedAt = undefined;
            }
          }
          syncUpsert('tasks', next);
          return next;
        }),
      );
      if (updates.ownerId && previousTask && updates.ownerId !== previousTask.ownerId) {
        const notification = {
          id: makeId('notification'),
          userId: updates.ownerId!,
          type: 'task_assigned' as const,
          taskId,
          title: 'Nouvelle tâche attribuée',
          body: `${updates.title ?? previousTask.title} vous a été attribuée.`,
          createdAt: formatTimestamp(),
          read: false,
        };
        setNotifications((current) => [...current, notification]);
        if (previousTask) {
          const updatedTask = { ...previousTask, ...updates };
          void syncNotificationAfter('tasks', updatedTask as Task, notification);
        }
      }
    },
    reorderTasksInProject: (projectId, orderedTaskIds) => {
      setTasks((current) => {
        const updated = current.map((task) => {
          if (task.projectId !== projectId) return task;
          const index = orderedTaskIds.indexOf(task.id);
          return index === -1 ? task : { ...task, order: index + 1 };
        });
        syncUpsertRows('tasks', updated.filter((task) => task.projectId === projectId));
        return updated;
      });
    },
    reorderTaskSiblings: (orderedTaskIds, parentTaskId, updates = {}) => {
      setTasks((current) => {
        const siblingIds = new Set(orderedTaskIds);
        const updated = current.map((task) => {
          if (!siblingIds.has(task.id)) return task;
          const nextIndex = orderedTaskIds.indexOf(task.id);
          return {
            ...task,
            ...updates,
            parentTaskId,
            order: nextIndex + 1,
          };
        });

        const descendantIds = orderedTaskIds.flatMap((taskId) => collectDescendantTaskIds(updated, taskId));
        const cascaded = updated.map((task) => {
          if (!descendantIds.includes(task.id)) return task;
          return {
            ...task,
            projectId: updates.projectId ?? task.projectId,
            ownerId: updates.ownerId ?? task.ownerId,
          };
        });

        const normalized = normalizeSiblingOrders(cascaded, parentTaskId, updates.projectId, updates.ownerId);
        syncUpsertRows('tasks', normalized.filter((task) => siblingIds.has(task.id) || descendantIds.includes(task.id)));
        return normalized;
      });
    },
    moveTaskToParent: (taskId, parentTaskId, updates = {}) => {
      setTasks((current) => {
        if (parentTaskId === taskId) return current;
        if (parentTaskId && isDescendantTask(current, parentTaskId, taskId)) return current;

        const movedTask = current.find((task) => task.id === taskId);
        if (!movedTask) return current;

        const nextParent = parentTaskId ? current.find((task) => task.id === parentTaskId) ?? null : null;
        const nextProjectId = updates.projectId ?? nextParent?.projectId ?? movedTask.projectId;
        const nextOwnerId = updates.ownerId ?? nextParent?.ownerId ?? movedTask.ownerId;
        const nextState = updates.state ?? movedTask.state;
        const nextDueDate = updates.dueDate ?? movedTask.dueDate;

        const targetSiblings = current.filter((task) => task.id !== taskId && (task.parentTaskId ?? null) === parentTaskId && task.projectId === nextProjectId);
        const nextOrder = targetSiblings.length + 1;

        const updated = current.map((task) =>
          task.id === taskId
            ? {
                ...task,
                parentTaskId,
                projectId: nextProjectId,
                ownerId: nextOwnerId,
                state: nextState,
                dueDate: nextDueDate,
                order: nextOrder,
              }
            : task,
        );

        const descendants = collectDescendantTaskIds(updated, taskId);
        const cascaded = updated.map((task) => {
          if (!descendants.includes(task.id)) return task;
          return {
            ...task,
            projectId: nextProjectId,
            ownerId: updates.ownerId ?? task.ownerId,
          };
        });

        const normalized = normalizeSiblingOrders(
          normalizeSiblingOrders(cascaded, movedTask.parentTaskId ?? null, movedTask.projectId),
          parentTaskId,
          nextProjectId,
        );
        syncUpsertRows('tasks', normalized);
        return normalized;
      });
    },
    updateTaskChecklistItem: (taskId, itemId, updates) => {
      setTasks((current) =>
        current.map((task) => {
          if (task.id !== taskId) return task;
          const updatedTask = { ...task, checklist: task.checklist.map((item) => (item.id === itemId ? { ...item, ...updates } : item)) };
          syncUpsert('tasks', updatedTask);
          return updatedTask;
        }),
      );
    },
    createTaskComment: (taskId, content, mentionUserIds = []) => {
      const author = currentUser ?? defaultInternalOwner;
      if (!author) return '';
      if (!content.trim()) return '';

      const commentId = makeId('comment');
      const createdAt = formatTimestamp();
      const uniqueMentionIds = Array.from(new Set(mentionUserIds.filter(Boolean)));
      const normalizedContent = content.trim();
      const relatedTask = tasks.find((task) => task.id === taskId);
      const newComment = {
        id: commentId,
        taskId,
        authorId: author.id,
        content: normalizedContent,
        createdAt,
        mentionUserIds: uniqueMentionIds,
      };

      setTaskComments((current) => [...current, newComment]);
      syncUpsert('task_comments', newComment);

      if (relatedTask) {
        const shouldNotifyOwner = Boolean(relatedTask.ownerId) && (relatedTask.ownerId !== author.id || uniqueMentionIds.includes(author.id));
        const targetUserIds = Array.from(
          new Set(
            [
              ...(shouldNotifyOwner ? [relatedTask.ownerId] : []),
              ...uniqueMentionIds,
            ].filter(Boolean),
          ),
        );

        if (targetUserIds.length > 0) {
          const newNotifications = targetUserIds.map((userId) => ({
            id: makeId('notification'),
            userId,
            type: 'task_comment' as const,
            taskId,
            commentId,
            title: 'Nouveau commentaire',
            body: `${author.firstName} a commenté "${relatedTask.title}" : ${truncateText(normalizedContent)}`,
            createdAt,
            read: false,
          }));
          setNotifications((current) => [...current, ...newNotifications]);
          void syncNotificationAfter('task_comments', newComment, newNotifications);
        }
      }

      return commentId;
    },
    setNotificationReadState: (notificationId, read) => {
      setNotifications((current) =>
        current.map((notification) => {
          if (notification.id !== notificationId) return notification;
          const updatedNotification = { ...notification, read };
          syncUpsert('notifications', updatedNotification);
          return updatedNotification;
        }),
      );
    },
    deleteTask: (taskId) => {
      const archivedAt = formatTimestamp();
      const toArchive = new Set([taskId, ...collectDescendantTaskIds(tasks, taskId)]);
      const taskSnapshots = tasks.filter((task) => toArchive.has(task.id));
      const commentSnapshots = taskComments.filter((comment) => toArchive.has(comment.taskId));
      const notificationSnapshots = notifications.filter((notification) => notification.taskId && toArchive.has(notification.taskId));

      setTasks((current) => archiveEntities(current, new Set(taskSnapshots.map((task) => task.id)), archivedAt));
      setTaskComments((current) => archiveEntities(current, new Set(commentSnapshots.map((comment) => comment.id)), archivedAt));
      setNotifications((current) => archiveEntities(current, new Set(notificationSnapshots.map((notification) => notification.id)), archivedAt));

      persistRows('tasks', taskSnapshots.map((task) => ({ ...task, archivedAt })));
      persistRows('task_comments', commentSnapshots.map((comment) => ({ ...comment, archivedAt })));
      persistRows('notifications', notificationSnapshots.map((notification) => ({ ...notification, archivedAt })));

      schedulePendingArchive(`Tâche archivée`, () => {
        setTasks((current) => mergeSnapshots(current, taskSnapshots));
        setTaskComments((current) => mergeSnapshots(current, commentSnapshots));
        setNotifications((current) => mergeSnapshots(current, notificationSnapshots));
        persistRows('tasks', taskSnapshots);
        persistRows('task_comments', commentSnapshots);
        persistRows('notifications', notificationSnapshots);
      });
    },
  }), [activeCompanies, activeContacts, activeDeals, activeNotifications, activeProjects, activeTaskComments, activeTasks, activeUsers, appSettings, companies, completedTaskState, contacts, currentUser, deals, defaultInternalOwner, isReady, lastSyncError, notifications, projects, taskComments, tasks, users]);

  useEffect(() => () => {
    if (archiveTimeoutRef.current) {
      window.clearTimeout(archiveTimeoutRef.current);
    }
  }, []);

  return (
    <DataContext.Provider value={value}>
      {children}
      {pendingArchive && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-[80]">
          <div className={`pointer-events-auto w-[22rem] rounded-2xl border p-4 shadow-2xl ${isDark ? 'border-slate-700 bg-slate-800 text-white' : 'border-black/10 bg-white text-slate-900'}`}>
            <div className="space-y-3">
              <p className="text-sm font-medium">{pendingArchive.message}</p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Disponible pendant 30 secondes avant archivage définitif dans l’interface.</p>
              <div className="flex justify-end">
                <button onClick={pendingArchive.undo} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}
