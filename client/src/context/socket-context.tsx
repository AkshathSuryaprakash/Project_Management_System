import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthContext } from "./auth-provider";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { useQueryClient } from "@tanstack/react-query";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuthContext();
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?._id) return;

    const socketUrl =
      import.meta.env.VITE_SOCKET_URL || "http://localhost:8000";

    const s = io(socketUrl, {
      withCredentials: true,
      auth: {
        userId: user._id,
      },
      transports: ["websocket", "polling"],
    });

    s.on("connect", () => {
      setIsConnected(true);
      s.emit("auth_init", { userId: user._id });
      if (workspaceId) {
        s.emit("join_workspace", { workspaceId, userId: user._id });
      }
    });

    s.on("disconnect", () => {
      setIsConnected(false);
    });

    // Real-time task invalidations
    s.on("task:created", () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspace-analytics", workspaceId] });
    });

    s.on("task:updated", () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspace-analytics", workspaceId] });
    });

    s.on("task:deleted", () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspace-analytics", workspaceId] });
    });

    // Real-time notifications
    s.on("notification:received", () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", workspaceId] });
    });

    // Real-time comments
    s.on("comment:created", () => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    });
    s.on("comment:deleted", () => {
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    });

    // Real-time attachments
    s.on("attachment:created", () => {
      queryClient.invalidateQueries({ queryKey: ["attachments"] });
    });
    s.on("attachment:deleted", () => {
      queryClient.invalidateQueries({ queryKey: ["attachments"] });
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user?._id]);

  useEffect(() => {
    if (socket && isConnected && workspaceId && user?._id) {
      socket.emit("join_workspace", { workspaceId, userId: user._id });
    }
  }, [socket, isConnected, workspaceId, user?._id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

