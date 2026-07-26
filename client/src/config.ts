// maxSubtaskDepth: Infinity for unlimited subtask nesting, or a number to cap depth.
// maxSubtasksPerLevel: max number of direct children any single task/subtask can have.
// Not spec-mandated — a deliberate sanity limit to prevent unbounded subtask trees;
// kept configurable here (and matched by MAX_SUBTASK_DEPTH/MAX_SUBTASKS_PER_LEVEL on the
// server) since the exact numbers are a judgment call, not a fixed requirement.
export const config = {
  maxSubtaskDepth: 3,
  maxSubtasksPerLevel: 10,
} as const;
