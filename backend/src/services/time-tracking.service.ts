import TimeEntryModel from "../models/time-entry.model";
import TaskModel from "../models/task.model";
import { BadRequestException, ForbiddenException, NotFoundException } from "../utils/appError";
import { logActivity } from "./activity.service";
import { emitWorkspaceEvent } from "../socket/socket.config";

export const formatDurationHelper = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

export const startTimeTrackingService = async (
  workspaceId: string,
  taskId: string,
  userId: string,
  description?: string
) => {
  const task = await TaskModel.findOne({
    _id: taskId,
    workspace: workspaceId,
  });

  if (!task) {
    throw new NotFoundException("Task not found in this workspace.");
  }

  // Check if user already has an active timer running
  const existingActive = await TimeEntryModel.findOne({
    userId,
    status: "RUNNING",
  }).populate("taskId", "title taskCode");

  if (existingActive) {
    const existingTitle = (existingActive.taskId as any)?.title || "another task";
    throw new BadRequestException(
      `You already have an active timer running on task "${existingTitle}". Stop it before starting a new timer.`
    );
  }

  const newEntry = new TimeEntryModel({
    workspaceId,
    projectId: task.project,
    taskId,
    userId,
    startTime: new Date(),
    status: "RUNNING",
    description: description || null,
  });

  await newEntry.save();
  await newEntry.populate("userId", "name email profilePicture");
  await newEntry.populate("taskId", "title taskCode status");
  await newEntry.populate("projectId", "name emoji");

  // Audit trail
  await logActivity({
    userId,
    workspaceId,
    projectId: task.project.toString(),
    taskId,
    action: "START_TIMER",
    details: `Started timer on task "${task.title}"`,
  });

  // Socket notification
  emitWorkspaceEvent(workspaceId, "time:started", newEntry);

  return { entry: newEntry };
};

export const stopTimeTrackingService = async (
  workspaceId: string,
  userId: string,
  data?: {
    taskId?: string;
    timeEntryId?: string;
  }
) => {
  let entry = null;

  if (data?.timeEntryId) {
    entry = await TimeEntryModel.findById(data.timeEntryId);
    if (!entry) {
      throw new NotFoundException("Time entry not found.");
    }
    if (entry.userId.toString() !== userId.toString()) {
      throw new ForbiddenException("You cannot stop another user's timer.");
    }
    if (entry.status !== "RUNNING") {
      throw new BadRequestException("This timer is already stopped.");
    }
  } else if (data?.taskId) {
    entry = await TimeEntryModel.findOne({
      taskId: data.taskId,
      userId,
      status: "RUNNING",
    });
  } else {
    entry = await TimeEntryModel.findOne({
      userId,
      status: "RUNNING",
    });
  }

  if (!entry) {
    throw new NotFoundException("No active running timer found for this user.");
  }

  const now = new Date();
  const durationSeconds = Math.max(
    0,
    Math.round((now.getTime() - entry.startTime.getTime()) / 1000)
  );

  entry.endTime = now;
  entry.duration = durationSeconds;
  entry.status = "COMPLETED";

  await entry.save();
  await entry.populate("userId", "name email profilePicture");
  await entry.populate("taskId", "title taskCode status");
  await entry.populate("projectId", "name emoji");

  const taskTitle = (entry.taskId as any)?.title || "task";

  // Audit trail
  await logActivity({
    userId,
    workspaceId: entry.workspaceId.toString(),
    projectId: entry.projectId.toString(),
    taskId: entry.taskId.toString(),
    action: "STOP_TIMER",
    details: `Stopped timer on task "${taskTitle}" (${formatDurationHelper(durationSeconds)})`,
  });

  // Socket notification
  emitWorkspaceEvent(entry.workspaceId.toString(), "time:stopped", entry);

  return { entry };
};

export const getTimeEntriesForTaskService = async (
  workspaceId: string,
  taskId: string
) => {
  const [entries, activeTimer] = await Promise.all([
    TimeEntryModel.find({
      workspaceId,
      taskId,
      status: "COMPLETED",
    })
      .sort({ createdAt: -1 })
      .populate("userId", "name email profilePicture")
      .populate("taskId", "title taskCode status"),
    TimeEntryModel.findOne({
      workspaceId,
      taskId,
      status: "RUNNING",
    })
      .populate("userId", "name email profilePicture")
      .populate("taskId", "title taskCode status"),
  ]);

  const totalDuration = entries.reduce(
    (acc, curr) => acc + (curr.duration || 0),
    0
  );

  return {
    entries,
    activeTimer,
    totalDuration,
    formattedTotalDuration: formatDurationHelper(totalDuration),
  };
};

export const getActiveTimerService = async (
  userId: string,
  workspaceId?: string
) => {
  const query: any = {
    userId,
    status: "RUNNING",
  };
  if (workspaceId) {
    query.workspaceId = workspaceId;
  }

  const activeTimer = await TimeEntryModel.findOne(query)
    .populate("userId", "name email profilePicture")
    .populate("taskId", "title taskCode status")
    .populate("projectId", "name emoji");

  return { activeTimer };
};

export const getWorkspaceTimeEntriesService = async (
  workspaceId: string,
  filters?: {
    userId?: string;
    projectId?: string;
    taskId?: string;
  }
) => {
  const query: any = {
    workspaceId,
    status: "COMPLETED",
  };

  if (filters?.userId) query.userId = filters.userId;
  if (filters?.projectId) query.projectId = filters.projectId;
  if (filters?.taskId) query.taskId = filters.taskId;

  const entries = await TimeEntryModel.find(query)
    .sort({ createdAt: -1 })
    .populate("userId", "name email profilePicture")
    .populate("taskId", "title taskCode status")
    .populate("projectId", "name emoji");

  const totalDuration = entries.reduce(
    (acc, curr) => acc + (curr.duration || 0),
    0
  );

  return {
    entries,
    totalDuration,
    formattedTotalDuration: formatDurationHelper(totalDuration),
  };
};
