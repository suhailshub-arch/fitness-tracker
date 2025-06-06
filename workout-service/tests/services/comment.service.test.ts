/**
 * tests/services/comment.service.test.ts
 */

import { BadRequest } from "../../src/utils/ApiError.js";
import { prisma } from "../../src/prismaClient.js";
import { postCommentService } from "../../src/services/comments.service.js";

jest.mock("../../src/prismaClient.js", () => ({
  __esModule: true,
  prisma: {
    comment: {
      create: jest.fn(),
    },
  },
}));

describe("postCommentService", () => {
  const mockCreate = (prisma.comment.create as jest.Mock);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls prisma.comment.create with correct data and returns result", async () => {
    // Arrange
    const params = {
      text: "Nice workout!",
      userId: "user123",
      workoutId: "wk789",
    };
    const fakeResult = {
      userId: "user123",
      text: "Nice workout!",
      createdAt: new Date("2025-06-15T10:00:00.000Z"),
    };
    mockCreate.mockResolvedValue(fakeResult);

    // Act
    const result = await postCommentService(params);

    // Assert
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        userId: "user123",
        text: "Nice workout!",
        workoutId: "wk789",
      },
      select: {
        userId: true,
        text: true,
        createdAt: true,
      },
    });
    expect(result).toBeUndefined(); // Service does not return anything explicitly
  });

  it("throws BadRequest if text is not a string", async () => {
    // Arrange: text is a number
    const params = { text: 123, userId: "u1", workoutId: "w1" };

    // Act & Assert
    // @ts-ignore
    await expect(postCommentService(params)).rejects.toThrow(BadRequest("`text` must be a string"));

    // prisma.comment.create should not have been called
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("propagates unexpected errors from prisma.comment.create", async () => {
    // Arrange
    const params = {
      text: "All good",
      userId: "user456",
      workoutId: "wk456",
    };
    const prismaError = new Error("Database down");
    mockCreate.mockRejectedValue(prismaError);

    // Act & Assert
    await expect(postCommentService(params)).rejects.toThrow("Database down");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
