import { Router } from "express";
import { getActivityLogsController } from "../controllers/activity.controller";

const activityRoutes = Router({ mergeParams: true });

activityRoutes.get("/", getActivityLogsController);

export default activityRoutes;

