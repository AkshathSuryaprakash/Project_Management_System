import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "../config/http.config";
import { getMemberRoleInWorkspace } from "../services/member.service";
import { getWorkspaceActivityService } from "../services/activity.service";

export const getActivityLogsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { workspaceId } = req.params;

    await getMemberRoleInWorkspace(userId, workspaceId);

    const limit = parseInt(req.query.limit as string) || 50;
    const { activities } = await getWorkspaceActivityService(
      workspaceId,
      limit
    );

    return res.status(HTTPSTATUS.OK).json({
      message: "Activity logs fetched successfully",
      activities,
    });
  }
);

