import { Router } from "express";
import {
  createAttachmentController,
  deleteAttachmentController,
  getAttachmentsController,
} from "../controllers/attachment.controller";

const attachmentRoutes = Router({ mergeParams: true });

attachmentRoutes.get("/task/:taskId", getAttachmentsController);
attachmentRoutes.post("/task/:taskId", createAttachmentController);
attachmentRoutes.delete("/:attachmentId", deleteAttachmentController);

export default attachmentRoutes;

