import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { config } from "../config/app.config";
import MemberModel from "../models/member.model";

let io: SocketIOServer | null = null;

export const initSocket = (server: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: config.FRONTEND_ORIGIN || "http://localhost:3000",
      credentials: true,
    },
    maxHttpBufferSize: 25 * 1024 * 1024, // 25MB for file attachments
  });

  io.on("connection", (socket: Socket) => {
    // 1. Authenticate user from handshake or query
    const userId =
      (socket.handshake.auth?.userId as string) ||
      (socket.handshake.query?.userId as string);

    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Client can also emit auth_init with userId
    socket.on("auth_init", (data: { userId: string }) => {
      if (data?.userId) {
        socket.join(`user:${data.userId}`);
      }
    });

    // 2. Authorize and join workspace room
    socket.on("join_workspace", async (data: { workspaceId: string; userId?: string }) => {
      try {
        const targetUserId = data.userId || userId;
        const workspaceId = data.workspaceId;

        if (!workspaceId) return;

        // Verify membership in database to prevent unauthorized tenant listening
        if (targetUserId) {
          const membership = await MemberModel.findOne({
            userId: targetUserId,
            workspaceId: workspaceId,
          });

          if (!membership) {
            socket.emit("error", {
              message: "Unauthorized: You are not a member of this workspace.",
            });
            return;
          }
        }

        socket.join(`workspace:${workspaceId}`);
      } catch (err) {
        console.error("Socket join_workspace error:", err);
      }
    });

    socket.on("leave_workspace", (data: { workspaceId: string }) => {
      if (data?.workspaceId) {
        socket.leave(`workspace:${data.workspaceId}`);
      }
    });

    // 3. Typing indicators
    socket.on(
      "typing:start",
      (data: { workspaceId: string; conversationId: string; userName: string; userId: string }) => {
        if (data?.workspaceId) {
          socket.to(`workspace:${data.workspaceId}`).emit("typing:start", data);
        }
      }
    );

    socket.on(
      "typing:stop",
      (data: { workspaceId: string; conversationId: string; userId: string }) => {
        if (data?.workspaceId) {
          socket.to(`workspace:${data.workspaceId}`).emit("typing:stop", data);
        }
      }
    );

    socket.on("disconnect", () => {
      // Disconnected cleanly
    });
  });

  return io;
};

export const getIO = (): SocketIOServer | null => {
  return io;
};

export const emitWorkspaceEvent = (
  workspaceId: string,
  event: string,
  payload: any
) => {
  if (io) {
    io.to(`workspace:${workspaceId}`).emit(event, payload);
  }
};

export const emitToUser = (userId: string, event: string, payload: any) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, payload);
  }
};

