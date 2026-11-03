import mongoose, { Document, Schema } from "mongoose";

export interface CommentDocument extends Document {
  userId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<CommentDocument>(
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
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ workspaceId: 1, taskId: 1, createdAt: 1 });

const CommentModel = mongoose.model<CommentDocument>("Comment", commentSchema);

export default CommentModel;

