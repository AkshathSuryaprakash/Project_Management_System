import { useQuery } from "@tanstack/react-query";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { getActivityLogsQueryFn } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { History, Loader, Clock } from "lucide-react";
import { getAvatarColor, getAvatarFallbackText } from "@/lib/helper";

export default function ActivityLog() {
  const workspaceId = useWorkspaceId();

  const { data, isLoading } = useQuery({
    queryKey: ["activity-logs", workspaceId],
    queryFn: () => getActivityLogsQueryFn(workspaceId, 100),
    enabled: !!workspaceId,
  });

  const activities = data?.activities || [];

  return (
    <div className="w-full flex flex-col space-y-4">
      <div className="pb-3 border-b">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-primary" /> Workspace Activity Log
        </h1>
        <p className="text-sm text-muted-foreground">
          Audit trail of task events, member actions, and collaboration history
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-80">
          <Loader className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border bg-card text-card-foreground">
          <History className="w-10 h-10 text-muted-foreground mb-2" />
          <h3 className="font-semibold text-base">No activity recorded yet</h3>
          <p className="text-xs text-muted-foreground">
            Actions like task creation, updates, and comments will be logged here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm divide-y">
          {activities.map((act: any) => {
            const actorName = act.userId?.name || "System";
            const initials = getAvatarFallbackText(actorName);
            const avatarColor = getAvatarColor(actorName);

            return (
              <div
                key={act._id}
                className="p-4 flex items-start gap-3.5 hover:bg-muted/30 transition-colors"
              >
                <Avatar className="h-8 w-8 mt-0.5 shrink-0">
                  <AvatarImage src={act.userId?.profilePicture || ""} />
                  <AvatarFallback className={`${avatarColor} text-[10px]`}>
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{actorName}</span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {act.action}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground mt-0.5 leading-snug">
                    {act.details}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 mt-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    {new Date(act.createdAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

