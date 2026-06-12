import type { Task } from '../types';

export interface TaskTreeNode {
  task: Task;
  children: TaskTreeNode[];
}

export function sortTasksByOrder(tasks: Task[]) {
  return [...tasks].sort((a, b) => a.order - b.order);
}

export function buildTaskTree(tasks: Task[], parentTaskId: string | null = null): TaskTreeNode[] {
  return sortTasksByOrder(tasks)
    .filter((task) => (task.parentTaskId ?? null) === parentTaskId)
    .map((task) => ({
      task,
      children: buildTaskTree(tasks, task.id),
    }));
}

export function collectDescendantTaskIds(tasks: Task[], taskId: string): string[] {
  const directChildren = tasks.filter((task) => task.parentTaskId === taskId);
  return directChildren.flatMap((child) => [child.id, ...collectDescendantTaskIds(tasks, child.id)]);
}

export function isDescendantTask(tasks: Task[], taskId: string, parentTaskId: string) {
  return collectDescendantTaskIds(tasks, parentTaskId).includes(taskId);
}
