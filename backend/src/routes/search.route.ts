import { Router } from "express";
import { searchWorkspaceController } from "../controllers/search.controller";

const searchRoutes = Router({ mergeParams: true });

searchRoutes.get("/", searchWorkspaceController);

export default searchRoutes;

