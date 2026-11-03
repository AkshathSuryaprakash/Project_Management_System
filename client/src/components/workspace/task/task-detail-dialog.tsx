import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Download,
  FileIcon,
  MessageSquare,
  Paperclip,
  Trash2,
  Upload,
  Play,
  Square,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Timer,
  Plus,
  Loader2,
  Hourglass,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAttachmentMutationFn,
  createCommentMutationFn,
  deleteAttachmentMutationFn,
  deleteCommentMutationFn,
  getAttachmentsQueryFn,
  getCommentsQueryFn,
  getTaskTimeTrackingQueryFn,
  getActiveTimerQueryFn,
  startTimeTrackingMutationFn,
  stopTimeTrackingMutationFn,
  getTaskDependenciesQueryFn,
  addTaskDependencyMutationFn,
  removeTaskDependencyMutationFn,
} from "@/lib/api";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { useAuthContext } from "@/context/auth-provider";
import { toast } from "@/hooks/use-toast";
import { getAvatarColor, getAvatarFallbackText } from "@/lib/helper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TaskDetailDialog({
  task,
  open,
  onOpenChange,
}: {
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const workspaceId = useWorkspaceId();
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [timerNote, setTimerNote] = useState("");
  const [selectedDependencyId, setSelectedDependencyId] = useState<string>("");
  const [elapsedTime, setElapsedTime] = useState(0);

  const taskId = task?._id;

  // ==========================================
  // QUERIES
  // ==========================================

  // Comments Query
  const { data: commentsData } = useQuery({
    queryKey: ["comments", workspaceId, taskId],
    queryFn: () => getCommentsQueryFn(workspaceId, taskId),
    enabled: !!workspaceId && !!taskId && open,
  });

  // Attachments Query
  const { data: attachmentsData } = useQuery({
    queryKey: ["attachments", workspaceId, taskId],
    queryFn: () => getAttachmentsQueryFn(workspaceId, taskId),
    enabled: !!workspaceId && !!taskId && open,
  });

  // Time Tracking Query for this task
  const { data: timeData } = useQuery({
    queryKey: ["time-entries", workspaceId, taskId],
    queryFn: () => getTaskTimeTrackingQueryFn(workspaceId, taskId),
    enabled: !!workspaceId && !!taskId && open,
  });

  // Global Active Timer Query for the current user
  const { data: globalTimerData } = useQuery({
    queryKey: ["active-timer", workspaceId],
    queryFn: () => getActiveTimerQueryFn(workspaceId),
    enabled: !!workspaceId && open,
  });

  // Task Dependencies Query
  const { data: dependenciesData } = useQuery({
    queryKey: ["task-dependencies", workspaceId, taskId],
    queryFn: () => getTaskDependenciesQueryFn(workspaceId, taskId),
    enabled: !!workspaceId && !!taskId && open,
  });

  const comments = commentsData?.comments || [];
  const attachments = attachmentsData?.attachments || [];
  const timeEntries = timeData?.entries || [];
  const taskActiveTimer = timeData?.activeTimer || null;
  const globalActiveTimer = globalTimerData?.activeTimer || null;
  const totalDurationSeconds = timeData?.totalDuration || 0;
  const formattedTotalDuration = timeData?.formattedTotalDuration || "0s";

  const dependencies = dependenciesData?.dependencies || [];
  const dependents = dependenciesData?.dependents || [];
  const availableCandidateTasks = dependenciesData?.availableTasks || [];
  const statusSummary = dependenciesData?.statusSummary || {
    isBlocked: false,
    isReady: true,
    hasOverdueDependency: false,
    message: "Ready to proceed.",
  };

  // Is there an active timer running on THIS specific task?
  const isTimerRunningOnThisTask = !!taskActiveTimer;

  // Is there an active timer running on ANOTHER task?
  const isTimerRunningOnAnotherTask =
    globalActiveTimer &&
    globalActiveTimer.taskId?._id?.toString() !== taskId?.toString();

  // ==========================================
  // LIVE TIMER TICKER
  // ==========================================
  useEffect(() => {
    if (!taskActiveTimer) {
      setElapsedTime(0);
      return;
    }

    const startMs = new Date(taskActiveTimer.startTime).getTime();
    const update = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsedTime(diff);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [taskActiveTimer?.startTime, taskActiveTimer]);

  const formatHHMMSS = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // ==========================================
  // MUTATIONS: TIME TRACKING
  // ==========================================

  const { mutate: startTimer, isPending: isStartingTimer } = useMutation({
    mutationFn: startTimeTrackingMutationFn,
    onSuccess: () => {
      setTimerNote("");
      queryClient.invalidateQueries({ queryKey: ["time-entries", workspaceId, taskId] });
      queryClient.invalidateQueries({ queryKey: ["active-timer", workspaceId] });
      toast({
        title: "Timer Started",
        description: `Now tracking time for ${task?.title || "this task"}.`,
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Cannot start timer",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    },
  });

  const { mutate: stopTimer, isPending: isStoppingTimer } = useMutation({
    mutationFn: stopTimeTrackingMutationFn,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["time-entries", workspaceId, taskId] });
      queryClient.invalidateQueries({ queryKey: ["active-timer", workspaceId] });
      const sec = data?.entry?.duration || 0;
      toast({
        title: "Timer Stopped",
        description: `Logged ${formatHHMMSS(sec)} of work.`,
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error stopping timer",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    },
  });

  const handleStartTimer = () => {
    startTimer({
      workspaceId,
      taskId,
      description: timerNote.trim() || undefined,
    });
  };

  const handleStopTimer = () => {
    stopTimer({
      workspaceId,
      taskId,
      timeEntryId: taskActiveTimer?._id,
    });
  };

  // ==========================================
  // MUTATIONS: TASK DEPENDENCIES
  // ==========================================

  const { mutate: addDependency, isPending: isAddingDependency } = useMutation({
    mutationFn: addTaskDependencyMutationFn,
    onSuccess: () => {
      setSelectedDependencyId("");
      queryClient.invalidateQueries({ queryKey: ["task-dependencies", workspaceId, taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      toast({
        title: "Dependency Added",
        description: "Task dependency relationship established.",
        variant: "success",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Cannot add dependency",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    },
  });

  const { mutate: removeDependency, isPending: isRemovingDependency } = useMutation({
    mutationFn: removeTaskDependencyMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-dependencies", workspaceId, taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
      toast({
        title: "Dependency Removed",
        description: "Task relationship removed successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Error removing dependency",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    },
  });

  const handleAddDependency = () => {
    if (!selectedDependencyId) return;
    addDependency({
      workspaceId,
      taskId,
      dependencyTaskId: selectedDependencyId,
    });
  };

  // ==========================================
  // MUTATIONS: COMMENTS & ATTACHMENTS
  // ==========================================

  const { mutate: addComment, isPending: isAddingComment } = useMutation({
    mutationFn: createCommentMutationFn,
    onSuccess: () => {
      setCommentText("");
      queryClient.invalidateQueries({
        queryKey: ["comments", workspaceId, taskId],
      });
      toast({ title: "Success", description: "Comment added successfully" });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const { mutate: deleteComment } = useMutation({
    mutationFn: deleteCommentMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["comments", workspaceId, taskId],
      });
      toast({ title: "Deleted", description: "Comment removed" });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const { mutate: uploadAttachment } = useMutation({
    mutationFn: createAttachmentMutationFn,
    onSuccess: () => {
      setIsUploading(false);
      queryClient.invalidateQueries({
        queryKey: ["attachments", workspaceId, taskId],
      });
      toast({ title: "Uploaded", description: "Attachment added successfully" });
    },
    onError: (err: any) => {
      setIsUploading(false);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const { mutate: deleteAttachment } = useMutation({
    mutationFn: deleteAttachmentMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["attachments", workspaceId, taskId],
      });
      toast({ title: "Deleted", description: "Attachment removed" });
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 15MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      uploadAttachment({
        workspaceId,
        taskId,
        data: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || "application/octet-stream",
          fileData: base64Data,
        },
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addComment({
      workspaceId,
      taskId,
      content: commentText.trim(),
    });
  };

  if (!task) return null;

  const assigneeName = task.assignedTo?.name || "Unassigned";
  const initials = getAvatarFallbackText(assigneeName);
  const avatarColor = getAvatarColor(assigneeName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] p-0 overflow-hidden max-h-[88vh] flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs uppercase font-bold">
                {task.taskCode || "TASK"}
              </Badge>
              <Badge
                className={
                  task.priority === "HIGH"
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : task.priority === "MEDIUM"
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                }
              >
                {task.priority}
              </Badge>
              <Badge variant="secondary">{task.status}</Badge>
            </div>

            {/* Quick Live Timer pill in header */}
            {isTimerRunningOnThisTask && (
              <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full text-xs font-mono font-bold animate-pulse">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>{formatHHMMSS(elapsedTime)}</span>
              </div>
            )}
          </div>

          <DialogTitle className="text-xl font-bold mt-2 leading-snug">
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 overflow-y-auto flex-1">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="time" className="flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" />
                <span>Time</span>
                {totalDurationSeconds > 0 && (
                  <span className="text-[10px] bg-muted px-1 rounded font-normal">
                    {formattedTotalDuration}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="dependencies" className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5" />
                <span>Deps</span>
                {dependencies.length > 0 && (
                  <span
                    className={`text-[10px] px-1 rounded font-bold ${
                      statusSummary.isBlocked
                        ? "bg-amber-500/20 text-amber-600"
                        : "bg-emerald-500/20 text-emerald-600"
                    }`}
                  >
                    {dependencies.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="comments" className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Comments ({comments.length})</span>
              </TabsTrigger>
              <TabsTrigger value="attachments" className="flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5" />
                <span>Files ({attachments.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* ============================================================== */}
            {/* TAB 1: DETAILS */}
            {/* ============================================================== */}
            <TabsContent value="details" className="space-y-4">
              {/* Dependency Warning Banners if blocked */}
              {statusSummary.hasOverdueDependency && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Prerequisite Overdue Warning:</span>{" "}
                    One or more tasks that this task depends on are overdue.
                  </div>
                </div>
              )}

              {statusSummary.isBlocked && !statusSummary.hasOverdueDependency && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
                  <Hourglass className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
                  <div>
                    <span className="font-bold">Task Blocked:</span> This task is waiting
                    for {statusSummary.incompleteCount} prerequisite task(s) to be completed.
                  </div>
                </div>
              )}

              {statusSummary.isReady && dependencies.length > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>All {dependencies.length} prerequisite tasks are completed. Ready to proceed.</span>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Description
                </h4>
                <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-md">
                  {task.description || "No description provided."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/20 p-4 rounded-lg border">
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">
                    Project
                  </span>
                  <div className="flex items-center gap-1.5 font-medium">
                    <span>{task.project?.emoji || "📊"}</span>
                    <span>{task.project?.name || "Project"}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-1">
                    Assignee
                  </span>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={task.assignedTo?.profilePicture || ""} />
                      <AvatarFallback className={`${avatarColor} text-[10px]`}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{assigneeName}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-1">
                    Due Date
                  </span>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "No due date"}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground block mb-1">
                    Time Tracked
                  </span>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{formattedTotalDuration}</span>
                    {isTimerRunningOnThisTask && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 font-bold px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ============================================================== */}
            {/* TAB 2: TIME TRACKING (FEATURE 1) */}
            {/* ============================================================== */}
            <TabsContent value="time" className="space-y-4">
              {/* Active Timer Control Panel */}
              <div className="p-4 rounded-xl border bg-card shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Timer className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-sm">Task Time Tracker</h3>
                  </div>

                  {isTimerRunningOnThisTask ? (
                    <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-mono gap-1 text-xs px-2.5 py-1">
                      <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                      TIMER RUNNING
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      TIMER IDLE
                    </Badge>
                  )}
                </div>

                {/* Live Stopwatch Clock Display */}
                <div className="flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg border">
                  <div className="text-4xl sm:text-5xl font-mono font-bold tracking-wider text-foreground">
                    {isTimerRunningOnThisTask ? formatHHMMSS(elapsedTime) : "00:00:00"}
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {isTimerRunningOnThisTask
                      ? `Started at ${new Date(taskActiveTimer.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                      : `Total logged: ${formattedTotalDuration}`}
                  </span>
                </div>

                {/* Notice if timer running on another task */}
                {isTimerRunningOnAnotherTask && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      You currently have an active timer running on task{" "}
                      <span className="font-bold">
                        "{globalActiveTimer.taskId?.title || "another task"}"
                      </span>
                      . Please stop it before starting a timer on this task.
                    </div>
                  </div>
                )}

                {/* Start / Stop Controls */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {!isTimerRunningOnThisTask ? (
                    <>
                      <Input
                        placeholder="Session notes (e.g. debugging, documentation)..."
                        value={timerNote}
                        onChange={(e) => setTimerNote(e.target.value)}
                        disabled={isStartingTimer || !!isTimerRunningOnAnotherTask}
                        className="h-9 text-xs"
                      />
                      <Button
                        size="sm"
                        disabled={isStartingTimer || !!isTimerRunningOnAnotherTask}
                        onClick={handleStartTimer}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                      >
                        {isStartingTimer ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 fill-current" />
                        )}
                        <span>Start Timer</span>
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      disabled={isStoppingTimer}
                      onClick={handleStopTimer}
                      variant="destructive"
                      className="w-full gap-2 font-semibold h-10"
                    >
                      {isStoppingTimer ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Square className="w-4 h-4 fill-current" />
                      )}
                      <span>Stop Timer & Save Session</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Time Tracking History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Work Sessions ({timeEntries.length})
                  </h4>
                  <span className="text-xs font-medium text-foreground">
                    Total: <span className="font-bold text-primary">{formattedTotalDuration}</span>
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {timeEntries.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground space-y-1">
                      <Clock className="w-6 h-6 mx-auto opacity-40 mb-1" />
                      <p>No work sessions recorded yet.</p>
                      <p>Click "Start Timer" above to track time on this task.</p>
                    </div>
                  ) : (
                    timeEntries.map((entry: any) => {
                      const u = entry.userId;
                      const uName = u?.name || "Member";
                      const color = getAvatarColor(uName);
                      const fInitials = getAvatarFallbackText(uName);

                      return (
                        <div
                          key={entry._id}
                          className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 text-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar className="h-6 w-6 shrink-0">
                              <AvatarImage src={u?.profilePicture || ""} />
                              <AvatarFallback className={`${color} text-[9px]`}>
                                {fInitials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="truncate">
                              <p className="font-semibold text-foreground truncate">
                                {uName}
                              </p>
                              {entry.description && (
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {entry.description}
                                </p>
                              )}
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {new Date(entry.startTime).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                                {" • "}
                                {new Date(entry.startTime).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {entry.endTime &&
                                  ` - ${new Date(entry.endTime).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}`}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <Badge variant="outline" className="font-mono font-semibold">
                              {formatHHMMSS(entry.duration || 0)}
                            </Badge>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ============================================================== */}
            {/* TAB 3: DEPENDENCIES (FEATURE 2) */}
            {/* ============================================================== */}
            <TabsContent value="dependencies" className="space-y-4">
              {/* Status Banner */}
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  statusSummary.hasOverdueDependency
                    ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400"
                    : statusSummary.isBlocked
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                }`}
              >
                {statusSummary.hasOverdueDependency ? (
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                ) : statusSummary.isBlocked ? (
                  <Hourglass className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                )}
                <div>
                  <p className="font-semibold text-xs leading-none">
                    {statusSummary.hasOverdueDependency
                      ? "Dependency Alert: Overdue Prerequisite"
                      : statusSummary.isBlocked
                      ? "Dependency Status: Waiting on Prerequisites"
                      : "Dependency Status: Ready to Proceed"}
                  </p>
                  <p className="mt-1 leading-relaxed opacity-90">
                    {statusSummary.message}
                  </p>
                </div>
              </div>

              {/* Add Dependency Control */}
              <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-primary" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider">
                    Add Prerequisite Task
                  </h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select a task in this project that must be completed before "{task.title}".
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <Select
                    value={selectedDependencyId}
                    onValueChange={setSelectedDependencyId}
                  >
                    <SelectTrigger className="text-xs h-9 flex-1 bg-background">
                      <SelectValue placeholder="Choose a task from this project..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCandidateTasks.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground text-center">
                          No other eligible tasks in this project
                        </div>
                      ) : (
                        availableCandidateTasks.map((t: any) => (
                          <SelectItem key={t._id} value={t._id} className="text-xs">
                            <span className="font-mono font-bold mr-1.5 uppercase text-muted-foreground">
                              {t.taskCode}:
                            </span>
                            <span>{t.title}</span>
                            <span className="text-[10px] ml-2 text-muted-foreground">
                              ({t.status})
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  <Button
                    size="sm"
                    disabled={!selectedDependencyId || isAddingDependency}
                    onClick={handleAddDependency}
                    className="h-9 gap-1 text-xs shrink-0"
                  >
                    {isAddingDependency && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Add</span>
                  </Button>
                </div>
              </div>

              {/* Prerequisites List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Prerequisites ({dependencies.length})
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    This task depends on:
                  </span>
                </div>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {dependencies.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      <GitBranch className="w-6 h-6 mx-auto opacity-40 mb-1" />
                      <p>No prerequisite tasks assigned.</p>
                      <p>This task can be worked on at any time.</p>
                    </div>
                  ) : (
                    dependencies.map((dep: any) => {
                      const isDone = dep.status === "DONE";
                      const isOverdue =
                        dep.dueDate &&
                        new Date(dep.dueDate) < new Date() &&
                        dep.status !== "DONE";

                      return (
                        <div
                          key={dep._id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            isDone
                              ? "bg-emerald-500/5 border-emerald-500/20"
                              : isOverdue
                              ? "bg-red-500/5 border-red-500/20"
                              : "bg-muted/30"
                          }`}
                        >
                          <div className="space-y-1 min-w-0 pr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="font-mono text-[10px] font-bold">
                                {dep.taskCode}
                              </Badge>
                              <Badge
                                className={`text-[10px] ${
                                  isDone
                                    ? "bg-emerald-500 text-white"
                                    : dep.status === "IN_PROGRESS"
                                    ? "bg-blue-500 text-white"
                                    : "bg-slate-500 text-white"
                                }`}
                              >
                                {dep.status}
                              </Badge>
                              {isOverdue && (
                                <Badge variant="destructive" className="text-[9px] px-1 py-0">
                                  OVERDUE
                                </Badge>
                              )}
                            </div>

                            <p className="text-sm font-semibold text-foreground truncate">
                              {dep.title}
                            </p>

                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                              {dep.assignedTo && (
                                <span>Assignee: {dep.assignedTo.name}</span>
                              )}
                              {dep.dueDate && (
                                <span className={isOverdue ? "text-red-500 font-bold" : ""}>
                                  Due: {new Date(dep.dueDate).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              )}
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isRemovingDependency}
                            onClick={() =>
                              removeDependency({
                                workspaceId,
                                taskId,
                                dependencyId: dep._id,
                              })
                            }
                            className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                            title="Remove dependency"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Downstream Dependents List */}
              {dependents.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Downstream Dependents ({dependents.length})
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    These tasks are waiting on "{task.title}" to be completed:
                  </p>
                  <div className="space-y-1.5">
                    {dependents.map((dep: any) => (
                      <div
                        key={dep._id}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/20 border text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {dep.taskCode}
                          </Badge>
                          <span className="font-medium truncate">{dep.title}</span>
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          {dep.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ============================================================== */}
            {/* TAB 4: COMMENTS */}
            {/* ============================================================== */}
            <TabsContent value="comments" className="space-y-4">
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-6">
                    No comments yet. Start the conversation!
                  </p>
                ) : (
                  comments.map((c: any) => {
                    const cAuthor = c.userId?.name || "User";
                    const cInitials = getAvatarFallbackText(cAuthor);
                    const cColor = getAvatarColor(cAuthor);
                    const isAuthor =
                      c.userId?._id?.toString() === user?._id?.toString();

                    return (
                      <div
                        key={c._id}
                        className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/40 border"
                      >
                        <div className="flex items-start gap-2.5">
                          <Avatar className="h-7 w-7 mt-0.5">
                            <AvatarImage
                              src={c.userId?.profilePicture || ""}
                            />
                            <AvatarFallback className={`${cColor} text-[10px]`}>
                              {cInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold">
                                {cAuthor}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(c.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-sm mt-1 whitespace-pre-wrap">
                              {c.content}
                            </p>
                          </div>
                        </div>

                        {isAuthor && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              deleteComment({
                                workspaceId,
                                commentId: c._id,
                              })
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Textarea
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[70px] text-sm"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={isAddingComment || !commentText.trim()}
                    onClick={handleAddComment}
                  >
                    Post Comment
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* ============================================================== */}
            {/* TAB 5: ATTACHMENTS */}
            {/* ============================================================== */}
            <TabsContent value="attachments" className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Files ({attachments.length})
                </span>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <span className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-medium hover:bg-primary/90">
                    <Upload className="w-3.5 h-3.5 mr-1" />
                    {isUploading ? "Uploading..." : "Upload File"}
                  </span>
                </label>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {attachments.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-6">
                    No files attached yet.
                  </p>
                ) : (
                  attachments.map((att: any) => (
                    <div
                      key={att._id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileIcon className="w-5 h-5 text-blue-500 shrink-0" />
                        <div className="truncate">
                          <p className="text-sm font-medium truncate">
                            {att.fileName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {(att.fileSize / 1024).toFixed(1)} KB • Uploaded by{" "}
                            {att.userId?.name || "Member"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={att.fileData}
                          download={att.fileName}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent"
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            deleteAttachment({
                              workspaceId,
                              attachmentId: att._id,
                            })
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
