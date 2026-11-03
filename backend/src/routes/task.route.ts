import { Router } from "express";
import {
  addTaskDependencyController,
  createTaskController,
  deleteTaskController,
  getAllTasksController,
  getTaskByIdController,
  getTaskDependenciesController,
  removeTaskDependencyController,
  updateTaskController,
} from "../controllers/task.controller";

const taskRoutes = Router();

taskRoutes.post(
  "/project/:projectId/workspace/:workspaceId/create",
  createTaskController
);

taskRoutes.delete("/:id/workspace/:workspaceId/delete", deleteTaskController);

taskRoutes.put(
  "/:id/project/:projectId/workspace/:workspaceId/update",
  updateTaskController
);

taskRoutes.get("/workspace/:workspaceId/all", getAllTasksController);

taskRoutes.get(
  "/:id/project/:projectId/workspace/:workspaceId",
  getTaskByIdController
);

// Task Dependencies endpoints (suggested & standard REST conventions)
taskRoutes.post("/:taskId/dependencies", addTaskDependencyController);
taskRoutes.get("/:taskId/dependencies", getTaskDependenciesController);
taskRoutes.delete("/:taskId/dependencies/:dependencyId", removeTaskDependencyController);

taskRoutes.post("/:taskId/workspace/:workspaceId/dependencies", addTaskDependencyController);
taskRoutes.get("/:taskId/workspace/:workspaceId/dependencies", getTaskDependenciesController);
taskRoutes.delete("/:taskId/workspace/:workspaceId/dependencies/:dependencyId", removeTaskDependencyController);

export default taskRoutes;
