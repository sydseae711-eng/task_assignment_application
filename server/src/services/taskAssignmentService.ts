// Validates whether a developer has the skills required to be assigned to a task.
import prisma from "../prismaClient.js";
import { AppError } from "../types/index.js";

interface AssignmentResult {
  valid: boolean;
  missingSkills?: string[];
}

export function computeMissingSkillIds(
  requiredSkillIds: number[],
  developerSkillIds: number[]
): number[] {
  if (requiredSkillIds.length === 0) return [];
  const devSet = new Set(developerSkillIds);
  return requiredSkillIds.filter((id) => !devSet.has(id));
}

async function checkDeveloperHasSkills(
  requiredSkillIds: number[],
  developerId: number
): Promise<AssignmentResult> {
  const developer = await prisma.developer.findUnique({
    where: { id: developerId },
    include: { skills: { include: { skill: true } } },
  });

  if (!developer) throw new AppError(404, "Developer not found");

  const devSkillIds = developer.skills.map((ds) => ds.skillId);
  const missingSkillIds = computeMissingSkillIds(requiredSkillIds, devSkillIds);

  if (missingSkillIds.length === 0) return { valid: true };

  const missingSkills = await prisma.skill.findMany({
    where: { id: { in: missingSkillIds } },
  });

  return { valid: false, missingSkills: missingSkills.map((s) => s.name) };
}

export async function validateAssignment(
  taskId: number,
  developerId: number
): Promise<AssignmentResult> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { skills: true },
  });

  if (!task) throw new AppError(404, "Task not found");

  return checkDeveloperHasSkills(
    task.skills.map((ts) => ts.skillId),
    developerId
  );
}

export async function validateAssignmentBySkillIds(
  skillIds: number[],
  developerId: number
): Promise<AssignmentResult> {
  return checkDeveloperHasSkills(skillIds, developerId);
}
