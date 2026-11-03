import mongoose, { Document, Schema } from "mongoose";

export interface AttachmentDocument extends Document {
  userId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileData: string;
  createdAt: Date;
}

const attachmentSchema = new Schema<AttachmentDocument>(
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
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileData: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

attachmentSchema.index({ workspaceId: 1, taskId: 1, createdAt: 1 });

const AttachmentModel = mongoose.model<AttachmentDocument>(
  "Attachment",
  attachmentSchema
);

export default AttachmentModel;

