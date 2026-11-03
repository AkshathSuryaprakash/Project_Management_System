import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "../config/http.config";
import { getMemberRoleInWorkspace } from "../services/member.service";
import {
  createAttachmentService,
  deleteAttachmentService,
  getAttachmentsByTaskIdService,
} from "../services/attachment.service";
import { z } from "zod";

const createAttachmentSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
  fileType: z.string().min(1),
  fileData: z.string().min(1),
});

export const getAttachmentsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { workspaceId, taskId } = req.params;

    await getMemberRoleInWorkspace(userId, workspaceId);

    const { attachments } = await getAttachmentsByTaskIdService(
      workspaceId,
      taskId
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Attachments fetched successfully",
      attachments,
    });
  }
);

export const createAttachmentController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { workspaceId, taskId } = req.params;
    const body = createAttachmentSchema.parse(req.body);

    await getMemberRoleInWorkspace(userId, workspaceId);

    const { attachment } = await createAttachmentService(
      workspaceId,
      taskId,
      userId.toString(),
      body
    );

    return res.status(HTTPSTATUS.CREATED).json({
      message: "Attachment uploaded successfully",
      attachment,
    });
  }
);

export const deleteAttachmentController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { workspaceId, attachmentId } = req.params;

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);

    await deleteAttachmentService(
      workspaceId,
      attachmentId,
      userId.toString(),
      role
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Attachment deleted successfully",
    });
  }
);

