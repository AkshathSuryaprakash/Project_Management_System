import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "../config/http.config";
import { getMemberRoleInWorkspace } from "../services/member.service";
import {
  getUserNotificationsService,
  markAllNotificationsAsReadService,
  markNotificationAsReadService,
} from "../services/notification.service";

export const getNotificationsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { workspaceId } = req.params;

    await getMemberRoleInWorkspace(userId, workspaceId);

    const result = await getUserNotificationsService(
      userId.toString(),
      workspaceId
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Notifications fetched successfully",
      ...result,
    });
  }
);

export const markNotificationAsReadController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { workspaceId, id } = req.params;

    await getMemberRoleInWorkspace(userId, workspaceId);

    const { notification } = await markNotificationAsReadService(
      id,
      userId.toString()
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Notification marked as read",
      notification,
    });
  }
);

export const markAllNotificationsAsReadController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { workspaceId } = req.params;

    await getMemberRoleInWorkspace(userId, workspaceId);

    await markAllNotificationsAsReadService(userId.toString(), workspaceId);

    return res.status(HTTPSTATUS.OK).json({
      message: "All notifications marked as read",
    });
  }
);

