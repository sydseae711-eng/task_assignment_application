// Seed script: populates the database with a fixed set of skills and developers for local/demo use.
import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const skills = ["Frontend", "Backend"];

const developers = [
  { name: "Alice", skills: ["Frontend"] },
  { name: "Bob", skills: ["Backend"] },
  { name: "Carol", skills: ["Frontend", "Backend"] },
  { name: "Dave", skills: ["Backend"] },
];

async function main() {
  console.log("Seeding database...");

  for (const skillName of skills) {
    await prisma.skill.upsert({
      where: { name: skillName },
      update: {},
      create: { name: skillName },
    });
  }
  console.log(`Seeded ${skills.length} skills`);

  for (const dev of developers) {
    const developer = await prisma.developer.upsert({
      where: { name: dev.name },
      update: {},
      create: { name: dev.name },
    });

    const skillRecords = await prisma.skill.findMany({
      where: { name: { in: dev.skills } },
    });

    for (const skill of skillRecords) {
      await prisma.developerSkill.upsert({
        where: {
          developerId_skillId: {
            developerId: developer.id,
            skillId: skill.id,
          },
        },
        update: {},
        create: {
          developerId: developer.id,
          skillId: skill.id,
        },
      });
    }
    console.log(`Seeded developer: ${dev.name} with skills: ${dev.skills.join(", ")}`);
  }

  console.log("Database seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
