import { prisma } from "../prismaClient.js";
import { BadRequest } from "../utils/ApiError.js";

export const postCommentService = async (params: {
  text: string;
  userId: string;
  workoutId: string;
}) => {
  const { text, userId, workoutId } = params;

  if (typeof text !== "string") {
    throw BadRequest("`text` must be a string");
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
};
