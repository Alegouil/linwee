import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Send, SmilePlus } from 'lucide-react';
import { NestedTaskList } from './NestedTaskList';
import { AutocompleteField } from './AutocompleteField';
import { Modal } from './Modal';
import { UserAvatar } from './UserAvatar';
import { useData } from '../context/DataContext';
import type { Project, Task, User } from '../types';

interface TaskDetailContentProps {
  task: Task;
  tasks: Task[];
  projects: Project[];
  users: User[];
  isDark: boolean;
  draggedTaskId: string | null;
  onSetDraggedTaskId: (taskId: string | null) => void;
  onOpenTask: (taskId: string) => void;
  onCreateSubtask: () => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onMoveTaskToParent: (taskId: string, parentTaskId: string | null, updates?: Partial<Pick<Task, 'ownerId' | 'projectId' | 'state' | 'dueDate'>>) => void;
  onReorderTaskSiblings: (orderedTaskIds: string[], parentTaskId: string | null, updates?: Partial<Pick<Task, 'ownerId' | 'projectId' | 'state' | 'dueDate'>>) => void;
  onRequestSave: () => void;
  onRequestDelete: () => void;
}

const quickEmojis = ['😀', '👍', '🎯', '🔥', '✅', '🚀', '👀', '🙏'];
const extendedEmojis = [
  '😀', '😄', '😁', '😊', '😉', '😍', '🥳', '😎', '🤝', '👏', '🙌', '🙏',
  '👍', '👎', '👌', '✌️', '🤞', '🫶', '💡', '🧠', '🎯', '🚀', '🔥', '⚡',
  '✅', '❌', '⏳', '📌', '📝', '📣', '📞', '📅', '💬', '👀', '🤔', '😅',
  '😮', '😴', '😤', '🥲', '🤯', '💪', '🫡', '❤️', '💙', '💚', '🧡', '⭐',
];

function mentionToken(name: string) {
  return `@{${name}}`;
}

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function TaskDetailContent({
  task,
  tasks,
  projects,
  users,
  isDark,
  draggedTaskId,
  onSetDraggedTaskId,
  onOpenTask,
  onCreateSubtask,
  onUpdateTask,
  onMoveTaskToParent,
  onReorderTaskSiblings,
  onRequestSave,
  onRequestDelete,
}: TaskDetailContentProps) {
  const { appSettings, currentUser, taskComments, createTaskComment } = useData();
  const [commentDraft, setCommentDraft] = useState('');
  const [mentionUserIds, setMentionUserIds] = useState<string[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [emojiModalOpen, setEmojiModalOpen] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);

  const comments = useMemo(
    () =>
      taskComments
        .filter((comment) => comment.taskId === task.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [task.id, taskComments],
  );

  const mentionQuery = useMemo(() => {
    const textarea = commentInputRef.current;
    const cursor = textarea?.selectionStart ?? commentDraft.length;
    const contentBeforeCursor = commentDraft.slice(0, cursor);
    const match = contentBeforeCursor.match(/(?:^|\s)@([^\s@]{1,40})$/);
    return match?.[1]?.toLowerCase() ?? '';
  }, [commentDraft]);

  const mentionSuggestions = useMemo(
    () => (mentionQuery ? users.filter((user) => user.name.toLowerCase().includes(mentionQuery)).slice(0, 5) : []),
    [mentionQuery, users],
  );

  useEffect(() => {
    setMentionIndex(0);
  }, [mentionQuery]);

  const syncMentionIdsFromContent = (content: string) => {
    const nextMentionIds = users
      .filter((user) => content.includes(mentionToken(user.name)) || content.includes(`@${user.name}`))
      .map((user) => user.id);
    setMentionUserIds(Array.from(new Set(nextMentionIds)));
  };

  const insertMention = (user: User) => {
    const textarea = commentInputRef.current;
    const cursor = textarea?.selectionStart ?? commentDraft.length;
    const contentBeforeCursor = commentDraft.slice(0, cursor);
    const contentAfterCursor = commentDraft.slice(cursor);
    const nextBeforeCursor = contentBeforeCursor.replace(/(?:^|\s)@([^\s@]{1,40})$/, (match) => {
      const prefix = match.startsWith(' ') ? ' ' : '';
      return `${prefix}${mentionToken(user.name)} `;
    });
    const nextDraft = `${nextBeforeCursor}${contentAfterCursor}`;
    setCommentDraft(nextDraft);
    syncMentionIdsFromContent(nextDraft);
    window.setTimeout(() => {
      textarea?.focus();
      const nextCursor = nextBeforeCursor.length;
      textarea?.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  const insertEmoji = (emoji: string) => {
    const textarea = commentInputRef.current;
    const cursor = textarea?.selectionStart ?? commentDraft.length;
    const nextDraft = `${commentDraft.slice(0, cursor)}${emoji}${commentDraft.slice(cursor)}`;
    setCommentDraft(nextDraft);
    window.setTimeout(() => {
      textarea?.focus();
      const nextCursor = cursor + emoji.length;
      textarea?.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  const activeMention = mentionSuggestions[mentionIndex] ?? mentionSuggestions[0] ?? null;

  const handleCommentKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionSuggestions.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setMentionIndex((current) => (current + 1) % mentionSuggestions.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setMentionIndex((current) => (current - 1 + mentionSuggestions.length) % mentionSuggestions.length);
      return;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      if (activeMention) {
        insertMention(activeMention);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      const textarea = commentInputRef.current;
      if (!textarea) return;
      const cursor = textarea.selectionStart ?? commentDraft.length;
      const nextDraft = `${commentDraft.slice(0, cursor).replace(/(?:^|\s)@([^\s@]{1,40})$/, '')}${commentDraft.slice(cursor)}`;
      setCommentDraft(nextDraft);
      syncMentionIdsFromContent(nextDraft);
    }
  };

  const submitComment = () => {
    const commentId = createTaskComment(task.id, commentDraft, mentionUserIds);
    if (!commentId) return;
    setCommentDraft('');
    setMentionUserIds([]);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Titre" value={task.title} onChange={(value) => onUpdateTask(task.id, { title: value })} isDark={isDark} required />
        <AutocompleteField label="Propriétaire" value={task.ownerId} options={users.map((user) => ({ id: user.id, label: user.name, meta: roleLabel(user.role) }))} onChange={(id) => onUpdateTask(task.id, { ownerId: id })} required />
        <AutocompleteField label="Projet" value={task.projectId} options={projects.map((project) => ({ id: project.id, label: project.title }))} onChange={(id) => onUpdateTask(task.id, { projectId: id })} required />
        <label className="space-y-2"><span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>État *</span><select value={task.state} onChange={(event) => onUpdateTask(task.id, { state: event.target.value as Task['state'] })} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`}>{appSettings.taskStates.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
        <label className="space-y-2"><span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Priorité *</span><select value={task.priority} onChange={(event) => onUpdateTask(task.id, { priority: event.target.value as Task['priority'] })} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`}>{appSettings.taskPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
        <label className="space-y-2"><span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Catégorie *</span><select value={task.category} onChange={(event) => onUpdateTask(task.id, { category: event.target.value as Task['category'] })} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`}>{appSettings.taskCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
        <label className="space-y-2"><span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Échéance *</span><input type="date" value={task.dueDate} onChange={(event) => onUpdateTask(task.id, { dueDate: event.target.value })} style={isDark ? { colorScheme: 'dark' } : undefined} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`} /></label>
        <label className="space-y-2 md:col-span-2"><span className={`text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Description</span><textarea value={task.description} onChange={(event) => onUpdateTask(task.id, { description: event.target.value })} rows={4} className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-slate-600 bg-slate-700 text-white' : 'border-black/10 bg-white'}`} /></label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Sous-tâches</h3>
          <button onClick={onCreateSubtask} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">Ajouter</button>
        </div>
        <NestedTaskList
          tasks={tasks}
          users={users}
          projects={projects}
          isDark={isDark}
          rootParentTaskId={task.id}
          draggedTaskId={draggedTaskId}
          onDragStart={onSetDraggedTaskId}
          onDragEnd={() => onSetDraggedTaskId(null)}
          onOpenTask={onOpenTask}
          onUpdateTask={onUpdateTask}
          onDropBefore={(incomingTaskId, targetTaskId, parentTaskId) => {
            const siblings = tasks
              .filter((item) => (item.parentTaskId ?? null) === parentTaskId)
              .map((item) => item.id)
              .filter((id) => id !== incomingTaskId);
            const targetIndex = siblings.indexOf(targetTaskId);
            const orderedIds = [...siblings];
            orderedIds.splice(targetIndex, 0, incomingTaskId);
            onReorderTaskSiblings(orderedIds, parentTaskId);
            onSetDraggedTaskId(null);
          }}
          onDropBelow={(incomingTaskId, targetTaskId, parentTaskId) => {
            const siblings = tasks
              .filter((item) => (item.parentTaskId ?? null) === parentTaskId)
              .map((item) => item.id)
              .filter((id) => id !== incomingTaskId);
            const targetIndex = siblings.indexOf(targetTaskId);
            const orderedIds = [...siblings];
            orderedIds.splice(targetIndex + 1, 0, incomingTaskId);
            onReorderTaskSiblings(orderedIds, parentTaskId);
            onSetDraggedTaskId(null);
          }}
          onDropAsChild={(incomingTaskId, targetTaskId) => {
            onMoveTaskToParent(incomingTaskId, targetTaskId);
            onSetDraggedTaskId(null);
          }}
          emptyLabel="Aucune sous-tâche"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">Commentaires</h3>
          <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{comments.length} message(s)</span>
        </div>

        {comments.length === 0 && (
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Aucun commentaire pour le moment.</p>
        )}

        <div className="space-y-4">
          {comments.map((comment) => {
            const author = users.find((user) => user.id === comment.authorId) ?? null;
            const isMine = currentUser?.id === comment.authorId;
            return (
              <div key={comment.id} className={`flex gap-3 ${isMine ? 'justify-end' : 'justify-start'}`}>
                {!isMine && <UserAvatar user={author} size="sm" className="mt-1 shrink-0" />}
                <div className={`max-w-[85%] space-y-1 ${isMine ? 'items-end text-right' : ''}`}>
                  <div className={`flex items-center gap-2 text-xs ${isMine ? 'justify-end' : ''} ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span>{isMine ? 'Moi' : author?.name ?? 'Utilisateur'}</span>
                    <span>{formatCommentDate(comment.createdAt)}</span>
                  </div>
                  <div className={`rounded-2xl px-4 py-3 text-sm ${isMine ? 'bg-blue-600 text-white' : isDark ? 'bg-slate-700 text-slate-100' : 'bg-white text-slate-700'}`}>
                    <p className="whitespace-pre-wrap">{comment.content}</p>
                    {comment.mentionUserIds.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {comment.mentionUserIds.map((userId) => {
                          const mentionedUser = users.find((user) => user.id === userId);
                          return mentionedUser ? (
                            <span key={userId} className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${isMine ? 'bg-white/15 text-white' : isDark ? 'bg-slate-800 text-slate-200' : 'bg-blue-50 text-blue-700'}`}>
                              @{mentionedUser.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
                {isMine && <UserAvatar user={author} size="sm" className="mt-1 shrink-0" />}
              </div>
            );
          })}
        </div>

        <div className={`rounded-lg border p-3 ${isDark ? 'border-slate-600 bg-slate-700' : 'border-black/10 bg-white'}`}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-2 text-xs uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <SmilePlus className="h-3.5 w-3.5" />
              Emojis
            </span>
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className={`rounded-full px-3 py-1 text-sm ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}
              >
                {emoji}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setEmojiModalOpen(true)}
              className={`rounded-full px-3 py-1 text-sm ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}
            >
              Plus d’emojis
            </button>
          </div>

          <textarea
            ref={commentInputRef}
            value={commentDraft}
            onKeyDown={handleCommentKeyDown}
            onChange={(event) => {
              setCommentDraft(event.target.value);
              syncMentionIdsFromContent(event.target.value);
            }}
            rows={4}
            placeholder="Écrire un commentaire... Utilise @ pour mentionner quelqu’un"
            className={`w-full resize-y bg-transparent px-1 py-2 text-sm outline-none ${isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'}`}
          />
          <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Les mentions sont insérées sous forme de variable, par exemple @&#123;Jean Dupont&#125;.</p>

          {mentionSuggestions.length > 0 && (
            <div className={`mb-3 rounded-2xl border p-2 ${isDark ? 'border-slate-600 bg-slate-800' : 'border-black/10 bg-slate-50'}`}>
              <p className={`mb-2 px-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>`Entrée` ou `Tab` pour insérer la mention</p>
              {mentionSuggestions.map((user, index) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => insertMention(user)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${(mentionIndex === index ? isDark ? 'bg-slate-700' : 'bg-slate-100' : '')} ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                >
                  <UserAvatar user={user} size="sm" />
                  <div>
                    <div className="text-sm font-medium">{user.name}</div>
                    <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{mentionIndex === index ? 'Prêt à insérer' : 'Suggestion'}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <button
              onClick={submitComment}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              <Send className="h-4 w-4" />
              Envoyer
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onRequestDelete} className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-700'}`}>Supprimer</button>
        <div className="ml-auto w-full md:max-w-xs">
          <button onClick={onRequestSave} className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white">Enregistrer</button>
        </div>
      </div>

      <Modal isOpen={emojiModalOpen} onClose={() => setEmojiModalOpen(false)} title="Choisir un emoji" panelClassName="max-w-lg">
        <div className="space-y-4">
          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Choisis un emoji, vérifie le rendu, puis continue ton message.</p>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
            {extendedEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  insertEmoji(emoji);
                  setEmojiModalOpen(false);
                }}
                className={`flex h-11 items-center justify-center rounded-xl text-2xl ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </Modal>
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
