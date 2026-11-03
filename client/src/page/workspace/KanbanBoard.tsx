import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { getAllTasksQueryFn, editTaskMutationFn } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, Tag, Loader, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import CreateTaskForm from "@/components/workspace/task/create-task-form";
import { TaskDetailDialog } from "@/components/workspace/task/task-detail-dialog";
import { getAvatarColor, getAvatarFallbackText } from "@/lib/helper";

const COLUMNS = [
  { id: "BACKLOG", label: "Backlog", color: "bg-slate-100 dark:bg-slate-900/40" },
  { id: "TODO", label: "To Do", color: "bg-blue-50/50 dark:bg-blue-950/20" },
  { id: "IN_PROGRESS", label: "In Progress", color: "bg-amber-50/50 dark:bg-amber-950/20" },
  { id: "IN_REVIEW", label: "In Review", color: "bg-purple-50/50 dark:bg-purple-950/20" },
  { id: "DONE", label: "Done", color: "bg-emerald-50/50 dark:bg-emerald-950/20" },
];

export default function KanbanBoard() {
  const workspaceId = useWorkspaceId();
  const queryClient = useQueryClient();
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedTaskProjectId, setDraggedTaskProjectId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["all-tasks", workspaceId],
    queryFn: () =>
      getAllTasksQueryFn({
        workspaceId,
        pageSize: 100,
        pageNumber: 1,
      }),
    enabled: !!workspaceId,
  });

  const { mutate: updateTaskStatus } = useMutation({
    mutationFn: editTaskMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-tasks", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspace-analytics", workspaceId] });
      toast({
        title: "Status Updated",
        description: "Task status was updated in real-time.",
        variant: "success",
      });
    },
    onError: (error: any) => {
      // Per Algorithm 8.5 & Figure 9.8: Show Access Denied toast with server message
      toast({
        title: "Access Denied",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "You do not have permission to modify this task.",
        variant: "destructive",
      });
    },
  });

  const tasks = data?.tasks || [];

  const handleDragStart = (e: React.DragEvent, task: any) => {
    setDraggedTaskId(task._id);
    const pId = task.project?._id || task.project;
    setDraggedTaskProjectId(pId);
    e.dataTransfer.setData("text/plain", JSON.stringify({ taskId: task._id, projectId: pId }));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (!draggedTaskId || !draggedTaskProjectId) {
      try {
        const raw = e.dataTransfer.getData("text/plain");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.taskId && parsed.projectId) {
            updateTaskStatus({
              workspaceId,
              projectId: parsed.projectId,
              taskId: parsed.taskId,
              data: { status: targetStatus as any },
            });
          }
        }
      } catch (err) {
        // ignore
      }
      return;
    }

    updateTaskStatus({
      workspaceId,
      projectId: draggedTaskProjectId,
      taskId: draggedTaskId,
      data: { status: targetStatus as any },
    });

    setDraggedTaskId(null);
    setDraggedTaskProjectId(null);
  };

  return (
    <div className="w-full flex flex-col h-full space-y-4">
      {/* Header matching Figure 9.8 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kanban Task Board</h1>
          <p className="text-sm text-muted-foreground">
            Drag and drop tasks between columns to update status in real-time
          </p>
        </div>
        <Button onClick={() => setCreateTaskOpen(true)} className="flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Task
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-80">
          <Loader className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t: any) => t.status === col.id);

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col rounded-xl border p-3 min-h-[580px] ${col.color} transition-colors`}
              >
                {/* Column Title with counter */}
                <div className="flex items-center justify-between pb-3 mb-2 border-b">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{col.label}</span>
                    <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                      {colTasks.length}
                    </Badge>
                  </div>
                </div>

                {/* Cards List */}
                <div className="flex flex-col gap-2.5 flex-1">
                  {colTasks.map((task: any) => {
                    const assigneeName = task.assignedTo?.name || "Unassigned";
                    const initials = getAvatarFallbackText(assigneeName);
                    const avatarColor = getAvatarColor(assigneeName);

                    return (
                      <div
                        key={task._id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onClick={() => {
                          setSelectedTask(task);
                          setDetailOpen(true);
                        }}
                        className="bg-card hover:border-primary/50 text-card-foreground p-3.5 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:shadow transition-all space-y-2.5"
                      >
                        {/* Task Code & Priority Badge */}
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-muted-foreground">
                            {task.taskCode || "task"}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              task.priority === "HIGH"
                                ? "bg-red-500/15 text-red-600 dark:text-red-400 font-semibold"
                                : task.priority === "MEDIUM"
                                ? "bg-black text-white dark:bg-white dark:text-black font-semibold"
                                : "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold"
                            }`}
                          >
                            {task.priority}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-semibold leading-tight line-clamp-2">
                          {task.title}
                        </h4>

                        {/* Project Name with Tag Icon */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Tag className="w-3 h-3" />
                          <span>{task.project?.name || "Project"}</span>
                        </div>

                        {/* Due Date & Assignee Initial */}
                        <div className="flex items-center justify-between pt-1 border-t text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {task.dueDate
                                ? new Date(task.dueDate).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "No due date"}
                            </span>
                          </div>

                          <Avatar className="h-5 w-5">
                            <AvatarImage src={task.assignedTo?.profilePicture || ""} />
                            <AvatarFallback className={`${avatarColor} text-[9px]`}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div className="flex-1 flex items-center justify-center border border-dashed rounded-lg p-4 text-xs text-muted-foreground">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      )}

      <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
        <DialogContent className="sm:max-w-lg border-0 max-h-[90vh] overflow-y-auto">
          <CreateTaskForm onClose={() => setCreateTaskOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
