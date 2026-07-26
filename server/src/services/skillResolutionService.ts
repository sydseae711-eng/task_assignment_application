// Decides which skill ids apply to a task/subtask: uses user-supplied skillIds if given, otherwise falls back to LLM-based auto-detection.
import prisma from "../prismaClient.js";
import { identifySkills } from "./llmService.js";
import { AppError } from "../types/index.js";

interface ResolveSkillsResult {
  skillIds: number[];
  source: "user" | "llm";
}

export async function resolveSkills(
  taskTitle: string,
  userSpecifiedSkillIds: number[] | undefined
): Promise<ResolveSkillsResult> {
  if (userSpecifiedSkillIds && userSpecifiedSkillIds.length > 0) {
    const dedupedIds = [...new Set(userSpecifiedSkillIds)];
    const existing = await prisma.skill.findMany({
      where: { id: { in: dedupedIds } },
    });
    const existingIds = new Set(existing.map((s) => s.id));
    const unknownIds = dedupedIds.filter((id) => !existingIds.has(id));
    if (unknownIds.length > 0) {
      throw new AppError(400, `Unknown skill id(s): ${unknownIds.join(", ")}`);
    }
    return { skillIds: dedupedIds, source: "user" };
  }

  const names = await identifySkills(taskTitle);
  if (names.length === 0) {
    return { skillIds: [], source: "llm" };
  }

  const allSkills = await prisma.skill.findMany();
  const matchedIds = new Set<number>();

  for (const name of names) {
    const match = allSkills.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (match) matchedIds.add(match.id);
  }

  return { skillIds: [...matchedIds], source: "llm" };
}
