import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createAttachmentMutationFn,
  createCommentMutationFn,
  deleteAttachmentMutationFn,
  deleteCommentMutationFn,
  getAttachmentsQueryFn,
  getCommentsQueryFn,
} from "@/lib/api";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { useAuthContext } from "@/context/auth-provider";
import { toast } from "@/hooks/use-toast";
import { getAvatarColor, getAvatarFallbackText } from "@/lib/helper";

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

  const taskId = task?._id;

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

  const comments = commentsData?.comments || [];
  const attachments = attachmentsData?.attachments || [];

  // Add Comment Mutation
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

  // Delete Comment Mutation
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

  // Upload Attachment Mutation
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

  // Delete Attachment Mutation
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
      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-3 border-b">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs uppercase">
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
          <DialogTitle className="text-xl font-bold mt-2">
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 overflow-y-auto flex-1">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="comments" className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Comments ({comments.length})
              </TabsTrigger>
              <TabsTrigger
                value="attachments"
                className="flex items-center gap-1.5"
              >
                <Paperclip className="w-3.5 h-3.5" />
                Attachments ({attachments.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: DETAILS */}
            <TabsContent value="details" className="space-y-4">
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
                    Recurrence
                  </span>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{task.recurrence || "NONE"}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: COMMENTS */}
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

            {/* TAB 3: ATTACHMENTS */}
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
