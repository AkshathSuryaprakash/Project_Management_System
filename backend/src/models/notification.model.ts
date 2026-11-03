import mongoose, { Document, Schema } from "mongoose";

export interface NotificationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  type: string;
  message: string;
  relatedTaskId?: mongoose.Types.ObjectId | null;
  isRead: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedTaskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

notificationSchema.index({ userId: 1, workspaceId: 1, isRead: 1, createdAt: -1 });

const NotificationModel = mongoose.model<NotificationDocument>(
  "Notification",
  notificationSchema
);

export default NotificationModel;

