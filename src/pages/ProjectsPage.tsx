import { List, Plus, Rows3 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { AutocompleteField } from '../components/AutocompleteField';
import { ConfigBadge } from '../components/ConfigBadge';
import { NestedTaskList } from '../components/NestedTaskList';
import { PriorityBadge } from '../components/PriorityBadge';
import { TaskDetailContent } from '../components/TaskDetailContent';
import { UserBadge } from '../components/UserBadge';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';

export function ProjectsPage() {
  const { projectId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { appSettings, deals, projects, tasks, users, createProject, updateProject, moveProjectToStatus, deleteProject, createTask, updateTask, reorderTaskSiblings, moveTaskToParent, deleteTask } = useData();
  const { isDark } = useTheme();
  const projectStatuses = appSettings.projectStatuses;
  const taskStates = appSettings.taskStates;
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [taskView, setTaskView] = useState<'list' | 'kanban'>('list');
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [editError, setEditError] = useState('');
  const [projectTypeFilter, setProjectTypeFilter] = useState('all');
  const projectKanbanScrollRef = useRef<HTMLDivElement | null>(null);
  const taskKanbanScrollRef = useRef<HTMLDivElement | null>(null);
  const assignableUsers = users.filter((user) => user.kind === 'internal');
  const [newProject, setNewProject] = useState({ title: '', type: appSettings.projectTypes[0] ?? '', dealId: deals[0]?.id ?? '', ownerId: users.find((user) => user.kind === 'internal')?.id ?? '' });
  const [editProject, setEditProject] = useState({ title: '', type: '', dealId: '', ownerId: '', status: appSettings.projectStatuses[0] ?? 'Planifié' });

  const selectedProject = projects.find((project) => project.id === projectId) ?? null;
  const selectedTaskId = params.get('taskId');
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;

  useEffect(() => {
    if (!selectedProject) return;
    setEditProject({
      title: selectedProject.title,
      type: selectedProject.type,
      dealId: selectedProject.dealId,
      ownerId: selectedProject.ownerId,
      status: selectedProject.status,
    });
    setEditError('');
  }, [selectedProject?.id]);

  const handleKanbanAutoScroll = (container: HTMLDivElement | null, clientX: number) => {
    if (!container) return;
    const bounds = container.getBoundingClientRect();
    const edge = 96;
    const step = 24;

    if (clientX >= bounds.right - edge) {
      container.scrollLeft += step;
    } else if (clientX <= bounds.left + edge) {
      container.scrollLeft -= step;
    }
  };

  if (selectedProject) {
    const linkedDeal = deals.find((deal) => deal.id === selectedProject.dealId);
    const owner = assignableUsers.find((user) => user.id === selectedProject.ownerId);
    const projectTasks = [...tasks.filter((task) => task.projectId === selectedProject.id)].sort((a, b) => a.order - b.order);
    const handleSaveProject = () => {
      if (!editProject.title.trim()) {
        setEditError('Le nom du projet est obligatoire.');
        return;
      }
      if (!editProject.dealId) {
        setEditError('L’affaire liée est obligatoire.');
        return;
      }
      if (!editProject.ownerId) {
        setEditError('Le propriétaire est obligatoire.');
        return;
      }

      updateProject(selectedProject.id, {
        title: editProject.title.trim(),
        type: editProject.type,
        dealId: editProject.dealId,
        ownerId: editProject.ownerId,
        status: editProject.status,
      });
      navigate('/projects');
    };

    return (
      <div className="space-y-6">
        <div className={`rounded-2xl border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}>
          <div className={`border-b p-6 ${isDark ? 'border-slate-700' : 'border-black/10'}`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">{selectedProject.title}</h2>
              <button onClick={() => navigate('/projects')} className={`rounded-lg px-3 py-2 text-sm ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>Retour projet</button>
            </div>
            {owner && <div className="mt-3"><UserBadge user={owner} /></div>}
          </div>
          {editError && <div className={`mx-6 mt-6 rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-amber-700 bg-amber-950/40 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{editError}</div>}
          <div className="grid gap-4 p-6 md:grid-cols-2">
            <Field label="Titre" value={editProject.title} onChange={(value) => setEditProject((current) => ({ ...current, title: value }))} isDark={isDark} required />
            <label className="space-y-2"><span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Type projet</span><select value={editProject.type} onChange={(event) => setEditProject((current) => ({ ...current, type: event.target.value }))} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`}>{appSettings.projectTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
            <AutocompleteField label="Propriétaire" value={editProject.ownerId} options={assignableUsers.map((user) => ({ id: user.id, label: user.name, meta: roleLabel(user.role) }))} onChange={(id) => setEditProject((current) => ({ ...current, ownerId: id }))} required />
            <AutocompleteField label="Affaire liée" value={editProject.dealId} options={deals.map((deal) => ({ id: deal.id, label: deal.title }))} onChange={(id) => setEditProject((current) => ({ ...current, dealId: id }))} required />
            <label className="space-y-2">
              <span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>État</span>
              <select value={editProject.status} onChange={(event) => setEditProject((current) => ({ ...current, status: event.target.value as typeof projectStatuses[number] }))} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`}>
                {projectStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
          </div>

          <div className={`border-t p-6 ${isDark ? 'border-slate-700' : 'border-black/10'}`}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Tâches du projet</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setTaskView('list')} className={`rounded-lg px-3 py-2 ${taskView === 'list' ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}><List className="h-4 w-4" /></button>
                <button onClick={() => setTaskView('kanban')} className={`rounded-lg px-3 py-2 ${taskView === 'kanban' ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}><Rows3 className="h-4 w-4" /></button>
                <button onClick={() => createTask({ projectId: selectedProject.id })} className="hidden rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white md:block">Créer</button>
              </div>
            </div>

            {taskView === 'list' ? (
              <NestedTaskList
                tasks={projectTasks}
                users={assignableUsers}
                isDark={isDark}
                draggedTaskId={draggedTaskId}
                onDragStart={setDraggedTaskId}
                onDragEnd={() => setDraggedTaskId(null)}
                onOpenTask={(taskId) => setParams({ taskId })}
                onUpdateTask={updateTask}
                onDropBefore={(incomingTaskId, targetTaskId, parentTaskId) => {
                  const siblings = projectTasks
                    .filter((task) => (task.parentTaskId ?? null) === parentTaskId)
                    .map((task) => task.id)
                    .filter((taskId) => taskId !== incomingTaskId);
                  const targetIndex = siblings.indexOf(targetTaskId);
                  const orderedIds = [...siblings];
                  orderedIds.splice(targetIndex, 0, incomingTaskId);
                  reorderTaskSiblings(orderedIds, parentTaskId, { projectId: selectedProject.id });
                  setDraggedTaskId(null);
                }}
                onDropBelow={(incomingTaskId, targetTaskId, parentTaskId) => {
                  const siblings = projectTasks
                    .filter((task) => (task.parentTaskId ?? null) === parentTaskId)
                    .map((task) => task.id)
                    .filter((taskId) => taskId !== incomingTaskId);
                  const targetIndex = siblings.indexOf(targetTaskId);
                  const orderedIds = [...siblings];
                  orderedIds.splice(targetIndex + 1, 0, incomingTaskId);
                  reorderTaskSiblings(orderedIds, parentTaskId, { projectId: selectedProject.id });
                  setDraggedTaskId(null);
                }}
                onDropAsChild={(incomingTaskId, targetTaskId) => {
                  moveTaskToParent(incomingTaskId, targetTaskId, {
                    projectId: selectedProject.id,
                    ownerId: projectTasks.find((task) => task.id === incomingTaskId)?.ownerId,
                  });
                  setDraggedTaskId(null);
                }}
                emptyLabel="Aucune tâche dans ce projet"
              />
            ) : (
              <div
                ref={taskKanbanScrollRef}
                onDragOver={(event) => handleKanbanAutoScroll(taskKanbanScrollRef.current, event.clientX)}
                className="flex h-[40rem] gap-4 overflow-x-auto pb-2"
              >
                {taskStates.map((state) => (
                  <div key={state} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (!draggedTaskId) return; updateTask(draggedTaskId, { state }); setDraggedTaskId(null); }} className={`flex h-full min-w-[82vw] flex-col rounded-xl border md:min-w-[24rem] ${isDark ? 'border-slate-700 bg-slate-900/40' : 'border-black/10 bg-slate-50'}`}>
                    <div className={`border-b p-3 ${isDark ? 'border-slate-700' : 'border-black/10'}`}>{state}</div>
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                      {projectTasks.filter((task) => task.state === state).map((task) => (
                        <button key={task.id} draggable onDragStart={() => setDraggedTaskId(task.id)} onDragEnd={() => setDraggedTaskId(null)} onClick={() => setParams({ taskId: task.id })} className={`w-full rounded-xl p-4 text-left ${isDark ? 'bg-slate-700' : 'bg-white'}`}>
                          <p className="font-semibold">{task.title}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <UserBadge user={assignableUsers.find((user) => user.id === task.ownerId)} />
                            <PriorityBadge priority={task.priority} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {linkedDeal && <div className={`border-t p-6 ${isDark ? 'border-slate-700' : 'border-black/10'}`}><p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Affaire liée: {linkedDeal.title}</p></div>}
          <div className={`border-t p-6 ${isDark ? 'border-slate-700' : 'border-black/10'}`}>
            <div className="flex items-center gap-3">
              <button onClick={() => setConfirmDelete(true)} className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>Supprimer le projet</button>
              <div className="ml-auto w-full md:max-w-xs">
                <button onClick={handleSaveProject} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white">Enregistrer</button>
              </div>
            </div>
          </div>
        </div>

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
              onRequestDelete={() => deleteTask(selectedTask.id)}
            />
          )}
        </Modal>

        <Modal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} title="Confirmer la suppression">
          <div className="space-y-4"><p className={isDark ? 'text-slate-300' : 'text-slate-700'}>Supprimer le projet "{selectedProject.title}" ?</p><div className="flex gap-3"><button onClick={() => setConfirmDelete(false)} className={`flex-1 rounded-lg px-4 py-2 ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100'}`}>Annuler</button><button onClick={() => { deleteProject(selectedProject.id); setConfirmDelete(false); navigate('/projects'); }} className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white">Supprimer</button></div></div>
        </Modal>
      </div>
    );
  }

  const openCreateModal = () => {
    setNewProject({
      title: '',
      type: appSettings.projectTypes[0] ?? '',
      dealId: deals[0]?.id ?? '',
      ownerId: users.find((user) => user.kind === 'internal')?.id ?? '',
    });
    setCreateError('');
    setCreateOpen(true);
  };

  const handleCreateProject = () => {
    if (!newProject.title.trim()) {
      setCreateError('Le nom du projet est obligatoire.');
      return;
    }
    if (!newProject.dealId) {
      setCreateError('L’affaire liée est obligatoire.');
      return;
    }
    if (!newProject.ownerId) {
      setCreateError('Le propriétaire est obligatoire.');
      return;
    }

    const id = createProject({ title: newProject.title.trim(), type: newProject.type, dealId: newProject.dealId, ownerId: newProject.ownerId });
    setCreateOpen(false);
    navigate(`/projects/${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setProjectTypeFilter('all')} className={`rounded-full px-4 py-2 text-sm font-medium ${projectTypeFilter === 'all' ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>Tous</button>
          {appSettings.projectTypes.map((type) => (
            <button key={type} onClick={() => setProjectTypeFilter(type)} className={`rounded-full px-4 py-2 text-sm font-medium ${projectTypeFilter === type ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}>{type}</button>
          ))}
        </div>
        <button onClick={openCreateModal} className="hidden items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white md:flex"><Plus className="h-4 w-4" />Créer</button>
      </div>
      <div
        ref={projectKanbanScrollRef}
        onDragOver={(event) => handleKanbanAutoScroll(projectKanbanScrollRef.current, event.clientX)}
        className="flex gap-4 overflow-x-auto pb-2"
      >
        {projectStatuses.map((status) => {
          const columnProjects = projects.filter((project) => project.status === status && (projectTypeFilter === 'all' || project.type === projectTypeFilter));
          return (
            <div key={status} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (!draggedProjectId) return; moveProjectToStatus(draggedProjectId, status); setDraggedProjectId(null); }} className={`min-w-[82vw] rounded-2xl border md:min-w-[24rem] ${isDark ? 'border-slate-700 bg-slate-800' : 'border-black/10 bg-white'}`}>
              <div className={`border-b p-4 ${isDark ? 'border-slate-700' : 'border-black/10'}`}><h3 className="font-semibold">{status}</h3></div>
              <div className="space-y-3 p-4">
                {columnProjects.map((project) => (
                  <button key={project.id} draggable onDragStart={() => setDraggedProjectId(project.id)} onDragEnd={() => setDraggedProjectId(null)} onClick={() => navigate(`/projects/${project.id}`)} className={`w-full rounded-xl p-4 text-left ${isDark ? 'bg-slate-700/50 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'}`}>
                    <p className="font-semibold">{project.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <ConfigBadge label={project.type} color={appSettings.projectTypeColors[project.type] ?? '#64748b'} />
                      <UserBadge user={assignableUsers.find((user) => user.id === project.ownerId)} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Nouveau projet">
        <div className="space-y-4">
          {createError && <div className={`rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-amber-700 bg-amber-950/40 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{createError}</div>}
          <Field label="Nom" value={newProject.title} onChange={(value) => setNewProject((current) => ({ ...current, title: value }))} isDark={isDark} required />
          <label className="space-y-2"><span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Type projet</span><select value={newProject.type} onChange={(event) => setNewProject((current) => ({ ...current, type: event.target.value }))} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`}>{appSettings.projectTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          <AutocompleteField label="Affaire liée" value={newProject.dealId} options={deals.map((deal) => ({ id: deal.id, label: deal.title }))} onChange={(id) => setNewProject((current) => ({ ...current, dealId: id }))} required />
          <AutocompleteField label="Propriétaire" value={newProject.ownerId} options={assignableUsers.map((user) => ({ id: user.id, label: user.name, meta: roleLabel(user.role) }))} onChange={(id) => setNewProject((current) => ({ ...current, ownerId: id }))} required />
          <div className="flex gap-3">
            <button onClick={() => setCreateOpen(false)} className={`flex-1 rounded-lg px-4 py-2 ${isDark ? 'bg-slate-700 text-white' : 'bg-slate-100'}`}>Annuler</button>
            <button onClick={handleCreateProject} className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white">Enregistrer</button>
          </div>
        </div>
      </Modal>
      <button onClick={openCreateModal} className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl md:hidden"><Plus className="h-6 w-6" /></button>
    </div>
  );
}

function Field({ label, value, onChange, isDark, required = false }: { label: string; value: string; onChange: (value: string) => void; isDark: boolean; required?: boolean }) {
  return <label className="space-y-2"><span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{label}{required ? ' *' : ''}</span><input value={value} onChange={(event) => onChange(event.target.value)} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`} /></label>;
}

function roleLabel(role: 'admin' | 'gestion' | 'utilisateur' | 'invite') {
  if (role === 'admin') return 'Admin';
  if (role === 'gestion') return 'Gestion';
  if (role === 'invite') return 'Invité';
  return 'Utilisateur';
}
