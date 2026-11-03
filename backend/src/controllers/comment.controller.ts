import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "../config/http.config";
import { getMemberRoleInWorkspace } from "../services/member.service";
import {
  createCommentService,
  deleteCommentService,
  getCommentsByTaskIdService,
} from "../services/comment.service";
import { z } from "zod";

const createCommentSchema = z.object({
  content: z.string().trim().min(1, "Comment content cannot be empty"),
});

export const getCommentsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { workspaceId, taskId } = req.params;

    await getMemberRoleInWorkspace(userId, workspaceId);

    const { comments } = await getCommentsByTaskIdService(workspaceId, taskId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Comments fetched successfully",
      comments,
    });
  }
);

export const createCommentController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { workspaceId, taskId } = req.params;
    const { content } = createCommentSchema.parse(req.body);

    await getMemberRoleInWorkspace(userId, workspaceId);

    const { comment } = await createCommentService(
      workspaceId,
      taskId,
      userId.toString(),
      content
    );

    return res.status(HTTPSTATUS.CREATED).json({
      message: "Comment added successfully",
      comment,
    });
  }
);

export const deleteCommentController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { workspaceId, commentId } = req.params;

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);

    await deleteCommentService(workspaceId, commentId, userId.toString(), role);

    return res.status(HTTPSTATUS.OK).json({
      message: "Comment deleted successfully",
    });
  }
);

