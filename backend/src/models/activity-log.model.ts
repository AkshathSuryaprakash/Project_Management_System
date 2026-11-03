import mongoose, { Document, Schema } from "mongoose";

export interface ActivityLogDocument extends Document {
  userId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId | null;
  taskId?: mongoose.Types.ObjectId | null;
  action: string;
  details: string;
  createdAt: Date;
}

const activityLogSchema = new Schema<ActivityLogDocument>(
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
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },
    action: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

activityLogSchema.index({ workspaceId: 1, createdAt: -1 });

const ActivityLogModel = mongoose.model<ActivityLogDocument>(
  "ActivityLog",
  activityLogSchema
);

export default ActivityLogModel;

