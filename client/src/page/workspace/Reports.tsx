import { useQuery } from "@tanstack/react-query";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { getReportsQueryFn, exportReportsCsvQueryFn } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Loader } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Reports() {
  const workspaceId = useWorkspaceId();

  const { data, isLoading } = useQuery({
    queryKey: ["reports", workspaceId],
    queryFn: () => getReportsQueryFn(workspaceId),
    enabled: !!workspaceId,
  });

  const handleExportCsv = async () => {
    try {
      const blob = await exportReportsCsvQueryFn(workspaceId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `workspace-report-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({
        title: "Export Complete",
        description: "Task CSV report downloaded successfully.",
        variant: "success",
      });
    } catch (err: any) {
      toast({
        title: "Export Failed",
        description: err.message || "Failed to download CSV",
        variant: "destructive",
      });
    }
  };

  const projectSummaries = data?.projectSummaries || [];
  const taskBreakdown = data?.taskBreakdown || [];

  return (
    <div className="w-full flex flex-col space-y-6">
      {/* Header matching Figure 9.11 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Workspace Reports &amp; Export
          </h1>
          <p className="text-sm text-muted-foreground">
            Comprehensive project performance breakdown and CSV export
          </p>
        </div>
        <Button onClick={handleExportCsv} className="flex items-center gap-2">
          <Download className="w-4 h-4" /> Export CSV Report
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-80">
          <Loader className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* SECTION 1: PROJECT SUMMARIES matching Figure 9.11 */}
          <div>
            <h2 className="text-lg font-semibold tracking-tight mb-3">
              Project Performance Summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {projectSummaries.map((p: any) => (
                <Card key={p._id} className="shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-semibold truncate flex items-center gap-1.5">
                      <span>{p.emoji || "📊"}</span>
                      <span className="truncate">{p.name}</span>
                    </CardTitle>
                    <Badge variant="secondary" className="font-bold text-xs">
                      {p.completionPercentage}%
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Progress Bar */}
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${p.completionPercentage}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 text-center text-xs pt-1">
                      <div>
                        <span className="text-muted-foreground block">Total</span>
                        <span className="font-bold text-sm">{p.total}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Done</span>
                        <span className="font-bold text-sm text-emerald-600">
                          {p.done}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Pending</span>
                        <span className="font-bold text-sm text-amber-600">
                          {p.pending}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* SECTION 2: TASK BREAKDOWN TABLE matching Figure 9.12 */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-base">Task Breakdown</h3>
              <span className="text-xs text-muted-foreground">
                Showing {taskBreakdown.length} tasks
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-[11px] uppercase bg-muted/40 font-bold text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Assigned To</th>
                    <th className="px-4 py-3">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {taskBreakdown.map((t: any) => (
                    <tr
                      key={t._id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-muted-foreground">
                        {t.taskCode || "task"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {t.title}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {t.project}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase font-bold"
                        >
                          {t.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            t.priority === "HIGH"
                              ? "bg-red-500/15 text-red-600 dark:text-red-400 font-semibold"
                              : t.priority === "MEDIUM"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold"
                              : "bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold"
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">{t.assignedTo}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">
                        {t.dueDate
                          ? new Date(t.dueDate).toISOString().split("T")[0]
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
