import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.middleware";
import { HTTPSTATUS } from "../config/http.config";
import { getMemberRoleInWorkspace } from "../services/member.service";
import { searchWorkspaceService } from "../services/search.service";

export const searchWorkspaceController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { workspaceId } = req.params;
    const query = (req.query.query as string) || "";

    await getMemberRoleInWorkspace(userId, workspaceId);

    const results = await searchWorkspaceService(workspaceId, query);

    return res.status(HTTPSTATUS.OK).json({
      message: "Search completed successfully",
      results,
    });
  }
);

