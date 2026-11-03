import { Router } from "express";
import {
  getNotificationsController,
  markAllNotificationsAsReadController,
  markNotificationAsReadController,
} from "../controllers/notification.controller";

const notificationRoutes = Router({ mergeParams: true });

notificationRoutes.get("/", getNotificationsController);
notificationRoutes.patch("/:id/read", markNotificationAsReadController);
notificationRoutes.patch("/read-all", markAllNotificationsAsReadController);

export default notificationRoutes;

