// Read-only data access for skills.
import prisma from "../prismaClient.js";
import { AppError } from "../types/index.js";

export async function getAllSkills() {
  return prisma.skill.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getSkillById(id: number) {
  const skill = await prisma.skill.findUnique({
    where: { id },
  });
  if (!skill) throw new AppError(404, "Skill not found");
  return skill;
}
