import { exerciseSeedData } from "./data/exercises";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.exercise.createMany({
    data: exerciseSeedData,
    skipDuplicates: true,
  });
  console.log(`✅ Seed complete. ${result.count} new exercises created.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
  })
  .finally(async () => await prisma.$disconnect);
