// Helpers for working with the recursive task/subtask tree returned by the API.
import type { Task } from "../types/index.ts";

export function replaceTaskInTree(tasks: Task[], updated: Task): Task[] {
  return tasks.map((task) =>
    task.id === updated.id
      ? { ...updated, subtasks: task.subtasks }
      : { ...task, subtasks: replaceTaskInTree(task.subtasks, updated) }
  );
}

export function countSubtasks(subtasks: Task[] | undefined): { total: number; done: number } {
  let total = 0;
  let done = 0;
  for (const st of subtasks ?? []) {
    total++;
    if (st.status === "DONE") done++;
    const nested = countSubtasks(st.subtasks);
    total += nested.total;
    done += nested.done;
  }
  return { total, done };
}
