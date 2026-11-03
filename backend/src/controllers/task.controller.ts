import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import {
  createTaskSchema,
  taskIdSchema,
  updateTaskSchema,
} from "../validation/task.validation";
import { projectIdSchema } from "../validation/project.validation";
import { workspaceIdSchema } from "../validation/workspace.validation";
import { Permissions, Roles } from "../enums/role.enum";
import { ForbiddenException, NotFoundException } from "../utils/appError";
import { getMemberRoleInWorkspace } from "../services/member.service";
import { roleGuard } from "../utils/roleGuard";
import {
  addTaskDependencyService,
  createTaskService,
  deleteTaskService,
  getAllTasksService,
  getTaskByIdService,
  getTaskDependenciesService,
  removeTaskDependencyService,
  updateTaskService,
} from "../services/task.service";
import { HTTPSTATUS } from "../config/http.config";

export const createTaskController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;

    const body = createTaskSchema.parse(req.body);
    const projectId = projectIdSchema.parse(req.params.projectId);
    const workspaceId = workspaceIdSchema.parse(req.params.workspaceId);

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.CREATE_TASK]);

    // Critical authorization check:
    // Members can only assign tasks to themselves (and cannot create unassigned tasks)
    if (role === Roles.MEMBER) {
      const requested = body.assignedTo ? body.assignedTo.toString() : null;
      if (requested !== userId.toString()) {
        throw new ForbiddenException(
          "Members can only assign tasks to themselves."
        );
      }
    }

    const { task } = await createTaskService(
      workspaceId,
      projectId,
      userId,
      body
    );

    const privileged = role === Roles.OWNER || role === Roles.ADMIN;

    return res.status(HTTPSTATUS.OK).json({
      message: "Task created successfully",
      task,
      permissions: {
        canEdit: true,
        canDelete: privileged,
        canAssign: privileged,
      },
    });
  }
);

export const updateTaskController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;

    const body = updateTaskSchema.parse(req.body);
    const taskId = taskIdSchema.parse(req.params.id);
    const projectId = projectIdSchema.parse(req.params.projectId);
    const workspaceId = workspaceIdSchema.parse(req.params.workspaceId);

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.EDIT_TASK]);

    // Load existing task
    const existingTask = await getTaskByIdService(workspaceId, projectId, taskId);
    if (!existingTask) {
      throw new NotFoundException("Task not found");
    }

    const currentAssignedTo = existingTask.assignedTo
      ? (existingTask.assignedTo as any)._id
        ? (existingTask.assignedTo as any)._id.toString()
        : existingTask.assignedTo.toString()
      : null;

    // Critical authorization checks for MEMBER:
    if (role === Roles.MEMBER) {
      // 1. Members can only modify tasks assigned to themselves
      if (currentAssignedTo !== userId.toString()) {
        throw new ForbiddenException(
          "Members can only modify tasks assigned to themselves."
        );
      }

      // 2. Members cannot reassign tasks
      if (body.assignedTo !== undefined) {
        const newAssignedTo = body.assignedTo ? body.assignedTo.toString() : null;
        if (newAssignedTo !== currentAssignedTo) {
          throw new ForbiddenException("Members cannot reassign tasks.");
        }
      }
    }

    const { updatedTask } = await updateTaskService(
      workspaceId,
      projectId,
      taskId,
      userId.toString(),
      body
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Task updated successfully",
      task: updatedTask,
    });
  }
);

export const getAllTasksController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const workspaceId = workspaceIdSchema.parse(req.params.workspaceId);

    const filters = {
      projectId: req.query.projectId as string | undefined,
      status: req.query.status
        ? (req.query.status as string)?.split(",")
        : undefined,
      priority: req.query.priority
        ? (req.query.priority as string)?.split(",")
        : undefined,
      assignedTo: req.query.assignedTo
        ? (req.query.assignedTo as string)?.split(",")
        : undefined,
      keyword: req.query.keyword as string | undefined,
      dueDate: req.query.dueDate as string | undefined,
    };

    const pagination = {
      pageSize: parseInt(req.query.pageSize as string) || 10,
      pageNumber: parseInt(req.query.pageNumber as string) || 1,
    };

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.VIEW_ONLY]);

    const result = await getAllTasksService(workspaceId, filters, pagination);

    return res.status(HTTPSTATUS.OK).json({
      message: "All tasks fetched successfully",
      ...result,
    });
  }
);

export const getTaskByIdController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;

    const taskId = taskIdSchema.parse(req.params.id);
    const projectId = projectIdSchema.parse(req.params.projectId);
    const workspaceId = workspaceIdSchema.parse(req.params.workspaceId);

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.VIEW_ONLY]);

    const task = await getTaskByIdService(workspaceId, projectId, taskId);

    const currentAssignedTo = task.assignedTo
      ? (task.assignedTo as any)._id
        ? (task.assignedTo as any)._id.toString()
        : task.assignedTo.toString()
      : null;

    const isOwnerOrAdmin = role === Roles.OWNER || role === Roles.ADMIN;
    const isAssignedMember = role === Roles.MEMBER && currentAssignedTo === userId.toString();

    const permissions = {
      canEdit: isOwnerOrAdmin || isAssignedMember,
      canDelete: isOwnerOrAdmin,
      canAssign: isOwnerOrAdmin,
    };

    return res.status(HTTPSTATUS.OK).json({
      message: "Task fetched successfully",
      task,
      permissions,
    });
  }
);

export const deleteTaskController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;

    const taskId = taskIdSchema.parse(req.params.id);
    const workspaceId = workspaceIdSchema.parse(req.params.workspaceId);

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);

    // If role is MEMBER, reject with specific 403 message matching Test T3
    if (role === Roles.MEMBER) {
      throw new ForbiddenException("Members cannot delete tasks.");
    }

    roleGuard(role, [Permissions.DELETE_TASK]);

    await deleteTaskService(workspaceId, taskId, userId.toString());

    return res.status(HTTPSTATUS.OK).json({
      message: "Task deleted successfully",
    });
  }
);

export const addTaskDependencyController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const taskId = req.params.taskId || req.params.id;
    const workspaceId =
      req.body.workspaceId ||
      req.params.workspaceId ||
      (req.query.workspaceId as string);
    const dependencyTaskId =
      req.body.dependencyTaskId || req.body.taskId || req.body.dependsOnId;

    if (!workspaceId) {
      throw new ForbiddenException("Workspace ID is required.");
    }
    if (!dependencyTaskId) {
      throw new ForbiddenException("Dependency Task ID is required.");
    }

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.EDIT_TASK]);

    const result = await addTaskDependencyService(
      workspaceId,
      taskId,
      dependencyTaskId,
      userId.toString()
    );

    return res.status(HTTPSTATUS.CREATED).json({
      message: "Dependency added successfully",
      ...result,
    });
  }
);

export const getTaskDependenciesController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const taskId = req.params.taskId || req.params.id;
    const workspaceId =
      (req.query.workspaceId as string) || req.params.workspaceId;

    if (!workspaceId) {
      throw new ForbiddenException("Workspace ID is required.");
    }

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.VIEW_ONLY]);

    const result = await getTaskDependenciesService(workspaceId, taskId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Task dependencies fetched successfully",
      ...result,
    });
  }
);

export const removeTaskDependencyController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const taskId = req.params.taskId || req.params.id;
    const dependencyId = req.params.dependencyId;
    const workspaceId =
      (req.query.workspaceId as string) ||
      req.params.workspaceId ||
      req.body.workspaceId;

    if (!workspaceId) {
      throw new ForbiddenException("Workspace ID is required.");
    }

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.EDIT_TASK]);

    const result = await removeTaskDependencyService(
      workspaceId,
      taskId,
      dependencyId,
      userId.toString()
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Dependency removed successfully",
      ...result,
    });
  }
);

