import { exerciseSeedData } from "./data/exercises";
import { workoutSeedData } from "./data/workouts";
import { PrismaClient, WorkoutStatus } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

const fixedWorkoutSeedData = workoutSeedData.map((w) => ({
  ...w,
  status: w.status as WorkoutStatus,
}));

async function seedExercise() {
  const result = await prisma.exercise.createMany({
    data: exerciseSeedData,
    skipDuplicates: true,
  });
  console.log(`✅ Seed complete. ${result.count} new exercises created.`);
}

async function seedWorkouts() {
  const result = await prisma.workout.createMany({
    data: fixedWorkoutSeedData,
    skipDuplicates: true,
  });
  console.log(`✅ Seed complete. ${result.count} new workouts created.`);
}

seedExercise()
  .catch((e) => {
    console.error("❌ Exercise Seed failed:", e);
  })
  .finally(async () => await prisma.$disconnect);

seedWorkouts()
  .catch((e) => {
    console.error("❌ Workout Seed failed:", e);
  })
  .finally(async () => await prisma.$disconnect);
