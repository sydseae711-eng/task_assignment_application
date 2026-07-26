// Client-side validation for subtask input trees before they're submitted to the API.
import type { SubtaskInput } from "../types/index.ts";

export function hasBlankSubtaskTitle(subtasks: SubtaskInput[]): boolean {
  return subtasks.some((st) => !st.title.trim() || hasBlankSubtaskTitle(st.subtasks));
}
