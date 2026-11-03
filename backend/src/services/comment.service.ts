import CommentModel from "../models/comment.model";
import TaskModel from "../models/task.model";
import { NotFoundException, ForbiddenException } from "../utils/appError";
import { logActivity } from "./activity.service";
import { emitWorkspaceEvent } from "../socket/socket.config";
import { Roles } from "../enums/role.enum";

export const getCommentsByTaskIdService = async (
  workspaceId: string,
  taskId: string
) => {
  const task = await TaskModel.findOne({ _id: taskId, workspace: workspaceId });
  if (!task) {
    throw new NotFoundException("Task not found in this workspace");
  }

  const comments = await CommentModel.find({
    workspaceId,
    taskId,
  })
    .sort({ createdAt: 1 })
    .populate("userId", "name email profilePicture");

  return { comments };
};

export const createCommentService = async (
  workspaceId: string,
  taskId: string,
  userId: string,
  content: string
) => {
  const task = await TaskModel.findOne({ _id: taskId, workspace: workspaceId });
  if (!task) {
    throw new NotFoundException("Task not found in this workspace");
  }

  const comment = new CommentModel({
    workspaceId,
    taskId,
    userId,
    content,
  });

  await comment.save();
  await comment.populate("userId", "name email profilePicture");

  // Log activity
  await logActivity({
    userId,
    workspaceId,
    taskId,
    projectId: task.project,
    action: "CREATE_COMMENT",
    details: `Added a comment on task "${task.title}"`,
  });

  // Real-time broadcast to workspace
  emitWorkspaceEvent(workspaceId, "comment:created", comment);

  return { comment };
};

export const deleteCommentService = async (
  workspaceId: string,
  commentId: string,
  userId: string,
  userRole: string
) => {
  const comment = await CommentModel.findOne({ _id: commentId, workspaceId });
  if (!comment) {
    throw new NotFoundException("Comment not found");
  }

  if (
    userRole === Roles.MEMBER &&
    comment.userId.toString() !== userId.toString()
  ) {
    throw new ForbiddenException("You can only delete your own comments.");
  }

  await CommentModel.findByIdAndDelete(commentId);

  emitWorkspaceEvent(workspaceId, "comment:deleted", { commentId });

  return { success: true };
};

