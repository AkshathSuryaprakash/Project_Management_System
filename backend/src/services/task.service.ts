


import { TaskPriorityEnum, TaskStatusEnum } from "../enums/task.enum";
import MemberModel from "../models/member.model";
import ProjectModel from "../models/project.model";
import TaskModel from "../models/task.model";
import CommentModel from "../models/comment.model";
import AttachmentModel from "../models/attachment.model";
import { BadRequestException, NotFoundException } from "../utils/appError";
import { logActivity } from "./activity.service";
import { createNotificationService } from "./notification.service";
import { emitWorkspaceEvent } from "../socket/socket.config";

export const createTaskService = async (
  workspaceId: string,
  projectId: string,
  userId: string,
  body: {
    title: string;
    description?: string | null;
    priority?: string;
    status?: string;
    assignedTo?: string | null;
    dueDate?: string | Date | null;
    dependsOn?: string[];
    tags?: string[];
    recurrence?: string;
  }
) => {
  const {
    title,
    description,
    priority,
    status,
    assignedTo,
    dueDate,
    dependsOn,
    tags,
    recurrence,
  } = body;

  const project = await ProjectModel.findById(projectId);
  if (!project || project.workspace.toString() !== workspaceId.toString()) {
    throw new NotFoundException(
      "Project not found or does not belong to this workspace"
    );
  }

  if (assignedTo) {
    const isAssignedUserMember = await MemberModel.exists({
      userId: assignedTo,
      workspaceId,
    });

    if (!isAssignedUserMember) {
      throw new BadRequestException("Assigned user is not a member of this workspace.");
    }
  }

  const task = new TaskModel({
    title,
    description: description || null,
    priority: priority || TaskPriorityEnum.MEDIUM,
    status: status || TaskStatusEnum.TODO,
    assignedTo: assignedTo || null,
    createdBy: userId,
    workspace: workspaceId,
    project: projectId,
    dueDate: dueDate ? new Date(dueDate) : null,
    dependsOn: dependsOn || [],
    tags: tags || [],
    recurrence: recurrence || "NONE",
  });

  await task.save();

  await task.populate("assignedTo", "_id name profilePicture email");
  await task.populate("project", "_id emoji name");
  if (task.dependsOn && task.dependsOn.length > 0) {
    await task.populate("dependsOn", "_id title taskCode status");
  }

  // 1. Audit trail
  await logActivity({
    userId,
    workspaceId,
    projectId,
    taskId: (task._id as any).toString(),
    action: "CREATE_TASK",
    details: `Created task "${task.title}"`,
  });

  // 2. Notification for assignee
  if (assignedTo && assignedTo.toString() !== userId.toString()) {
    await createNotificationService({
      userId: assignedTo,
      workspaceId,
      type: "TASK_ASSIGNED",
      message: `You were assigned task "${task.title}" in ${project.name}`,
      relatedTaskId: (task._id as any).toString(),
    });
  }

  // 3. Real-time broadcast
  emitWorkspaceEvent(workspaceId, "task:created", task);

  return { task };
};

export const updateTaskService = async (
  workspaceId: string,
  projectId: string,
  taskId: string,
  userId: string,
  body: {
    title?: string;
    description?: string | null;
    priority?: string;
    status?: string;
    assignedTo?: string | null;
    dueDate?: string | Date | null;
    dependsOn?: string[];
    tags?: string[];
    recurrence?: string;
  }
) => {
  const project = await ProjectModel.findById(projectId);
  if (!project || project.workspace.toString() !== workspaceId.toString()) {
    throw new NotFoundException(
      "Project not found or does not belong to this workspace"
    );
  }

  const task = await TaskModel.findOne({
    _id: taskId,
    workspace: workspaceId,
    project: projectId,
  });

  if (!task) {
    throw new NotFoundException("Task not found or does not belong to this project");
  }

  const oldStatus = task.status;
  const oldAssignee = task.assignedTo?.toString();

  // If new assignee, verify membership
  if (body.assignedTo && body.assignedTo !== oldAssignee) {
    const isMember = await MemberModel.exists({
      userId: body.assignedTo,
      workspaceId,
    });
    if (!isMember) {
      throw new BadRequestException("Assigned user is not a member of this workspace.");
    }
  }

  if (body.title !== undefined) task.title = body.title;
  if (body.description !== undefined) task.description = body.description;
  if (body.priority !== undefined) task.priority = body.priority as any;
  if (body.status !== undefined) task.status = body.status as any;
  if (body.assignedTo !== undefined) task.assignedTo = (body.assignedTo as any) || null;
  if (body.dueDate !== undefined) {
    task.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }
  if (body.dependsOn !== undefined) task.dependsOn = (body.dependsOn as any) || [];
  if (body.tags !== undefined) task.tags = body.tags || [];
  if (body.recurrence !== undefined) task.recurrence = body.recurrence;

  await task.save();

  await task.populate("assignedTo", "_id name profilePicture email");
  await task.populate("project", "_id emoji name");
  if (task.dependsOn && task.dependsOn.length > 0) {
    await task.populate("dependsOn", "_id title taskCode status");
  }

  // 1. Audit trail
  let actionDetail = `Updated task "${task.title}"`;
  if (body.status && body.status !== oldStatus) {
    actionDetail = `Updated task "${task.title}" status to ${body.status}`;
  }
  await logActivity({
    userId,
    workspaceId,
    projectId,
    taskId: (task._id as any).toString(),
    action: "UPDATE_TASK",
    details: actionDetail,
  });

  // 2. Notification if reassigned
  if (
    body.assignedTo &&
    body.assignedTo !== oldAssignee &&
    body.assignedTo !== userId.toString()
  ) {
    await createNotificationService({
      userId: body.assignedTo,
      workspaceId,
      type: "TASK_ASSIGNED",
      message: `You were assigned task "${task.title}" in ${project.name}`,
      relatedTaskId: (task._id as any).toString(),
    });
  }

  // 3. Real-time broadcast
  emitWorkspaceEvent(workspaceId, "task:updated", task);

  return { updatedTask: task };
};

export const getAllTasksService = async (
  workspaceId: string,
  filters: {
    projectId?: string;
    status?: string[];
    priority?: string[];
    assignedTo?: string[];
    keyword?: string;
    dueDate?: string;
  },
  pagination: {
    pageSize: number;
    pageNumber: number;
  }
) => {
  const query: Record<string, any> = {
    workspace: workspaceId,
  };

  if (filters.projectId) {
    query.project = filters.projectId;
  }

  if (filters.status && filters.status.length > 0) {
    query.status = { $in: filters.status };
  }

  if (filters.priority && filters.priority.length > 0) {
    query.priority = { $in: filters.priority };
  }

  if (filters.assignedTo && filters.assignedTo.length > 0) {
    query.assignedTo = { $in: filters.assignedTo };
  }

  if (filters.keyword && filters.keyword !== undefined) {
    query.title = { $regex: filters.keyword, $options: "i" };
  }

  if (filters.dueDate) {
    const start = new Date(filters.dueDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(filters.dueDate);
    end.setHours(23, 59, 59, 999);
    query.dueDate = { $gte: start, $lte: end };
  }

  const { pageSize, pageNumber } = pagination;
  const skip = (pageNumber - 1) * pageSize;

  const [tasks, totalCount] = await Promise.all([
    TaskModel.find(query)
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 })
      .populate("assignedTo", "_id name profilePicture email")
      .populate("project", "_id emoji name"),
    TaskModel.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    tasks,
    pagination: {
      pageSize,
      pageNumber,
      totalCount,
      totalPages,
      skip,
    },
  };
};

export const getTaskByIdService = async (
  workspaceId: string,
  projectId: string,
  taskId: string
) => {
  const project = await ProjectModel.findById(projectId);
  if (!project || project.workspace.toString() !== workspaceId.toString()) {
    throw new NotFoundException(
      "Project not found or does not belong to this workspace"
    );
  }

  const task = await TaskModel.findOne({
    _id: taskId,
    workspace: workspaceId,
    project: projectId,
  })
    .populate("assignedTo", "_id name profilePicture email")
    .populate("project", "_id emoji name")
    .populate("dependsOn", "_id title taskCode status");

  if (!task) {
    throw new NotFoundException("Task not found.");
  }

  return task;
};

export const deleteTaskService = async (
  workspaceId: string,
  taskId: string,
  userId: string
) => {
  const task = await TaskModel.findOneAndDelete({
    _id: taskId,
    workspace: workspaceId,
  });

  if (!task) {
    throw new NotFoundException(
      "Task not found or does not belong to the specified workspace"
    );
  }

  // Cleanup comments and attachments
  await CommentModel.deleteMany({ taskId, workspaceId });
  await AttachmentModel.deleteMany({ taskId, workspaceId });

  // Audit trail
  await logActivity({
    userId,
    workspaceId,
    projectId: task.project,
    taskId: (task._id as any).toString(),
    action: "DELETE_TASK",
    details: `Deleted task "${task.title}"`,
  });

  // Real-time broadcast
  emitWorkspaceEvent(workspaceId, "task:deleted", { taskId });

  return;
};

// ==========================================
// TASK DEPENDENCY MANAGEMENT
// ==========================================

export const checkCircularDependency = async (
  targetTaskId: string,
  sourceTaskId: string
): Promise<boolean> => {
  const visited = new Set<string>();

  const dfs = async (currentId: string): Promise<boolean> => {
    if (currentId.toString() === sourceTaskId.toString()) {
      return true; // Cycle detected: sourceTaskId is reachable from targetTaskId
    }
    if (visited.has(currentId.toString())) {
      return false;
    }
    visited.add(currentId.toString());

    const currentTask = await TaskModel.findById(currentId).select("dependsOn");
    if (!currentTask || !currentTask.dependsOn || currentTask.dependsOn.length === 0) {
      return false;
    }

    for (const depId of currentTask.dependsOn) {
      if (await dfs(depId.toString())) {
        return true;
      }
    }
    return false;
  };

  return dfs(targetTaskId);
};

export const addTaskDependencyService = async (
  workspaceId: string,
  taskId: string,
  dependencyTaskId: string,
  userId: string
) => {
  if (taskId.toString() === dependencyTaskId.toString()) {
    throw new BadRequestException("A task cannot depend on itself.");
  }

  const [task, depTask] = await Promise.all([
    TaskModel.findOne({ _id: taskId, workspace: workspaceId }),
    TaskModel.findOne({ _id: dependencyTaskId, workspace: workspaceId }),
  ]);

  if (!task) {
    throw new NotFoundException("Task not found in this workspace.");
  }
  if (!depTask) {
    throw new NotFoundException("Dependency task not found in this workspace.");
  }

  // Cross-project check
  if (task.project.toString() !== depTask.project.toString()) {
    throw new BadRequestException(
      "Dependencies can only be established between tasks within the same project."
    );
  }

  // Duplicate check
  const exists = task.dependsOn.some(
    (d) => d.toString() === dependencyTaskId.toString()
  );
  if (exists) {
    throw new BadRequestException("This dependency already exists.");
  }

  // Circular dependency check
  const isCircular = await checkCircularDependency(dependencyTaskId, taskId);
  if (isCircular) {
    throw new BadRequestException(
      "Circular dependency detected. This dependency would create an impossible circular loop."
    );
  }

  task.dependsOn.push(depTask._id as any);
  await task.save();

  await task.populate({
    path: "dependsOn",
    select: "_id title taskCode status dueDate assignedTo priority",
    populate: { path: "assignedTo", select: "_id name email profilePicture" },
  });

  // Audit trail
  await logActivity({
    userId,
    workspaceId,
    projectId: task.project.toString(),
    taskId,
    action: "ADD_DEPENDENCY",
    details: `Added dependency: "${task.title}" now depends on "${depTask.title}"`,
  });

  // Real-time broadcast
  emitWorkspaceEvent(workspaceId, "task:updated", task);

  return { task, dependencies: task.dependsOn };
};

export const getTaskDependenciesService = async (
  workspaceId: string,
  taskId: string
) => {
  const task = await TaskModel.findOne({ _id: taskId, workspace: workspaceId })
    .populate({
      path: "dependsOn",
      select: "_id title taskCode status dueDate assignedTo priority",
      populate: { path: "assignedTo", select: "_id name email profilePicture" },
    });

  if (!task) {
    throw new NotFoundException("Task not found in this workspace.");
  }

  // Find reverse dependents (tasks that depend on this task)
  const dependents = await TaskModel.find({
    workspace: workspaceId,
    project: task.project,
    dependsOn: taskId,
  })
    .select("_id title taskCode status dueDate assignedTo priority")
    .populate("assignedTo", "_id name email profilePicture");

  // Find candidate tasks in the same project that could be added as dependencies
  const rawAvailable = await TaskModel.find({
    workspace: workspaceId,
    project: task.project,
    _id: { $ne: taskId, $nin: task.dependsOn },
  })
    .select("_id title taskCode status dueDate priority assignedTo")
    .populate("assignedTo", "_id name email profilePicture");

  // Filter out any candidates that would cause a cycle
  const availableTasks = [];
  for (const candidate of rawAvailable) {
    const createsCycle = await checkCircularDependency(
      (candidate._id as any).toString(),
      taskId
    );
    if (!createsCycle) {
      availableTasks.push(candidate);
    }
  }

  // Compute status summary
  const now = new Date();
  const deps = (task.dependsOn as any[]) || [];
  const incompleteDeps = deps.filter((d) => d.status !== TaskStatusEnum.DONE);
  const overdueDeps = deps.filter(
    (d) => d.dueDate && new Date(d.dueDate) < now && d.status !== TaskStatusEnum.DONE
  );

  const isBlocked = incompleteDeps.length > 0;
  const isReady = deps.length === 0 || incompleteDeps.length === 0;
  const hasOverdueDependency = overdueDeps.length > 0;

  let message = "All prerequisite tasks completed. Ready to proceed.";
  if (hasOverdueDependency) {
    message = "Warning: One or more prerequisite tasks are overdue!";
  } else if (isBlocked) {
    message = `This task is waiting for ${incompleteDeps.length} prerequisite task(s) to be completed.`;
  }

  const statusSummary = {
    isBlocked,
    isReady,
    hasOverdueDependency,
    message,
    totalDependencies: deps.length,
    incompleteCount: incompleteDeps.length,
  };

  return {
    dependencies: deps,
    dependents,
    availableTasks,
    statusSummary,
  };
};

export const removeTaskDependencyService = async (
  workspaceId: string,
  taskId: string,
  dependencyId: string,
  userId: string
) => {
  const task = await TaskModel.findOne({
    _id: taskId,
    workspace: workspaceId,
  });

  if (!task) {
    throw new NotFoundException("Task not found in this workspace.");
  }

  const depTask = await TaskModel.findById(dependencyId).select("title");

  task.dependsOn = (task.dependsOn as any[]).filter(
    (d) => d.toString() !== dependencyId.toString()
  );

  await task.save();

  await task.populate({
    path: "dependsOn",
    select: "_id title taskCode status dueDate assignedTo priority",
    populate: { path: "assignedTo", select: "_id name email profilePicture" },
  });

  // Audit trail
  await logActivity({
    userId,
    workspaceId,
    projectId: task.project.toString(),
    taskId,
    action: "REMOVE_DEPENDENCY",
    details: `Removed dependency on "${depTask?.title || dependencyId}"`,
  });

  // Real-time broadcast
  emitWorkspaceEvent(workspaceId, "task:updated", task);

  return { task, dependencies: task.dependsOn };
};