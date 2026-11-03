import mongoose, { Document, Schema } from "mongoose";

export interface MessageAttachment {
  fileName: string;
  fileSize: number;
  fileType: string;
  fileData: string;
}

export interface MessageDocument extends Document {
  conversationId: string;
  workspaceId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  recipientId?: mongoose.Types.ObjectId | null;
  channel?: string | null;
  content: string;
  attachments: MessageAttachment[];
  taskRef?: mongoose.Types.ObjectId | null;
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<MessageDocument>(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    channel: {
      type: String,
      default: null,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [
      {
        fileName: { type: String, required: true },
        fileSize: { type: Number, required: true },
        fileType: { type: String, required: true },
        fileData: { type: String, required: true },
      },
    ],
    taskRef: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

messageSchema.index({ workspaceId: 1, conversationId: 1, createdAt: 1 });
messageSchema.index({ workspaceId: 1, recipientId: 1, createdAt: 1 });
messageSchema.index({ workspaceId: 1, senderId: 1, createdAt: 1 });

const MessageModel = mongoose.model<MessageDocument>("Message", messageSchema);

export default MessageModel;

