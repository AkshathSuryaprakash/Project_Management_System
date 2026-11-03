import AttachmentModel from "../models/attachment.model";
import TaskModel from "../models/task.model";
import { NotFoundException, ForbiddenException, BadRequestException } from "../utils/appError";
import { logActivity } from "./activity.service";
import { emitWorkspaceEvent } from "../socket/socket.config";
import { Roles } from "../enums/role.enum";

export const getAttachmentsByTaskIdService = async (
  workspaceId: string,
  taskId: string
) => {
  const task = await TaskModel.findOne({ _id: taskId, workspace: workspaceId });
  if (!task) {
    throw new NotFoundException("Task not found in this workspace");
  }

  const attachments = await AttachmentModel.find({
    workspaceId,
    taskId,
  })
    .sort({ createdAt: -1 })
    .populate("userId", "name email profilePicture");

  return { attachments };
};

export const createAttachmentService = async (
  workspaceId: string,
  taskId: string,
  userId: string,
  file: {
    fileName: string;
    fileSize: number;
    fileType: string;
    fileData: string;
  }
) => {
  const task = await TaskModel.findOne({ _id: taskId, workspace: workspaceId });
  if (!task) {
    throw new NotFoundException("Task not found in this workspace");
  }

  // Max size 15MB
  if (file.fileSize > 15 * 1024 * 1024) {
    throw new BadRequestException("File size exceeds 15MB limit.");
  }

  const attachment = new AttachmentModel({
    workspaceId,
    taskId,
    userId,
    fileName: file.fileName,
    fileSize: file.fileSize,
    fileType: file.fileType,
    fileData: file.fileData,
  });

  await attachment.save();
  await attachment.populate("userId", "name email profilePicture");

  // Log activity
  await logActivity({
    userId,
    workspaceId,
    taskId,
    projectId: task.project,
    action: "UPLOAD_ATTACHMENT",
    details: `Uploaded file "${file.fileName}" to task "${task.title}"`,
  });

  emitWorkspaceEvent(workspaceId, "attachment:created", attachment);

  return { attachment };
};

export const deleteAttachmentService = async (
  workspaceId: string,
  attachmentId: string,
  userId: string,
  userRole: string
) => {
  const attachment = await AttachmentModel.findOne({
    _id: attachmentId,
    workspaceId,
  });
  if (!attachment) {
    throw new NotFoundException("Attachment not found");
  }

  if (
    userRole === Roles.MEMBER &&
    attachment.userId.toString() !== userId.toString()
  ) {
    throw new ForbiddenException("You can only delete your own attachments.");
  }

  await AttachmentModel.findByIdAndDelete(attachmentId);

  emitWorkspaceEvent(workspaceId, "attachment:deleted", { attachmentId });

  return { success: true };
};

