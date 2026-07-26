// Read-only data access for developers (with their assigned skills).
import prisma from "../prismaClient.js";
import { AppError } from "../types/index.js";

const developerInclude = {
  skills: { include: { skill: true } },
};

export async function getAllDevelopers() {
  return prisma.developer.findMany({
    include: developerInclude,
    orderBy: { name: "asc" },
  });
}

export async function getDeveloperById(id: number) {
  const developer = await prisma.developer.findUnique({
    where: { id },
    include: developerInclude,
  });
  if (!developer) throw new AppError(404, "Developer not found");
  return developer;
}
