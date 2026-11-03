import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { getWorkspaceMembersWorkloadQueryFn } from "@/lib/api";
import {
  MemberWorkloadType,
  MemberWorkloadSummaryType,
  WorkspaceMembersWorkloadResponseType,
} from "@/types/api.type";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  Loader,
  Search,
  ShieldCheck,
  Users,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  ListTodo,
  TrendingUp,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAvatarColor, getAvatarFallbackText } from "@/lib/helper";

export default function MemberWorkloadDashboard() {
  const workspaceId = useWorkspaceId();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOverloadedOnly, setFilterOverloadedOnly] = useState(false);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery<WorkspaceMembersWorkloadResponseType>({
    queryKey: ["members-workload", workspaceId],
    queryFn: () => getWorkspaceMembersWorkloadQueryFn(workspaceId),
    enabled: !!workspaceId,
  });

  const summary: MemberWorkloadSummaryType = data?.summary || {
    totalMembers: 0,
    overloadedMembersCount: 0,
    totalAssignedTasks: 0,
    totalCompleted: 0,
    totalPending: 0,
    totalOverdue: 0,
    averageSuccessRatio: 0,
    overloadThreshold: 5,
  };

  const members: MemberWorkloadType[] = data?.members || [];

  // Filter members by search and overloaded toggle
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOverloaded = filterOverloadedOnly ? m.isOverloaded : true;
    return matchesSearch && matchesOverloaded;
  });

  const toggleExpand = (id: string) => {
    setExpandedMemberId(expandedMemberId === id ? null : id);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <Loader className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">
          Loading team workload &amp; task performance analytics...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 rounded-xl border border-destructive/30 bg-destructive/10 text-center space-y-2">
        <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
        <h3 className="font-semibold text-sm text-destructive">
          Failed to load member workload analytics
        </h3>
        <p className="text-xs text-muted-foreground">
          {(error as any)?.response?.data?.message ||
            "You may not have administrator permissions to view this resource."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-2">
      {/* Admin Privacy Shield Notice */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs">
        <ShieldCheck className="w-4 h-4 shrink-0" />
        <span>
          <span className="font-bold">Admin Only View:</span> Member task allocation,
          individual workload overload alerts, and task completion records are restricted to
          workspace administrators.
        </span>
      </div>

      {/* OVERVIEW SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Members */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Total Members
            </CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalMembers}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Across workspace projects
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Assigned Tasks */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Distributed Tasks
            </CardTitle>
            <ListTodo className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {summary.totalAssignedTasks}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {summary.totalCompleted} done • {summary.totalPending} pending
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Overloaded Members Alert */}
        <Card
          className={`shadow-xs cursor-pointer transition-colors ${
            summary.overloadedMembersCount > 0
              ? "border-red-500/50 bg-red-500/5 hover:bg-red-500/10"
              : "border-border"
          }`}
          onClick={() => setFilterOverloadedOnly(!filterOverloadedOnly)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Overloaded Members
            </CardTitle>
            <Flame
              className={`w-4 h-4 ${
                summary.overloadedMembersCount > 0
                  ? "text-red-500 animate-pulse"
                  : "text-muted-foreground"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                summary.overloadedMembersCount > 0 ? "text-red-600" : "text-foreground"
              }`}
            >
              {summary.overloadedMembersCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {summary.overloadedMembersCount > 0
                ? `≥ ${summary.overloadThreshold} active tasks (Click to filter)`
                : "No members overloaded"}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Average Success Ratio */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Team Success Ratio
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600">
                {summary.averageSuccessRatio}%
              </span>
              <span className="text-[11px] text-muted-foreground">completion</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all"
                style={{ width: `${summary.averageSuccessRatio}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search member by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={filterOverloadedOnly ? "destructive" : "outline"}
            size="sm"
            onClick={() => setFilterOverloadedOnly(!filterOverloadedOnly)}
            className="text-xs h-9 gap-1.5"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Overloaded Only ({summary.overloadedMembersCount})</span>
          </Button>

          {filterOverloadedOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilterOverloadedOnly(false)}
              className="text-xs h-9"
            >
              Clear Filter
            </Button>
          )}
        </div>
      </div>

      {/* MEMBER WORKLOAD CARDS LIST */}
      <div className="space-y-3">
        {filteredMembers.length === 0 ? (
          <div className="text-center py-12 rounded-xl border bg-muted/20 text-muted-foreground space-y-2">
            <Users className="w-8 h-8 mx-auto opacity-40" />
            <p className="text-sm font-medium">No members match the current filter.</p>
            {filterOverloadedOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterOverloadedOnly(false)}
                className="text-xs mt-1"
              >
                Show All Members
              </Button>
            )}
          </div>
        ) : (
          filteredMembers.map((member) => {
            const isExpanded = expandedMemberId === member.memberId;
            const initials = getAvatarFallbackText(member.user.name);
            const avatarColor = getAvatarColor(member.user.name);

            return (
              <div
                key={member.memberId}
                className={`rounded-xl border bg-card transition-all overflow-hidden ${
                  member.isOverloaded
                    ? "border-red-500/40 shadow-xs"
                    : "border-border shadow-2xs"
                }`}
              >
                {/* MEMBER MAIN ROW */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Member Profile */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <Avatar className="h-11 w-11 shrink-0 border">
                      <AvatarImage
                        src={member.user.profilePicture || ""}
                        alt={member.user.name}
                      />
                      <AvatarFallback className={avatarColor}>{initials}</AvatarFallback>
                    </Avatar>

                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-foreground truncate">
                          {member.user.name}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-bold tracking-wider"
                        >
                          {member.role}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.user.email}
                      </p>

                      {/* Overload Alert Badge */}
                      <div className="mt-1 flex items-center gap-2">
                        {member.isOverloaded ? (
                          <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 font-bold text-[10px] gap-1 px-2 py-0.5">
                            <Flame className="w-3 h-3 fill-current" />
                            <span>OVERLOADED ({member.pendingCount} ACTIVE TASKS)</span>
                          </Badge>
                        ) : member.workloadLevel === "HIGH" ? (
                          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-semibold gap-1">
                            <Clock className="w-3 h-3" />
                            <span>High Load ({member.pendingCount} active)</span>
                          </Badge>
                        ) : member.workloadLevel === "MODERATE" ? (
                          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-[10px] font-semibold">
                            Moderate Load ({member.pendingCount} active)
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                            Balanced Load ({member.pendingCount} active)
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Task Metrics & Success Ratio */}
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-6 pt-2 lg:pt-0 border-t lg:border-t-0">
                    {/* Task Counts Grid */}
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      {/* Total */}
                      <div className="bg-muted/30 px-2.5 py-1.5 rounded-lg border">
                        <span className="text-[10px] text-muted-foreground block font-medium">
                          Total
                        </span>
                        <span className="font-bold text-sm text-foreground">
                          {member.totalTasks}
                        </span>
                      </div>

                      {/* Completed */}
                      <div className="bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-medium">
                          Done
                        </span>
                        <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          {member.completedCount}
                        </span>
                      </div>

                      {/* Pending */}
                      <div className="bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20">
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-medium">
                          Pending
                        </span>
                        <span className="font-bold text-sm text-amber-600 dark:text-amber-400">
                          {member.pendingCount}
                        </span>
                      </div>

                      {/* Overdue */}
                      <div
                        className={`px-2.5 py-1.5 rounded-lg border ${
                          member.overdueCount > 0
                            ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                            : "bg-muted/20 text-muted-foreground"
                        }`}
                      >
                        <span className="text-[10px] block font-medium">Overdue</span>
                        <span className="font-bold text-sm">{member.overdueCount}</span>
                      </div>
                    </div>

                    {/* Success Ratio Bar */}
                    <div className="w-28 sm:w-32 shrink-0">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground text-[11px]">Success</span>
                        <span className="font-bold text-emerald-600">
                          {member.successRatio}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${member.successRatio}%` }}
                        />
                      </div>
                    </div>

                    {/* Expand / Details Toggle Button */}
                    <Button
                      variant={isExpanded ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => toggleExpand(member.memberId)}
                      className="text-xs h-9 gap-1 shrink-0"
                    >
                      <span>{isExpanded ? "Hide Details" : "View Tasks"}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* EXPANDED SECTION: COMPLETED TASKS & ACTIVE TASKS */}
                {isExpanded && (
                  <div className="border-t bg-muted/15 p-4 sm:p-5 space-y-4">
                    <Tabs defaultValue="completed" className="w-full">
                      <TabsList className="grid w-full sm:w-80 grid-cols-2 mb-3">
                        <TabsTrigger value="completed" className="text-xs gap-1.5">
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Completed ({member.completedTasks.length})</span>
                        </TabsTrigger>
                        <TabsTrigger value="pending" className="text-xs gap-1.5">
                          <ListTodo className="w-3.5 h-3.5 text-amber-600" />
                          <span>Pending ({member.pendingTasks.length})</span>
                        </TabsTrigger>
                      </TabsList>

                      {/* TAB 1: WHAT AND ALL THEY COMPLETED */}
                      <TabsContent value="completed" className="space-y-2 mt-0">
                        <div className="flex items-center justify-between pb-1">
                          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Completed Tasks by {member.user.name} ({member.completedTasks.length})
                          </h5>
                          <span className="text-xs text-emerald-600 font-medium">
                            Success Rate: {member.successRatio}%
                          </span>
                        </div>

                        {member.completedTasks.length === 0 ? (
                          <div className="p-6 text-center text-xs text-muted-foreground rounded-lg border bg-card">
                            No tasks completed by this member yet.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {member.completedTasks.map((t) => (
                              <div
                                key={t._id}
                                className="flex items-start justify-between p-3 rounded-lg border bg-card text-xs space-y-1"
                              >
                                <div className="space-y-1 min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <Badge
                                      variant="outline"
                                      className="font-mono text-[10px] uppercase font-bold"
                                    >
                                      {t.taskCode}
                                    </Badge>
                                    <span className="font-semibold text-foreground truncate">
                                      {t.title}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                                    <span className="flex items-center gap-1">
                                      <span>{t.project.emoji}</span>
                                      <span className="truncate">{t.project.name}</span>
                                    </span>
                                    {t.completedAt && (
                                      <span>
                                        • Finished{" "}
                                        {new Date(t.completedAt).toLocaleDateString(
                                          undefined,
                                          { month: "short", day: "numeric" }
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] shrink-0 font-bold">
                                  DONE
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      {/* TAB 2: CURRENT PENDING TASKS */}
                      <TabsContent value="pending" className="space-y-2 mt-0">
                        <div className="flex items-center justify-between pb-1">
                          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Active Tasks Remaining ({member.pendingTasks.length})
                          </h5>
                          {member.isOverloaded && (
                            <span className="text-xs text-red-600 font-bold">
                              ⚠️ High workload: reallocate tasks if needed
                            </span>
                          )}
                        </div>

                        {member.pendingTasks.length === 0 ? (
                          <div className="p-6 text-center text-xs text-emerald-600 rounded-lg border bg-card flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>No pending tasks! Member is completely caught up.</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {member.pendingTasks.map((t) => (
                              <div
                                key={t._id}
                                className={`flex items-start justify-between p-3 rounded-lg border bg-card text-xs space-y-1 ${
                                  t.isOverdue ? "border-red-500/40 bg-red-500/5" : ""
                                }`}
                              >
                                <div className="space-y-1 min-w-0 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <Badge
                                      variant="outline"
                                      className="font-mono text-[10px] uppercase font-bold"
                                    >
                                      {t.taskCode}
                                    </Badge>
                                    <span className="font-semibold text-foreground truncate">
                                      {t.title}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                                    <span className="flex items-center gap-1">
                                      <span>{t.project.emoji}</span>
                                      <span className="truncate">{t.project.name}</span>
                                    </span>
                                    {t.dueDate && (
                                      <span
                                        className={
                                          t.isOverdue
                                            ? "text-red-600 font-bold"
                                            : "text-muted-foreground"
                                        }
                                      >
                                        • Due{" "}
                                        {new Date(t.dueDate).toLocaleDateString(
                                          undefined,
                                          { month: "short", day: "numeric" }
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <Badge variant="secondary" className="text-[10px] uppercase">
                                    {t.status}
                                  </Badge>
                                  {t.isOverdue && (
                                    <span className="text-[10px] text-red-600 font-bold">
                                      OVERDUE
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}