import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "../config/http.config";
import { getMemberRoleInWorkspace } from "../services/member.service";
import {
  getChannelsService,
  getConversationMessagesService,
  markMessagesAsReadService,
  sendMessageService,
} from "../services/message.service";
import { z } from "zod";

const sendMessageSchema = z.object({
  conversationId: z.string().optional(),
  channel: z.string().optional(),
  recipientId: z.string().optional(),
  content: z.string().trim().min(1, "Message content cannot be empty"),
  attachments: z
    .array(
      z.object({
        fileName: z.string(),
        fileSize: z.number(),
        fileType: z.string(),
        fileData: z.string(),
      })
    )
    .optional(),
  taskRef: z.string().optional(),
});

export const getChannelsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { workspaceId } = req.params;

    await getMemberRoleInWorkspace(userId, workspaceId);

    const { channels } = await getChannelsService(workspaceId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Channels fetched successfully",
      channels,
    });
  }
);

export const getConversationMessagesController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { workspaceId, conversationId } = req.params;

    await getMemberRoleInWorkspace(userId, workspaceId);

    const { messages } = await getConversationMessagesService(
      workspaceId,
      userId.toString(),
      conversationId
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Messages fetched successfully",
      messages,
    });
  }
);

export const sendMessageController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { workspaceId } = req.params;
    const body = sendMessageSchema.parse(req.body);

    await getMemberRoleInWorkspace(userId, workspaceId);

    const { message } = await sendMessageService(
      workspaceId,
      userId.toString(),
      body
    );

    return res.status(HTTPSTATUS.CREATED).json({
      message: "Message sent successfully",
      data: message,
    });
  }
);

export const markMessagesAsReadController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { workspaceId } = req.params;
    const { conversationId } = req.body;

    await getMemberRoleInWorkspace(userId, workspaceId);

    await markMessagesAsReadService(
      workspaceId,
      conversationId,
      userId.toString()
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Messages marked as read",
    });
  }
);

