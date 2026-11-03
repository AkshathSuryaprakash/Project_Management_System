import { useState } from "react";
import { Bell, CheckCheck, Loader } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotificationsQueryFn,
  markAllNotificationsReadMutationFn,
  markNotificationReadMutationFn,
} from "@/lib/api";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { useNavigate } from "react-router-dom";

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", workspaceId],
    queryFn: () => getNotificationsQueryFn(workspaceId),
    enabled: !!workspaceId,
  });

  const { mutate: markRead } = useMutation({
    mutationFn: markNotificationReadMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", workspaceId] });
    },
  });

  const { mutate: markAllRead } = useMutation({
    mutationFn: markAllNotificationsReadMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", workspaceId] });
    },
  });

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const handleClickNotification = (n: any) => {
    if (!n.isRead) {
      markRead({ workspaceId, id: n._id });
    }
    setOpen(false);
    navigate(`/workspace/${workspaceId}/tasks`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead(workspaceId)}
              className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">
              No notifications yet
            </p>
          ) : (
            <div className="divide-y">
              {notifications.map((n: any) => (
                <div
                  key={n._id}
                  onClick={() => handleClickNotification(n)}
                  className={`p-3 text-xs cursor-pointer hover:bg-accent transition-colors ${
                    !n.isRead ? "bg-muted/40 font-medium" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm leading-snug">{n.message}</p>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" />
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

