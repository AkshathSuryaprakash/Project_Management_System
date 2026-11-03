import { Router } from "express";
import {
  createCommentController,
  deleteCommentController,
  getCommentsController,
} from "../controllers/comment.controller";

const commentRoutes = Router({ mergeParams: true });

commentRoutes.get("/task/:taskId", getCommentsController);
commentRoutes.post("/task/:taskId", createCommentController);
commentRoutes.delete("/:commentId", deleteCommentController);

export default commentRoutes;

