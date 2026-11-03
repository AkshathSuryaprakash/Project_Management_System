import MessageModel from "../models/message.model";
import MemberModel from "../models/member.model";
import { BadRequestException, ForbiddenException, NotFoundException } from "../utils/appError";
import { emitWorkspaceEvent } from "../socket/socket.config";

export const DEFAULT_CHANNELS = ["general", "development", "testing", "design"];

export const getConversationIdHelper = (
  type: "channel" | "dm",
  target: string,
  callerId?: string
): string => {
  if (type === "channel") {
    return `channel:${target.toLowerCase()}`;
  }
  if (!callerId) {
    throw new BadRequestException("Caller ID required for direct message conversation");
  }
  const sorted = [callerId.toString(), target.toString()].sort();
  return `dm:${sorted[0]}_${sorted[1]}`;
};

export const getChannelsService = async (workspaceId: string) => {
  return {
    channels: DEFAULT_CHANNELS.map((name) => ({
      name,
      conversationId: `channel:${name}`,
    })),
  };
};

export const getConversationMessagesService = async (
  workspaceId: string,
  userId: string,
  conversationId: string,
  limit: number = 100
) => {
  // If direct message, ensure the user is part of the conversation
  if (conversationId.startsWith("dm:")) {
    const participants = conversationId.replace("dm:", "").split("_");
    if (!participants.includes(userId.toString())) {
      throw new ForbiddenException("You cannot view this direct message conversation.");
    }
  }

  const messages = await MessageModel.find({
    workspaceId,
    conversationId,
  })
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate("senderId", "name email profilePicture")
    .populate("recipientId", "name email profilePicture")
    .populate("taskRef", "title taskCode status");

  return { messages };
};

export const sendMessageService = async (
  workspaceId: string,
  senderId: string,
  data: {
    conversationId?: string;
    channel?: string;
    recipientId?: string;
    content: string;
    attachments?: Array<{
      fileName: string;
      fileSize: number;
      fileType: string;
      fileData: string;
    }>;
    taskRef?: string;
  }
) => {
  let convId = data.conversationId;

  if (!convId) {
    if (data.channel) {
      convId = `channel:${data.channel.toLowerCase()}`;
    } else if (data.recipientId) {
      convId = getConversationIdHelper("dm", data.recipientId, senderId);
    } else {
      throw new BadRequestException("Either conversationId, channel, or recipientId is required.");
    }
  }

  // If DM, verify recipient is in the workspace
  if (convId.startsWith("dm:") && data.recipientId) {
    const isMember = await MemberModel.findOne({
      workspaceId,
      userId: data.recipientId,
    });
    if (!isMember) {
      throw new NotFoundException("Recipient is not a member of this workspace.");
    }
  }

  const message = new MessageModel({
    conversationId: convId,
    workspaceId,
    senderId,
    recipientId: data.recipientId || null,
    channel: data.channel || (convId.startsWith("channel:") ? convId.replace("channel:", "") : null),
    content: data.content,
    attachments: data.attachments || [],
    taskRef: data.taskRef || null,
    readBy: [senderId],
  });

  await message.save();
  await message.populate("senderId", "name email profilePicture");
  if (message.recipientId) {
    await message.populate("recipientId", "name email profilePicture");
  }

  // Real-time broadcast to the workspace
  emitWorkspaceEvent(workspaceId, "message:received", message);

  return { message };
};

export const markMessagesAsReadService = async (
  workspaceId: string,
  conversationId: string,
  userId: string
) => {
  await MessageModel.updateMany(
    {
      workspaceId,
      conversationId,
      readBy: { $ne: userId },
    },
    {
      $addToSet: { readBy: userId },
    }
  );

  return { success: true };
};

