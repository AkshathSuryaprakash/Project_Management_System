import { Router } from "express";
import {
  exportTasksCsvController,
  getWorkspaceReportsController,
} from "../controllers/report.controller";

const reportRoutes = Router({ mergeParams: true });

reportRoutes.get("/", getWorkspaceReportsController);
reportRoutes.get("/export", exportTasksCsvController);

export default reportRoutes;

