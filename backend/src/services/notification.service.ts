import mongoose from "mongoose";
import NotificationModel from "../models/notification.model";
import { emitToUser } from "../socket/socket.config";

export const createNotificationService = async (params: {
  userId: string | mongoose.Types.ObjectId;
  workspaceId: string | mongoose.Types.ObjectId;
  type: string;
  message: string;
  relatedTaskId?: string | mongoose.Types.ObjectId | null;
}) => {
  try {
    const notification = new NotificationModel({
      userId: params.userId,
      workspaceId: params.workspaceId,
      type: params.type,
      message: params.message,
      relatedTaskId: params.relatedTaskId || null,
      isRead: false,
    });
    await notification.save();

    // Emit live notification to recipient
    emitToUser(params.userId.toString(), "notification:received", notification);

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    return null;
  }
};

export const getUserNotificationsService = async (
  userId: string,
  workspaceId: string
) => {
  const notifications = await NotificationModel.find({
    userId,
    workspaceId,
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("relatedTaskId", "title taskCode status priority");

  const unreadCount = await NotificationModel.countDocuments({
    userId,
    workspaceId,
    isRead: false,
  });

  return { notifications, unreadCount };
};

export const markNotificationAsReadService = async (
  notificationId: string,
  userId: string
) => {
  const notification = await NotificationModel.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true },
    { new: true }
  );
  return { notification };
};

export const markAllNotificationsAsReadService = async (
  userId: string,
  workspaceId: string
) => {
  await NotificationModel.updateMany(
    { userId, workspaceId, isRead: false },
    { isRead: true }
  );
  return { success: true };
};

