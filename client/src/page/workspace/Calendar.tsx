import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { getAllTasksQueryFn } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader } from "lucide-react";
import { TaskDetailDialog } from "@/components/workspace/task/task-detail-dialog";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar() {
  const workspaceId = useWorkspaceId();
  // Default to October 2026 to showcase the demonstration tasks from Figure 9.9
  const [currentDate, setCurrentDate] = useState(new Date(2026, 9, 1));
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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

  const tasks = data?.tasks || [];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Month grid calculations (Algorithm 8.14)
  const firstDayWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Robust date-only string extraction to prevent timezone-shift bugs
  const getDateKey = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    // Check UTC parts first if stored as ISO UTC noon/midnight
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    const day = d.getUTCDate();
    return `${y}-${m}-${day}`;
  };

  // Today for highlight
  const now = new Date();
  const isCurrentMonthThisMonth =
    now.getFullYear() === year && now.getMonth() === month;
  const todayDate = now.getDate();

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Header matching Figure 9.9 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar Schedule</h1>
          <p className="text-sm text-muted-foreground">
            View and manage tasks scheduled by due date
          </p>
        </div>

        {/* Month selector with prev/next arrows */}
        <div className="flex items-center gap-3 bg-muted/40 p-1.5 rounded-lg border">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevMonth}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm min-w-32 text-center">
            {currentDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextMonth}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-80">
          <Loader className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b bg-muted/30 text-center font-medium text-xs text-muted-foreground py-2.5">
            {WEEKDAYS.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Month Day Cells */}
          <div className="grid grid-cols-7 auto-rows-[115px] divide-x divide-y border-b">
            {/* Empty cells before 1st of month */}
            {Array.from({ length: firstDayWeekday }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="bg-muted/10 p-2 min-h-[110px]"
              />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const cellKey = `${year}-${month}-${day}`;

              // Find tasks on this exact date
              const dayTasks = tasks.filter((t: any) => {
                if (!t.dueDate) return false;
                return getDateKey(t.dueDate) === cellKey;
              });

              const isToday =
                isCurrentMonthThisMonth && day === todayDate;

              return (
                <div
                  key={`day-${day}`}
                  className={`p-2 min-h-[110px] flex flex-col justify-between transition-colors overflow-hidden ${
                    isToday ? "bg-primary/5 ring-1 ring-inset ring-primary" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                        isToday
                          ? "bg-primary text-primary-foreground font-bold"
                          : "text-foreground"
                      }`}
                    >
                      {day}
                    </span>

                    {dayTasks.length > 0 && (
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {dayTasks.length} task{dayTasks.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Task Chips */}
                  <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
                    {dayTasks.map((task: any) => {
                      const statusColor =
                        task.status === "DONE"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                          : task.status === "IN_PROGRESS"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                          : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30";

                      return (
                        <div
                          key={task._id}
                          onClick={() => {
                            setSelectedTask(task);
                            setDetailOpen(true);
                          }}
                          className={`flex items-center justify-between text-[11px] px-1.5 py-0.5 rounded border cursor-pointer hover:opacity-85 transition-opacity truncate gap-1 ${statusColor}`}
                          title={task.title}
                        >
                          <span className="truncate font-medium">
                            {task.title}
                          </span>
                          <span className="text-[9px] uppercase font-bold shrink-0">
                            {task.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

