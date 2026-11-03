import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "../config/http.config";
import { getMemberRoleInWorkspace } from "../services/member.service";
import { roleGuard } from "../utils/roleGuard";
import { Permissions } from "../enums/role.enum";
import {
  getActiveTimerService,
  getTimeEntriesForTaskService,
  getWorkspaceTimeEntriesService,
  startTimeTrackingService,
  stopTimeTrackingService,
} from "../services/time-tracking.service";
import { z } from "zod";
import { BadRequestException } from "../utils/appError";

const startTimerSchema = z.object({
  workspaceId: z.string().min(1, "Workspace ID is required"),
  taskId: z.string().min(1, "Task ID is required"),
  description: z.string().optional(),
});

const stopTimerSchema = z.object({
  workspaceId: z.string().optional(),
  taskId: z.string().optional(),
  timeEntryId: z.string().optional(),
});

export const startTimeTrackingController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const body = startTimerSchema.parse(req.body);
    const workspaceId = body.workspaceId;

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.VIEW_ONLY]);

    const { entry } = await startTimeTrackingService(
      workspaceId,
      body.taskId,
      userId.toString(),
      body.description
    );

    return res.status(HTTPSTATUS.CREATED).json({
      message: "Time tracking started successfully",
      entry,
    });
  }
);

export const stopTimeTrackingController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const body = stopTimerSchema.parse(req.body);
    const workspaceId = body.workspaceId || (req.params.workspaceId as string) || "";

    if (workspaceId) {
      const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
      roleGuard(role, [Permissions.VIEW_ONLY]);
    }

    const { entry } = await stopTimeTrackingService(
      workspaceId,
      userId.toString(),
      {
        taskId: body.taskId,
        timeEntryId: body.timeEntryId,
      }
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Time tracking stopped successfully",
      entry,
    });
  }
);

export const getTimeEntriesForTaskController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const taskId = req.params.taskId;
    const workspaceId =
      (req.query.workspaceId as string) || (req.params.workspaceId as string);

    if (!workspaceId) {
      throw new BadRequestException("Workspace ID is required");
    }

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.VIEW_ONLY]);

    const result = await getTimeEntriesForTaskService(workspaceId, taskId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Task time entries retrieved successfully",
      ...result,
    });
  }
);

export const getActiveTimerController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const workspaceId =
      (req.query.workspaceId as string) || (req.params.workspaceId as string);

    if (workspaceId) {
      const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
      roleGuard(role, [Permissions.VIEW_ONLY]);
    }

    const result = await getActiveTimerService(userId.toString(), workspaceId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Active timer retrieved successfully",
      ...result,
    });
  }
);

export const getWorkspaceTimeEntriesController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const workspaceId = req.params.workspaceId;

    const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
    roleGuard(role, [Permissions.VIEW_ONLY]);

    const filters = {
      userId: req.query.userId as string | undefined,
      projectId: req.query.projectId as string | undefined,
      taskId: req.query.taskId as string | undefined,
    };

    const result = await getWorkspaceTimeEntriesService(workspaceId, filters);

    return res.status(HTTPSTATUS.OK).json({
      message: "Workspace time entries retrieved successfully",
      ...result,
    });
  }
);
