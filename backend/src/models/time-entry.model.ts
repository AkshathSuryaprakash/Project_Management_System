import mongoose, { Document, Schema } from "mongoose";

export interface TimeEntryDocument extends Document {
  workspaceId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date | null;
  duration: number; // in seconds
  status: "RUNNING" | "COMPLETED";
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const timeEntrySchema = new Schema<TimeEntryDocument>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["RUNNING", "COMPLETED"],
      default: "RUNNING",
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

timeEntrySchema.index({ workspaceId: 1, taskId: 1, createdAt: -1 });
timeEntrySchema.index({ userId: 1, status: 1 });
timeEntrySchema.index({ workspaceId: 1, userId: 1, createdAt: -1 });

const TimeEntryModel = mongoose.model<TimeEntryDocument>(
  "TimeEntry",
  timeEntrySchema
);

export default TimeEntryModel;
