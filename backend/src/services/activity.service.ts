import mongoose from "mongoose";
import ActivityLogModel from "../models/activity-log.model";

export const logActivity = async (params: {
  userId: string | mongoose.Types.ObjectId;
  workspaceId: string | mongoose.Types.ObjectId;
  action: string;
  details: string;
  projectId?: string | mongoose.Types.ObjectId | null;
  taskId?: string | mongoose.Types.ObjectId | null;
}) => {
  try {
    const activity = new ActivityLogModel({
      userId: params.userId,
      workspaceId: params.workspaceId,
      action: params.action,
      details: params.details,
      projectId: params.projectId || null,
      taskId: params.taskId || null,
    });
    await activity.save();
    return activity;
  } catch (error) {
    console.error("Failed to log activity:", error);
    return null;
  }
};

export const getWorkspaceActivityService = async (
  workspaceId: string,
  limit: number = 50
) => {
  const activities = await ActivityLogModel.find({ workspaceId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("userId", "name email profilePicture")
    .populate("projectId", "name emoji")
    .populate("taskId", "title taskCode status");

  return { activities };
};

