import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, Loader, FolderKanban, CheckSquare, Users, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchWorkspaceQueryFn } from "@/lib/api";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { useNavigate } from "react-router-dom";

export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const workspaceId = useWorkspaceId();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: ["search", workspaceId, debouncedQuery],
    queryFn: () => searchWorkspaceQueryFn(workspaceId, debouncedQuery),
    enabled: !!workspaceId && debouncedQuery.trim().length > 0,
  });

  const results = data?.results || {
    projects: [],
    tasks: [],
    members: [],
    comments: [],
  };

  const handleSelectProject = (projectId: string) => {
    onOpenChange(false);
    navigate(`/workspace/${workspaceId}/project/${projectId}`);
  };

  const handleSelectTask = () => {
    onOpenChange(false);
    navigate(`/workspace/${workspaceId}/tasks`);
  };

  const handleSelectMember = () => {
    onOpenChange(false);
    navigate(`/workspace/${workspaceId}/members`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <DialogTitle className="sr-only">Search Workspace</DialogTitle>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks, projects, members..."
              className="border-0 focus-visible:ring-0 shadow-none px-1 text-base"
              autoFocus
            />
          </div>
        </DialogHeader>

        <div className="max-h-[360px] overflow-y-auto p-4 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && debouncedQuery && (
            <>
              {results.projects?.length === 0 &&
                results.tasks?.length === 0 &&
                results.members?.length === 0 &&
                results.comments?.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">
                    No results found for &quot;{debouncedQuery}&quot;
                  </p>
                )}

              {/* Projects */}
              {results.projects?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5" /> PROJECTS
                  </h4>
                  <div className="space-y-1">
                    {results.projects.map((p: any) => (
                      <div
                        key={p._id}
                        onClick={() => handleSelectProject(p._id)}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span>{p.emoji || "📊"}</span>
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {results.tasks?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5" /> TASKS
                  </h4>
                  <div className="space-y-1">
                    {results.tasks.map((t: any) => (
                      <div
                        key={t._id}
                        onClick={handleSelectTask}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {t.taskCode}
                          </span>
                          <span className="font-medium">{t.title}</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded bg-muted">
                          {t.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Members */}
              {results.members?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> MEMBERS
                  </h4>
                  <div className="space-y-1">
                    {results.members.map((m: any) => (
                      <div
                        key={m._id}
                        onClick={handleSelectMember}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer text-sm"
                      >
                        <span className="font-medium">{m.userId?.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {m.userId?.email}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              {results.comments?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> COMMENTS
                  </h4>
                  <div className="space-y-1">
                    {results.comments.map((c: any) => (
                      <div
                        key={c._id}
                        onClick={handleSelectTask}
                        className="p-2 rounded-md hover:bg-accent cursor-pointer text-sm"
                      >
                        <div className="font-medium text-xs text-muted-foreground mb-0.5">
                          {c.userId?.name} on {c.taskId?.title || "task"}
                        </div>
                        <div className="line-clamp-1">{c.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!debouncedQuery && (
            <p className="text-center text-xs text-muted-foreground py-6">
              Type to search anything in this workspace...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
