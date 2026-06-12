import { useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, List, Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ConfigBadge } from '../components/ConfigBadge';
import { Modal } from '../components/Modal';
import { NestedTaskList } from '../components/NestedTaskList';
import { PriorityBadge } from '../components/PriorityBadge';
import { TaskDetailContent } from '../components/TaskDetailContent';
import { UserBadge } from '../components/UserBadge';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';

const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(date);
}

function toKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function TasksPage() {
  const { appSettings, projects, tasks, users, createTask, updateTask, reorderTaskSiblings, moveTaskToParent, deleteTask } = useData();
  const { isDark } = useTheme();
  const [params, setParams] = useSearchParams();
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [datePreset, setDatePreset] = useState<'all' | 'last_month' | 'last_week' | 'yesterday' | 'today' | 'tomorrow' | 'this_week' | 'this_month'>('this_week');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({});
  const [collapsedOwners, setCollapsedOwners] = useState<Record<string, boolean>>({});

  const selectedTaskId = params.get('taskId');
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const assignableUsers = useMemo(() => users.filter((user) => user.kind === 'internal'), [users]);
  const filterSelectClass = `${isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-700'} h-10 rounded-xl px-3 text-sm`;

  const currentWeekStart = useMemo(() => {
    const base = startOfWeek(new Date());
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [weekOffset]);

  const days = useMemo(() => weekDays.map((label, index) => {
    const date = new Date(currentWeekStart);
    date.setDate(currentWeekStart.getDate() + index);
    return { label, date, key: toKey(date) };
  }), [currentWeekStart]);

  const filteredTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter((task) => {
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (stateFilter !== 'all' && task.state !== stateFilter) return false;
      if (ownerFilter !== 'all' && task.ownerId !== ownerFilter) return false;
      if (projectFilter !== 'all' && task.projectId !== projectFilter) return false;
      if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;

      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);
      const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
      const sameWeek = due >= startOfWeek(today) && due < new Date(startOfWeek(today).getTime() + 7 * 86400000);
      const sameMonth = due.getMonth() === today.getMonth() && due.getFullYear() === today.getFullYear();

      switch (datePreset) {
        case 'last_month': return due.getMonth() === today.getMonth() - 1 || (today.getMonth() === 0 && due.getMonth() === 11 && due.getFullYear() === today.getFullYear() - 1);
        case 'last_week': return diffDays >= -14 && diffDays < -7;
        case 'yesterday': return diffDays === -1;
        case 'today': return diffDays === 0;
        case 'tomorrow': return diffDays === 1;
        case 'this_week': return sameWeek;
        case 'this_month': return sameMonth;
        default: return true;
      }
    });
  }, [categoryFilter, datePreset, ownerFilter, priorityFilter, projectFilter, stateFilter, tasks]);

  const groupedTasksByOwner = useMemo(
    () =>
      assignableUsers
        .map((user) => ({
          user,
          tasks: filteredTasks.filter((task) => task.ownerId === user.id),
        }))
        .filter((group) => ownerFilter === 'all' || group.user.id === ownerFilter)
        .filter((group) => group.tasks.length > 0),
    [assignableUsers, filteredTasks, ownerFilter],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-end gap-3">
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:flex-none md:px-0">
          <div className="flex min-w-max gap-2">
            <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} className={`${filterSelectClass} min-w-[9.75rem] md:w-28`}><option value="all">Toutes priorités</option>{appSettings.taskPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select>
            <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)} className={`${filterSelectClass} min-w-[8.75rem] md:w-24`}><option value="all">Tous états</option>{appSettings.taskStates.map((state) => <option key={state} value={state}>{state}</option>)}</select>
            <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} className={`${filterSelectClass} min-w-[9.75rem] md:w-28`}><option value="all">Tous propriétaires</option>{assignableUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
            <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className={`${filterSelectClass} min-w-[10.5rem] md:w-32`}><option value="all">Tous projets</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}</select>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={`${filterSelectClass} min-w-[10.5rem] md:w-32`}><option value="all">Toutes catégories</option>{appSettings.taskCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
            <select value={datePreset} onChange={(event) => setDatePreset(event.target.value as typeof datePreset)} className={`${filterSelectClass} min-w-[10.5rem] md:w-32`}><option value="all">Toutes dates</option><option value="last_month">Mois dernier</option><option value="last_week">Semaine dernière</option><option value="yesterday">Hier</option><option value="today">Aujourd’hui</option><option value="tomorrow">Demain</option><option value="this_week">Cette semaine</option><option value="this_month">Ce mois-ci</option></select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('list')} className={`h-10 rounded-xl px-3 ${view === 'list' ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}><List className="h-4 w-4" /></button>
          <button onClick={() => setView('calendar')} className={`h-10 rounded-xl px-3 ${view === 'calendar' ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}><CalendarDays className="h-4 w-4" /></button>
        </div>
        <button onClick={() => { const id = createTask(); setParams({ taskId: id }); }} className="hidden h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white md:flex"><Plus className="h-4 w-4" />Créer</button>
      </div>

      {view === 'list' ? (
        <div className={`rounded-2xl border p-4 md:h-[calc(100vh-13.5rem)] md:overflow-y-auto ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}>
          <div className="space-y-4">
            {groupedTasksByOwner.length === 0 && (
              <p className={`rounded-xl p-4 text-sm ${isDark ? 'bg-slate-700/40 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>Aucune tâche pour ces filtres.</p>
            )}
            {groupedTasksByOwner.map((group) => {
              const isCollapsed = collapsedOwners[group.user.id] ?? false;
              return (
                <div key={group.user.id} className={`rounded-2xl border ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-black/10 bg-slate-50'}`}>
                  <div className={`flex items-center justify-between gap-3 border-b p-4 ${isDark ? 'border-slate-700' : 'border-black/10'}`}>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setCollapsedOwners((current) => ({ ...current, [group.user.id]: !isCollapsed }))} className={`rounded-full p-2 ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-700'}`}>
                        {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      </button>
                      <div className="space-y-1">
                        <UserBadge user={group.user} />
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{group.tasks.length} tâche(s)</p>
                      </div>
                    </div>
                    <button onClick={() => { const id = createTask({ ownerId: group.user.id }); setParams({ taskId: id }); }} className={`h-8 w-8 rounded-full text-sm ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-700'}`}>+</button>
                  </div>

                  {!isCollapsed && (
                    <div className="p-4">
                      <NestedTaskList
                        tasks={group.tasks}
                        users={assignableUsers}
                        projects={projects}
                        isDark={isDark}
                        draggedTaskId={draggedTaskId}
                        onDragStart={setDraggedTaskId}
                        onDragEnd={() => setDraggedTaskId(null)}
                        onOpenTask={(taskId) => setParams({ taskId })}
                        onUpdateTask={updateTask}
                        onDropBefore={(incomingTaskId, targetTaskId, parentTaskId) => {
                          const siblings = group.tasks
                            .filter((task) => (task.parentTaskId ?? null) === parentTaskId)
                            .map((task) => task.id)
                            .filter((taskId) => taskId !== incomingTaskId);
                          const targetIndex = siblings.indexOf(targetTaskId);
                          const orderedIds = [...siblings];
                          orderedIds.splice(targetIndex, 0, incomingTaskId);
                          reorderTaskSiblings(orderedIds, parentTaskId, { ownerId: group.user.id });
                          setDraggedTaskId(null);
                        }}
                        onDropBelow={(incomingTaskId, targetTaskId, parentTaskId) => {
                          const siblings = group.tasks
                            .filter((task) => (task.parentTaskId ?? null) === parentTaskId)
                            .map((task) => task.id)
                            .filter((taskId) => taskId !== incomingTaskId);
                          const targetIndex = siblings.indexOf(targetTaskId);
                          const orderedIds = [...siblings];
                          orderedIds.splice(targetIndex + 1, 0, incomingTaskId);
                          reorderTaskSiblings(orderedIds, parentTaskId, { ownerId: group.user.id });
                          setDraggedTaskId(null);
                        }}
                        onDropAsChild={(incomingTaskId, targetTaskId) => {
                          moveTaskToParent(incomingTaskId, targetTaskId, { ownerId: group.user.id });
                          setDraggedTaskId(null);
                        }}
                        emptyLabel="Aucune tâche pour ce propriétaire"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={`rounded-2xl border p-4 md:h-[calc(100vh-13.5rem)] ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <button onClick={() => setWeekOffset((value) => value - 1)} className={`rounded-lg p-2 ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}><ChevronLeft className="h-4 w-4" /></button>
            <p className="text-center text-sm font-medium md:text-base">{formatDay(days[0].date)} au {formatDay(days[4].date)}</p>
            <button onClick={() => setWeekOffset((value) => value + 1)} className={`rounded-lg p-2 ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-700'}`}><ChevronRight className="h-4 w-4" /></button>
          </div>

          <div className="grid gap-3 md:h-[calc(100%-3.5rem)] md:grid-cols-2 xl:grid-cols-5">
            {days.map((day) => {
              const dayTasks = filteredTasks.filter((task) => task.dueDate === day.key);
              const isCollapsed = collapsedDays[day.key] ?? false;
              return (
                <div key={day.key} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (!draggedTaskId) return; updateTask(draggedTaskId, { dueDate: day.key }); setDraggedTaskId(null); }} className={`flex min-h-0 flex-col rounded-xl border md:h-full ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-black/10 bg-slate-50'}`}>
                  <div className={`border-b p-3 ${isDark ? 'border-slate-700' : 'border-black/10'}`}><div className="flex items-center justify-between gap-2"><div><h3 className="font-semibold">{day.label}</h3><p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{formatDay(day.date)}</p></div><div className="flex items-center gap-2 md:gap-1"><button onClick={() => setCollapsedDays((current) => ({ ...current, [day.key]: !isCollapsed }))} className={`h-7 w-7 rounded-full text-sm md:hidden ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-700'}`}>{isCollapsed ? <ChevronDown className="mx-auto h-4 w-4" /> : <ChevronUp className="mx-auto h-4 w-4" />}</button><button onClick={() => { const id = createTask({ dueDate: day.key }); setParams({ taskId: id }); }} className={`h-7 w-7 rounded-full text-sm ${isDark ? 'bg-slate-700 text-white' : 'bg-white text-slate-700'}`}>+</button></div></div></div>
                  <div className={`${isCollapsed ? 'hidden md:flex' : 'flex'} flex-col space-y-2 p-3 md:min-h-0 md:flex-1 md:overflow-y-auto`}>
                    {dayTasks.map((task) => (
                      (() => {
                        const project = projects.find((item) => item.id === task.projectId);
                        return (
                          <button key={task.id} draggable onDragStart={() => setDraggedTaskId(task.id)} onDragEnd={() => setDraggedTaskId(null)} onClick={() => setParams({ taskId: task.id })} className={`w-full rounded-lg p-3 text-left ${isDark ? 'bg-slate-700/60 hover:bg-slate-700' : 'bg-white hover:bg-slate-100'}`}>
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="font-semibold">{task.title}</h4>
                              <PriorityBadge priority={task.priority} />
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {project && <ConfigBadge label={project.title} color={appSettings.projectTypeColors[project.type] ?? '#64748b'} className="max-w-full" />}
                              <ConfigBadge label={task.category} color={appSettings.taskCategoryColors[task.category] ?? '#64748b'} />
                            </div>
                            <div className="mt-2">
                              <UserBadge user={assignableUsers.find((user) => user.id === task.ownerId)} />
                            </div>
                          </button>
                        );
                      })()
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal isOpen={Boolean(selectedTask)} onClose={() => setParams({})} title={selectedTask?.title || ''}>
        {selectedTask && (
          <TaskDetailContent
            task={selectedTask}
            tasks={tasks}
            projects={projects}
            users={assignableUsers}
            isDark={isDark}
            draggedTaskId={draggedTaskId}
            onSetDraggedTaskId={setDraggedTaskId}
            onOpenTask={(taskId) => setParams({ taskId })}
            onCreateSubtask={() => {
              const id = createTask({ parentTaskId: selectedTask.id, projectId: selectedTask.projectId, ownerId: selectedTask.ownerId, dueDate: selectedTask.dueDate });
              setParams({ taskId: id });
            }}
            onUpdateTask={updateTask}
            onMoveTaskToParent={moveTaskToParent}
            onReorderTaskSiblings={reorderTaskSiblings}
            onRequestSave={() => setParams({})}
            onRequestDelete={() => setConfirmDelete(true)}
          />
        )}
      </Modal>
      <button onClick={() => { const id = createTask(); setParams({ taskId: id }); }} className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl md:hidden"><Plus className="h-6 w-6" /></button>

      <Modal isOpen={confirmDelete && Boolean(selectedTask)} onClose={() => setConfirmDelete(false)} title="Confirmer la suppression">
        {selectedTask && <div className="space-y-4"><p className={isDark ? 'text-slate-300' : 'text-slate-700'}>Supprimer la tâche "{selectedTask.title}" ?</p><div className="flex gap-3"><button onClick={() => setConfirmDelete(false)} className={`flex-1 rounded-lg px-4 py-2 ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100'}`}>Annuler</button><button onClick={() => { deleteTask(selectedTask.id); setConfirmDelete(false); setParams({}); }} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white">Supprimer</button></div></div>}
      </Modal>
    </div>
  );
}
