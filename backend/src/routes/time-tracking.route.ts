import { Router } from "express";
import {
  getActiveTimerController,
  getTimeEntriesForTaskController,
  getWorkspaceTimeEntriesController,
  startTimeTrackingController,
  stopTimeTrackingController,
} from "../controllers/time-tracking.controller";

const timeTrackingRoutes = Router();

// Standard suggested endpoints
timeTrackingRoutes.post("/start", startTimeTrackingController);
timeTrackingRoutes.post("/stop", stopTimeTrackingController);
timeTrackingRoutes.get("/active", getActiveTimerController);
timeTrackingRoutes.get("/task/:taskId", getTimeEntriesForTaskController);
timeTrackingRoutes.get("/workspace/:workspaceId", getWorkspaceTimeEntriesController);

// Workspace-prefixed variants
timeTrackingRoutes.post("/workspace/:workspaceId/start", startTimeTrackingController);
timeTrackingRoutes.post("/workspace/:workspaceId/stop", stopTimeTrackingController);
timeTrackingRoutes.get("/workspace/:workspaceId/active", getActiveTimerController);
timeTrackingRoutes.get("/workspace/:workspaceId/task/:taskId", getTimeEntriesForTaskController);

export default timeTrackingRoutes;
