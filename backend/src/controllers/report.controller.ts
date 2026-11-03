import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "../config/http.config";
import { getMemberRoleInWorkspace } from "../services/member.service";
import {
  exportTasksCsvService,
  getWorkspaceReportsService,
} from "../services/report.service";

export const getWorkspaceReportsController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { workspaceId } = req.params;

    await getMemberRoleInWorkspace(userId, workspaceId);

    const reports = await getWorkspaceReportsService(workspaceId);

    return res.status(HTTPSTATUS.OK).json({
      message: "Reports fetched successfully",
      ...reports,
    });
  }
);

export const exportTasksCsvController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { workspaceId } = req.params;

    await getMemberRoleInWorkspace(userId, workspaceId);

    const csvData = await exportTasksCsvService(workspaceId);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="tasks-report-${Date.now()}.csv"`
    );
    return res.status(HTTPSTATUS.OK).send(csvData);
  }
);

