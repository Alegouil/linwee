import { useEffect, useRef, useState } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { CalendarDays, Eye, GripVertical } from 'lucide-react';
import { ConfigBadge } from './ConfigBadge';
import { useData } from '../context/DataContext';
import { buildTaskTree } from '../lib/taskTree';
import type { Project, Task, User } from '../types';

interface NestedTaskListProps {
  tasks: Task[];
  users: User[];
  projects?: Project[];
  isDark: boolean;
  draggedTaskId: string | null;
  rootParentTaskId?: string | null;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
  onOpenTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDropBefore: (draggedTaskId: string, targetTaskId: string, parentTaskId: string | null) => void;
  onDropBelow: (draggedTaskId: string, targetTaskId: string, parentTaskId: string | null) => void;
  onDropAsChild: (draggedTaskId: string, targetTaskId: string) => void;
  emptyLabel?: string;
}

type EditingField = 'title' | 'owner' | 'priority' | 'state' | 'category' | 'dueDate' | null;

export function NestedTaskList({
  tasks,
  users,
  projects = [],
  isDark,
  draggedTaskId,
  rootParentTaskId = null,
  onDragStart,
  onDragEnd,
  onOpenTask,
  onUpdateTask,
  onDropBefore,
  onDropBelow,
  onDropAsChild,
  emptyLabel = 'Aucune tâche',
}: NestedTaskListProps) {
  const { appSettings } = useData();
  const tree = buildTaskTree(tasks, rootParentTaskId);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [armedChildTaskId, setArmedChildTaskId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ taskId: string | null; field: EditingField }>({ taskId: null, field: null });
  const timerRef = useRef<number | null>(null);

  const clearHoverState = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setHoveredTaskId(null);
    setArmedChildTaskId(null);
  };

  useEffect(() => () => clearHoverState(), []);

  if (tree.length === 0) {
    return <p className={`rounded-xl p-4 text-sm ${isDark ? 'bg-slate-700/40 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      <TaskTreeLevel
        nodes={tree}
        depth={0}
        users={users}
        projects={projects}
        taskStates={appSettings.taskStates}
        taskPriorities={appSettings.taskPriorities}
        taskCategories={appSettings.taskCategories}
        taskStateColors={appSettings.taskStateColors}
        taskPriorityColors={appSettings.taskPriorityColors}
        taskCategoryColors={appSettings.taskCategoryColors}
        projectTypeColors={appSettings.projectTypeColors}
        isDark={isDark}
        draggedTaskId={draggedTaskId}
        hoveredTaskId={hoveredTaskId}
        armedChildTaskId={armedChildTaskId}
        editing={editing}
        setEditing={setEditing}
        setHoveredTaskId={setHoveredTaskId}
        setArmedChildTaskId={setArmedChildTaskId}
        timerRef={timerRef}
        clearHoverState={clearHoverState}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onOpenTask={onOpenTask}
        onUpdateTask={onUpdateTask}
        onDropBefore={onDropBefore}
        onDropBelow={onDropBelow}
        onDropAsChild={onDropAsChild}
      />
    </div>
  );
}

function TaskTreeLevel({
  nodes,
  depth,
  users,
  projects,
  taskStates,
  taskPriorities,
  taskCategories,
  taskStateColors,
  taskPriorityColors,
  taskCategoryColors,
  projectTypeColors,
  isDark,
  draggedTaskId,
  hoveredTaskId,
  armedChildTaskId,
  editing,
  setEditing,
  setHoveredTaskId,
  setArmedChildTaskId,
  timerRef,
  clearHoverState,
  onDragStart,
  onDragEnd,
  onOpenTask,
  onUpdateTask,
  onDropBefore,
  onDropBelow,
  onDropAsChild,
}: {
  nodes: ReturnType<typeof buildTaskTree>;
  depth: number;
  users: User[];
  projects: Project[];
  taskStates: string[];
  taskPriorities: string[];
  taskCategories: string[];
  taskStateColors: Record<string, string>;
  taskPriorityColors: Record<string, string>;
  taskCategoryColors: Record<string, string>;
  projectTypeColors: Record<string, string>;
  isDark: boolean;
  draggedTaskId: string | null;
  hoveredTaskId: string | null;
  armedChildTaskId: string | null;
  editing: { taskId: string | null; field: EditingField };
  setEditing: Dispatch<SetStateAction<{ taskId: string | null; field: EditingField }>>;
  setHoveredTaskId: (taskId: string | null) => void;
  setArmedChildTaskId: (taskId: string | null) => void;
  timerRef: MutableRefObject<number | null>;
  clearHoverState: () => void;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
  onOpenTask: (taskId: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDropBefore: (draggedTaskId: string, targetTaskId: string, parentTaskId: string | null) => void;
  onDropBelow: (draggedTaskId: string, targetTaskId: string, parentTaskId: string | null) => void;
  onDropAsChild: (draggedTaskId: string, targetTaskId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {nodes.map((node) => {
        const task = node.task;
        const isHovering = hoveredTaskId === task.id;
        const isChildArmed = armedChildTaskId === task.id;
        const owner = users.find((user) => user.id === task.ownerId);
        const project = projects.find((item) => item.id === task.projectId);
        const isEditing = (field: EditingField) => editing.taskId === task.id && editing.field === field;

        return (
          <div key={task.id} className="space-y-3">
            <div style={{ marginLeft: depth * 20 }}>
              <div style={{ marginLeft: depth > 0 ? 20 : 0 }}>
              <div
                draggable
                onDragStart={() => onDragStart(task.id)}
                onDragEnd={() => {
                  clearHoverState();
                  onDragEnd();
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!draggedTaskId || draggedTaskId === task.id) return;
                  if (hoveredTaskId === task.id || armedChildTaskId === task.id) return;

                  if (timerRef.current) {
                    window.clearTimeout(timerRef.current);
                    timerRef.current = null;
                  }
                  setHoveredTaskId(task.id);
                  setArmedChildTaskId(null);
                  timerRef.current = window.setTimeout(() => {
                    setArmedChildTaskId(task.id);
                  }, 1000);
                }}
                onDrop={(event) => {
                  if (!draggedTaskId) return;
                  if (isChildArmed) {
                    onDropAsChild(draggedTaskId, task.id);
                  } else {
                    const bounds = event.currentTarget.getBoundingClientRect();
                    const shouldPlaceBefore = event.clientY <= bounds.top + bounds.height * 0.35;
                    if (shouldPlaceBefore) {
                      onDropBefore(draggedTaskId, task.id, task.parentTaskId ?? null);
                    } else {
                      onDropBelow(draggedTaskId, task.id, task.parentTaskId ?? null);
                    }
                  }
                  clearHoverState();
                  onDragEnd();
                }}
                className={`rounded-xl p-4 transition ${
                  isChildArmed
                    ? 'ring-2 ring-blue-500'
                    : isHovering
                      ? isDark
                        ? 'bg-slate-700/70'
                        : 'bg-slate-100'
                      : isDark
                        ? 'bg-slate-700/50'
                        : 'bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <GripVertical className={`mt-1 h-4 w-4 flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {isEditing('title') ? (
                          <InlineEditableText
                            autoFocus
                            value={task.title}
                            onChange={(value) => onUpdateTask(task.id, { title: value })}
                            onBlur={() => setEditing({ taskId: null, field: null })}
                            isDark={isDark}
                          />
                        ) : (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditing({ taskId: task.id, field: 'title' });
                            }}
                            className="max-w-full text-left font-semibold"
                          >
                            <span className="line-clamp-2">{task.title}</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {project && (
                          <ConfigBadge label={project.title} color={projectTypeColors[project.type] ?? '#64748b'} className="max-w-[12rem] truncate" />
                        )}
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            onOpenTask(task.id);
                          }}
                          className={`rounded-lg p-2 ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}
                          aria-label="Voir le détail"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isEditing('owner') ? (
                        <select
                          autoFocus
                          value={task.ownerId}
                          onChange={(event) => {
                            onUpdateTask(task.id, { ownerId: event.target.value });
                            setEditing({ taskId: null, field: null });
                          }}
                          onBlur={() => setEditing({ taskId: null, field: null })}
                          onClick={(event) => event.stopPropagation()}
                          className={`rounded-full border px-3 py-1 text-xs ${isDark ? 'border-slate-600 bg-slate-800 text-white' : 'border-black/10 bg-white text-slate-700'}`}
                        >
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditing({ taskId: task.id, field: 'owner' });
                          }}
                          className="inline-flex rounded-full px-3 py-1 text-xs font-medium text-white"
                          style={{ backgroundColor: owner?.color ?? '#64748b' }}
                        >
                          {owner?.name ?? 'Sans propriétaire'}
                        </button>
                      )}

                      {isEditing('priority') ? (
                        <select
                          autoFocus
                          value={task.priority}
                          onChange={(event) => {
                            onUpdateTask(task.id, { priority: event.target.value as Task['priority'] });
                            setEditing({ taskId: null, field: null });
                          }}
                          onBlur={() => setEditing({ taskId: null, field: null })}
                          onClick={(event) => event.stopPropagation()}
                          className={`rounded-full border px-3 py-1 text-xs ${isDark ? 'border-slate-600 bg-slate-800 text-white' : 'border-black/10 bg-white text-slate-700'}`}
                        >
                          {taskPriorities.map((priority) => (
                            <option key={priority} value={priority}>
                              {priority}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditing({ taskId: task.id, field: 'priority' });
                          }}
                          className="inline-flex"
                        >
                          <ConfigBadge label={task.priority} color={taskPriorityColors[task.priority] ?? '#64748b'} />
                        </button>
                      )}

                      {isEditing('state') ? (
                        <select
                          autoFocus
                          value={task.state}
                          onChange={(event) => {
                            onUpdateTask(task.id, { state: event.target.value as Task['state'] });
                            setEditing({ taskId: null, field: null });
                          }}
                          onBlur={() => setEditing({ taskId: null, field: null })}
                          onClick={(event) => event.stopPropagation()}
                          className={`rounded-full border px-3 py-1 text-xs ${isDark ? 'border-slate-600 bg-slate-800 text-white' : 'border-black/10 bg-white text-slate-700'}`}
                        >
                          {taskStates.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditing({ taskId: task.id, field: 'state' });
                          }}
                          className="inline-flex"
                        >
                          <ConfigBadge label={task.state} color={taskStateColors[task.state] ?? '#64748b'} />
                        </button>
                      )}

                      {isEditing('category') ? (
                        <select
                          autoFocus
                          value={task.category}
                          onChange={(event) => {
                            onUpdateTask(task.id, { category: event.target.value as Task['category'] });
                            setEditing({ taskId: null, field: null });
                          }}
                          onBlur={() => setEditing({ taskId: null, field: null })}
                          onClick={(event) => event.stopPropagation()}
                          className={`rounded-full border px-3 py-1 text-xs ${isDark ? 'border-slate-600 bg-slate-800 text-white' : 'border-black/10 bg-white text-slate-700'}`}
                        >
                          {taskCategories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditing({ taskId: task.id, field: 'category' });
                          }}
                          className="inline-flex"
                        >
                          <ConfigBadge label={task.category} color={taskCategoryColors[task.category] ?? '#64748b'} />
                        </button>
                      )}

                      {isEditing('dueDate') ? (
                        <input
                          autoFocus
                          type="date"
                          value={task.dueDate}
                          onChange={(event) => onUpdateTask(task.id, { dueDate: event.target.value })}
                          onBlur={() => setEditing({ taskId: null, field: null })}
                          onClick={(event) => event.stopPropagation()}
                          style={isDark ? { colorScheme: 'dark' } : undefined}
                          className={`rounded-full border px-3 py-1 text-xs ${isDark ? 'border-slate-600 bg-slate-800 text-white' : 'border-black/10 bg-white text-slate-700'}`}
                        />
                      ) : (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setEditing({ taskId: task.id, field: 'dueDate' });
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-700'}`}
                        >
                          <CalendarDays className={`h-3.5 w-3.5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`} />
                          {task.dueDate}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>

            {node.children.length > 0 && (
              <div style={{ marginLeft: depth * 20 }}>
                <TaskTreeLevel
                  nodes={node.children}
                  depth={depth + 1}
                  users={users}
                  projects={projects}
                  taskStates={taskStates}
                  taskPriorities={taskPriorities}
                  taskCategories={taskCategories}
                  taskStateColors={taskStateColors}
                  taskPriorityColors={taskPriorityColors}
                  taskCategoryColors={taskCategoryColors}
                  projectTypeColors={projectTypeColors}
                  isDark={isDark}
                  draggedTaskId={draggedTaskId}
                  hoveredTaskId={hoveredTaskId}
                  armedChildTaskId={armedChildTaskId}
                  editing={editing}
                  setEditing={setEditing}
                  setHoveredTaskId={setHoveredTaskId}
                  setArmedChildTaskId={setArmedChildTaskId}
                  timerRef={timerRef}
                  clearHoverState={clearHoverState}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onOpenTask={onOpenTask}
                  onUpdateTask={onUpdateTask}
                  onDropBefore={onDropBefore}
                  onDropBelow={onDropBelow}
                  onDropAsChild={onDropAsChild}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InlineEditableText({
  value,
  onChange,
  onBlur,
  autoFocus,
  isDark,
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  autoFocus?: boolean;
  isDark: boolean;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!autoFocus || !ref.current) return;
    ref.current.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(ref.current);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [autoFocus]);

  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onClick={(event) => event.stopPropagation()}
      onInput={(event) => onChange(event.currentTarget.textContent ?? '')}
      onBlur={onBlur}
      className={`block min-h-[1.75rem] rounded-md px-1 py-0.5 font-semibold outline-none ring-0 ${isDark ? 'text-white' : 'text-slate-900'}`}
    >
      {value}
    </span>
  );
}
