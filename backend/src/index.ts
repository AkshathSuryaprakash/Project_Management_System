import "dotenv/config";
import http from "http";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import session from "cookie-session";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";

import { config } from "./config/app.config";
import connectDatabase from "./config/database.config";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import { HTTPSTATUS } from "./config/http.config";
import { asyncHandler } from "./middlewares/asyncHandler.middleware";
import { initSocket } from "./socket/socket.config";
import { swaggerDocument } from "./config/swagger.config";

import "./config/passport.config";
import passport from "passport";
import authRoutes from "./routes/auth.route";
import userRoutes from "./routes/user.route";
import isAuthenticated from "./middlewares/isAuthenticated.middleware";
import workspaceRoutes from "./routes/workspace.route";
import memberRoutes from "./routes/member.route";
import projectRoutes from "./routes/project.route";
import taskRoutes from "./routes/task.route";
import commentRoutes from "./routes/comment.route";
import attachmentRoutes from "./routes/attachment.route";
import messageRoutes from "./routes/message.route";
import notificationRoutes from "./routes/notification.route";
import activityRoutes from "./routes/activity.route";
import reportRoutes from "./routes/report.route";
import searchRoutes from "./routes/search.route";

const app = express();
const server = http.createServer(app);
const BASE_PATH = config.BASE_PATH;

// Initialize real-time Socket.IO server
initSocket(server);

// 25MB body limit for base64 attachments
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(
  session({
    name: "session",
    keys: [config.SESSION_SECRET || "default_session_secret_for_mca_project"],
    maxAge: 24 * 60 * 60 * 1000,
    secure:
      config.NODE_ENV === "production" &&
      (config.FRONTEND_ORIGIN || "").startsWith("https://"),
    httpOnly: true,
    sameSite: "lax",
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(
  cors({
    origin: config.FRONTEND_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get(
  `/`,
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    return res.status(HTTPSTATUS.OK).json({
      message: "Multi-Tenant Collaborative Workspace and Project Management API",
      version: "1.0.0",
      docs: "/api-docs",
    });
  })
);

// Mount route groups
app.use(`${BASE_PATH}/auth`, authLimiter, authRoutes);
app.use(`${BASE_PATH}/user`, isAuthenticated, userRoutes);
app.use(`${BASE_PATH}/workspace`, isAuthenticated, workspaceRoutes);
app.use(
  `${BASE_PATH}/workspace/:workspaceId/comments`,
  isAuthenticated,
  commentRoutes
);
app.use(
  `${BASE_PATH}/workspace/:workspaceId/attachments`,
  isAuthenticated,
  attachmentRoutes
);
app.use(
  `${BASE_PATH}/workspace/:workspaceId/messages`,
  isAuthenticated,
  messageRoutes
);
app.use(
  `${BASE_PATH}/workspace/:workspaceId/notifications`,
  isAuthenticated,
  notificationRoutes
);
app.use(
  `${BASE_PATH}/workspace/:workspaceId/activity`,
  isAuthenticated,
  activityRoutes
);
app.use(
  `${BASE_PATH}/workspace/:workspaceId/reports`,
  isAuthenticated,
  reportRoutes
);
app.use(
  `${BASE_PATH}/workspace/:workspaceId/search`,
  isAuthenticated,
  searchRoutes
);
app.use(`${BASE_PATH}/member`, isAuthenticated, memberRoutes);
app.use(`${BASE_PATH}/project`, isAuthenticated, projectRoutes);
app.use(`${BASE_PATH}/task`, isAuthenticated, taskRoutes);

// Central error handler
app.use(errorHandler);

if (process.env.NODE_ENV !== "test") {
  server.listen(config.PORT, async () => {
    console.log(
      `Server listening on port ${config.PORT} in ${config.NODE_ENV} mode`
    );
    console.log(`Swagger documentation available at http://localhost:${config.PORT}/api-docs`);
    await connectDatabase();
  });
}

export { app, server };
export default app;
