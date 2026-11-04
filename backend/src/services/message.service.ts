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
  const normalizedConvId = conversationId.toLowerCase().startsWith("channel:")
    ? conversationId.toLowerCase()
    : conversationId;

  // If direct message, ensure the user is part of the conversation
  if (normalizedConvId.startsWith("dm:")) {
    const participants = normalizedConvId.replace("dm:", "").split("_");
    if (!participants.includes(userId.toString())) {
      throw new ForbiddenException("You cannot view this direct message conversation.");
    }
  }

  const messages = await MessageModel.find({
    workspaceId,
    conversationId: normalizedConvId,
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

  // 1. If conversationId is explicitly provided, prioritize and lock destination
  if (convId) {
    if (convId.toLowerCase().startsWith("channel:")) {
      channelName = convId.replace(/channel:/i, "").toLowerCase();
      convId = `channel:${channelName}`;
      recipientId = undefined;
    } else if (convId.startsWith("dm:")) {
      const parts = convId.replace("dm:", "").split("_");
      if (parts.length === 2) {
        if (parts[0] !== parts[1]) {
          // Normal 1-on-1 DM between two users: target the OTHER participant
          if (parts[0] === senderId) {
            recipientId = parts[1];
          } else if (parts[1] === senderId) {
            recipientId = parts[0];
          } else {
            throw new ForbiddenException("You are not a participant in this conversation.");
          }
          convId = getConversationIdHelper("dm", recipientId, senderId);
        } else {
          // Explicit self-conversation (Personal Notes)
          recipientId = senderId;
          convId = `dm:${senderId}_${senderId}`;
        }
      }
    }
  } else if (channelName) {
    channelName = channelName.toLowerCase();
    convId = `channel:${channelName}`;
    recipientId = undefined;
  } else if (recipientId) {
    convId = getConversationIdHelper("dm", recipientId, senderId);
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

export const getRecentConversationsService = async (
  workspaceId: string,
  userId: string
) => {
  const messages = await MessageModel.find({
    workspaceId,
    conversationId: { $regex: /^dm:/ },
    $or: [{ senderId: userId }, { recipientId: userId }],
  })
    .sort({ createdAt: -1 })
    .limit(300)
    .populate("senderId", "name email profilePicture")
    .populate("recipientId", "name email profilePicture");

  const conversationsMap = new Map<string, any>();

  for (const msg of messages) {
    const convId = msg.conversationId;
    const sId = (msg.senderId as any)?._id?.toString() || msg.senderId?.toString();
    const rId = (msg.recipientId as any)?._id?.toString() || msg.recipientId?.toString();

    if (!conversationsMap.has(convId)) {
      const isSelf = sId === userId.toString() && (!rId || rId === userId.toString());
      const partner = isSelf
        ? msg.senderId
        : sId === userId.toString()
        ? msg.recipientId
        : msg.senderId;

      const unread = !msg.readBy.map((id: any) => id?.toString()).includes(userId.toString()) ? 1 : 0;

      conversationsMap.set(convId, {
        conversationId: convId,
        partner,
        isSelf,
        lastMessage: {
          _id: msg._id,
          content: msg.content,
          senderId: msg.senderId,
          createdAt: msg.createdAt,
        },
        unreadCount: unread,
      });
    } else {
      const existing = conversationsMap.get(convId);
      if (!msg.readBy.map((id: any) => id?.toString()).includes(userId.toString())) {
        existing.unreadCount += 1;
      }
    }
  }

  return { conversations: Array.from(conversationsMap.values()) };
};


