import { prisma } from "../prismaClient.js";
import { BadRequest, NotFound } from "../utils/ApiError.js";

export const postCommentService = async (params: {
  text: string;
  userId: string;
  workoutId: string;
}) => {
  const { text, userId, workoutId } = params;

  if (typeof text !== "string") {
    throw BadRequest("`text` must be a string");
  }

  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    select: { id: true }, // we only need to know if it exists
  });

  if (!workout) {
    // Throw a 404 if the workoutId does not exist
    throw NotFound(`Workout with id "${workoutId}" not found`);
  }

  const posted = await prisma.comment.create({
    data: {
      userId,
      text,
      workoutId,
    },
    select: {
      userId: true,
      text: true,
      createdAt: true,
    },
  });

  return posted;
};
