import prisma from "../prismaClient.js";
import { AppError } from "../types/index.js";
import type { TaskCreateInput, TaskUpdateInput, SubtaskInput } from "../types/index.js";
import { validateAssignment, validateAssignmentBySkillIds } from "./taskAssignmentService.js";
import { resolveSkills } from "./skillResolutionService.js";

const taskFlatInclude = {
  skills: { include: { skill: true } },
  developer: true,
};

const MAX_SUBTASK_DEPTH = Number(process.env.MAX_SUBTASK_DEPTH) || 3;
const MAX_SUBTASKS_PER_LEVEL = Number(process.env.MAX_SUBTASKS_PER_LEVEL) || 10;

export function checkSubtaskLimits(subtaskCount: number, depth: number): string | undefined {
  if (subtaskCount > MAX_SUBTASKS_PER_LEVEL) {
    return `Too many subtasks at one level (max ${MAX_SUBTASKS_PER_LEVEL})`;
  }
  if (depth > MAX_SUBTASK_DEPTH) {
    return `Subtask nesting exceeds max depth of ${MAX_SUBTASK_DEPTH}`;
  }
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTree(tasks: any[]): any[] {
  const map = new Map<number, any>();
  const roots: any[] = [];

  for (const task of tasks) {
    map.set(task.id, { ...task, subtasks: [] });
  }

  for (const task of tasks) {
    const node = map.get(task.id)!;
    if (task.parentId && map.has(task.parentId)) {
      map.get(task.parentId)!.subtasks.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findTaskInTree(nodes: any[], id: number): any | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findTaskInTree(node.subtasks, id);
    if (found) return found;
  }
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildSubtaskData(subtasks: SubtaskInput[], depth = 1): Promise<any[]> {
  const limitError = checkSubtaskLimits(subtasks.length, depth);
  if (limitError) throw new AppError(400, limitError);

  return Promise.all(
    subtasks.map(async (st) => {
      const resolved = await resolveSkills(st.title, st.skillIds);
      return {
        title: st.title,
        skills: resolved.skillIds.length > 0
          ? { create: resolved.skillIds.map((skillId) => ({ skill: { connect: { id: skillId } } })) }
          : undefined,
        subtasks: st.subtasks && st.subtasks.length > 0
          ? { create: await buildSubtaskData(st.subtasks, depth + 1) }
          : undefined,
      };
    })
  );
}

export function findFirstTodoSubtask(
  subtasks: { title: string; status: string }[]
): string | undefined {
  return subtasks.find((st) => st.status === "TODO")?.title;
}

async function canMarkDone(taskId: number): Promise<{ valid: boolean; reason?: string }> {
  const subtasks = await prisma.task.findMany({
    where: { parentId: taskId },
  });

  const todoTitle = findFirstTodoSubtask(subtasks);
  if (todoTitle) {
    return { valid: false, reason: `Subtask '${todoTitle}' is not done` };
  }

  for (const subtask of subtasks) {
    const nested = await canMarkDone(subtask.id);
    if (!nested.valid) return nested;
  }

  return { valid: true };
}

export async function getAllTasks() {
  const tasks = await prisma.task.findMany({
    include: taskFlatInclude,
    orderBy: { createdAt: "desc" },
  });
  return buildTree(tasks);
}

export async function getTaskById(id: number) {
  const tasks = await prisma.task.findMany({
    include: taskFlatInclude,
    orderBy: { createdAt: "desc" },
  });
  const found = findTaskInTree(buildTree(tasks), id);
  if (!found) throw new AppError(404, "Task not found");
  return found;
}

export async function createTask(input: TaskCreateInput) {
  let resolvedSkillIds: number[];
  let subtaskCreateData: Awaited<ReturnType<typeof buildSubtaskData>> = [];

  try {
    ({ skillIds: resolvedSkillIds } = await resolveSkills(input.title, input.skillIds));
    if (input.subtasks && input.subtasks.length > 0) {
      subtaskCreateData = await buildSubtaskData(input.subtasks);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof Error && err.name === "PrismaClientValidationError") throw err;
    const reason = err instanceof Error ? err.message : String(err);
    throw new AppError(
      502,
      `Failed to auto-detect required skills using AI. Try again or specify skills manually. (${reason})`
    );
  }

  const data: Parameters<typeof prisma.task.create>[0]["data"] = {
    title: input.title,
  };

  if (input.developerId !== undefined) {
    const validation = await validateAssignmentBySkillIds(resolvedSkillIds, input.developerId);
    if (!validation.valid) {
      throw new AppError(
        400,
        `Developer does not have the required skill(s) for this task: ${validation.missingSkills?.join(", ")}`,
        { missingSkills: validation.missingSkills }
      );
    }
    data.developer = { connect: { id: input.developerId } };
  }

  if (resolvedSkillIds.length > 0) {
    data.skills = {
      create: resolvedSkillIds.map((skillId) => ({
        skill: { connect: { id: skillId } },
      })),
    };
  }

  if (subtaskCreateData.length > 0) {
    data.subtasks = {
      create: subtaskCreateData,
    };
  }

  return prisma.task.create({
    data,
    include: taskFlatInclude,
  });
}

export async function updateTask(id: number, input: TaskUpdateInput) {
  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, "Task not found");

  if (input.developerId !== undefined) {
    if (input.developerId !== null) {
      const validation = await validateAssignment(id, input.developerId);
      if (!validation.valid) {
        throw new AppError(
          400,
          `Developer does not have the required skill(s) for this task: ${validation.missingSkills?.join(", ")}`,
          { missingSkills: validation.missingSkills }
        );
      }
    }
  }

  if (input.status === "DONE") {
    const check = await canMarkDone(id);
    if (!check.valid) {
      throw new AppError(400, `Cannot mark task as Done. ${check.reason}.`);
    }
  }

  const updateData: Parameters<typeof prisma.task.update>[0]["data"] = {};

  if (input.title !== undefined) updateData.title = input.title;
  if (input.status !== undefined) updateData.status = input.status;

  if (input.developerId !== undefined) {
    if (input.developerId === null) {
      updateData.developer = { disconnect: true };
    } else {
      updateData.developer = { connect: { id: input.developerId } };
    }
  }

  return prisma.task.update({
    where: { id },
    data: updateData,
    include: taskFlatInclude,
  });
}
