import MessageModel from "../models/message.model";
import MemberModel from "../models/member.model";
import { BadRequestException, ForbiddenException, NotFoundException } from "../utils/appError";
import {
  emitToConversation,
  emitToUser,
  emitWorkspaceEvent,
} from "../socket/socket.config";

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
  let recipientId = data.recipientId;
  let channelName = data.channel;

  if (channelName) {
    convId = `channel:${channelName.toLowerCase()}`;
    recipientId = undefined;
  } else if (recipientId) {
    convId = getConversationIdHelper("dm", recipientId, senderId);
  } else if (convId) {
    if (convId.startsWith("channel:")) {
      channelName = convId.replace("channel:", "");
      recipientId = undefined;
    } else if (convId.startsWith("dm:")) {
      const parts = convId.replace("dm:", "").split("_");
      if (parts.length === 2) {
        if (parts[0] === senderId) recipientId = parts[1];
        else if (parts[1] === senderId) recipientId = parts[0];
        else throw new ForbiddenException("You are not a participant in this conversation.");
        convId = getConversationIdHelper("dm", recipientId, senderId);
      }
    }
  } else {
    throw new BadRequestException("Either conversationId, channel, or recipientId is required.");
  }

  // If DM, verify recipient is a member of the workspace
  if (convId.startsWith("dm:")) {
    if (!recipientId) {
      throw new BadRequestException("Direct message recipient is required.");
    }
    const isMember = await MemberModel.findOne({
      workspaceId,
      userId: recipientId,
    });
    if (!isMember) {
      throw new NotFoundException("Recipient is not a member of this workspace.");
    }
  }

  const message = new MessageModel({
    conversationId: convId,
    workspaceId,
    senderId,
    recipientId: recipientId || null,
    channel: channelName || null,
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

  // 1. Emit to active conversation room
  emitToConversation(convId, "message:received", message);

  // 2. If DM, emit to participants' user rooms (never broadcast private messages to unrelated members)
  if (convId.startsWith("dm:") && recipientId) {
    emitToUser(recipientId.toString(), "message:received", message);
    emitToUser(senderId.toString(), "message:received", message);
  } else {
    // 3. For channels, broadcast to workspace
    emitWorkspaceEvent(workspaceId, "message:received", message);
  }

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

