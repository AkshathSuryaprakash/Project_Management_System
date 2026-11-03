import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, CheckCircle2, ChevronDown } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { editTaskMutationFn } from "@/lib/api";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { toast } from "@/hooks/use-toast";
import { TaskStatusEnum } from "@/constant";
import { TaskDetailDialog } from "./task/task-detail-dialog";

export default function MyTasksPanel({ tasks, currentUserId }: { tasks: any[]; currentUserId?: string }) {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"ALL" | "IN_PROGRESS" | "PENDING" | "COMPLETED">("ALL");
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filter tasks assigned to current user
  const myTasks = tasks.filter((t: any) => {
    const assigneeId = t.assignedTo?._id || t.assignedTo;
    return assigneeId && currentUserId && assigneeId.toString() === currentUserId.toString();
  });

  const inProgressCount = myTasks.filter((t: any) => t.status === "IN_PROGRESS").length;
  const pendingCount = myTasks.filter((t: any) => t.status === "TODO" || t.status === "BACKLOG").length;
  const completedCount = myTasks.filter((t: any) => t.status === "DONE").length;

  const { mutate: updateStatus } = useMutation({
    mutationFn: editTaskMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspace-analytics", workspaceId] });
      toast({
        title: "Task Updated",
        description: "Status updated successfully.",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Update Failed",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    },
  });

  const displayedTasks = myTasks.filter((t: any) => {
    if (filter === "IN_PROGRESS") return t.status === "IN_PROGRESS";
    if (filter === "PENDING") return t.status === "TODO" || t.status === "BACKLOG";
    if (filter === "COMPLETED") return t.status === "DONE";
    return true;
  });

  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-5 space-y-4">
      {/* Title & Counters matching Figure 9.2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
        <div>
          <h3 className="font-bold text-lg tracking-tight flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" /> My Tasks ({myTasks.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Tasks assigned to you in this workspace
          </p>
        </div>

        {/* Counters */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-2.5 py-1 rounded-md border font-medium transition-colors ${
              filter === "ALL" ? "bg-primary text-primary-foreground" : "bg-muted/40 hover:bg-muted"
            }`}
          >
            Assigned to Me: <span className="font-bold">{myTasks.length}</span>
          </button>
          <button
            onClick={() => setFilter("IN_PROGRESS")}
            className={`px-2.5 py-1 rounded-md border font-medium transition-colors ${
              filter === "IN_PROGRESS"
                ? "bg-amber-600 text-white"
                : "bg-muted/40 hover:bg-muted"
            }`}
          >
            In Progress: <span className="font-bold">{inProgressCount}</span>
          </button>
          <button
            onClick={() => setFilter("PENDING")}
            className={`px-2.5 py-1 rounded-md border font-medium transition-colors ${
              filter === "PENDING"
                ? "bg-blue-600 text-white"
                : "bg-muted/40 hover:bg-muted"
            }`}
          >
            Pending: <span className="font-bold">{pendingCount}</span>
          </button>
          <button
            onClick={() => setFilter("COMPLETED")}
            className={`px-2.5 py-1 rounded-md border font-medium transition-colors ${
              filter === "COMPLETED"
                ? "bg-emerald-600 text-white"
                : "bg-muted/40 hover:bg-muted"
            }`}
          >
            Completed: <span className="font-bold">{completedCount}</span>
          </button>
        </div>
      </div>

      {/* Task Rows matching Figure 9.2 */}
      <div className="space-y-2.5">
        {displayedTasks.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-6">
            No tasks assigned matching current filter.
          </p>
        ) : (
          displayedTasks.map((t: any) => {
            const pId = t.project?._id || t.project;
            return (
              <div
                key={t._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors gap-3"
              >
                <div
                  className="space-y-1 cursor-pointer hover:opacity-80 transition-opacity flex-1"
                  onClick={() => {
                    setSelectedTask(t);
                    setDetailOpen(true);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground font-semibold">
                      {t.taskCode || "task"}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold uppercase ${
                        t.status === "DONE"
                          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                          : t.status === "IN_PROGRESS"
                          ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
                          : "bg-blue-500/15 text-blue-600 border-blue-500/30"
                      }`}
                    >
                      {t.status}
                    </Badge>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        t.priority === "HIGH"
                          ? "bg-red-500/15 text-red-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm leading-tight">
                    {t.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{t.project?.emoji}</span>
                    <span>{t.project?.name}</span>
                    {t.dueDate && (
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Calendar className="w-3 h-3" />
                        Due {new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Update Action Button matching Figure 9.2 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1">
                      Update <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        updateStatus({
                          workspaceId,
                          projectId: pId,
                          taskId: t._id,
                          data: { status: TaskStatusEnum.TODO },
                        })
                      }
                    >
                      Mark as To Do
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        updateStatus({
                          workspaceId,
                          projectId: pId,
                          taskId: t._id,
                          data: { status: TaskStatusEnum.IN_PROGRESS },
                        })
                      }
                    >
                      Mark as In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        updateStatus({
                          workspaceId,
                          projectId: pId,
                          taskId: t._id,
                          data: { status: TaskStatusEnum.IN_REVIEW },
                        })
                      }
                    >
                      Mark as In Review
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        updateStatus({
                          workspaceId,
                          projectId: pId,
                          taskId: t._id,
                          data: { status: TaskStatusEnum.DONE },
                        })
                      }
                    >
                      Mark as Done
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })
        )}
      </div>
      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      )}
    </div>
  );
}
