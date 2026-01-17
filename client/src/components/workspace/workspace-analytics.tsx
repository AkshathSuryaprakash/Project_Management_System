import useWorkspaceId from "@/hooks/use-workspace-id";
import AnalyticsCard from "./common/analytics-card";
import { useQuery } from "@tanstack/react-query";
import { getWorkspaceAnalyticsQueryFn, getProjectsInWorkspaceQueryFn, getMembersInWorkspaceQueryFn } from "@/lib/api";

const WorkspaceAnalytics = () => {
  const workspaceId = useWorkspaceId();

  const { data: analyticsData, isPending: analyticsLoading } = useQuery({
    queryKey: ["workspace-analytics", workspaceId],
    queryFn: () => getWorkspaceAnalyticsQueryFn(workspaceId),
    staleTime: 0,
    enabled: !!workspaceId,
  });

  const { data: projectsData, isPending: projectsLoading } = useQuery({
    queryKey: ["projects", workspaceId],
    queryFn: () =>
      getProjectsInWorkspaceQueryFn({
        workspaceId,
        pageSize: 100,
        pageNumber: 1,
      }),
    staleTime: 0,
    enabled: !!workspaceId,
  });

  const { data: membersData, isPending: membersLoading } = useQuery({
    queryKey: ["members", workspaceId],
    queryFn: () => getMembersInWorkspaceQueryFn(workspaceId),
    staleTime: 0,
    enabled: !!workspaceId,
  });

  const analytics = analyticsData?.analytics;
  const projects = projectsData?.projects || [];
  const members = membersData?.members || [];

  return (
    <div className="grid gap-4 md:gap-5 lg:grid-cols-2 xl:grid-cols-4">
      <AnalyticsCard
        isLoading={projectsLoading}
        title="Total Projects"
        value={projects.length}
      />
      <AnalyticsCard
        isLoading={analyticsLoading}
        title="Total Tasks"
        value={analytics?.totalTasks || 0}
      />
      <AnalyticsCard
        isLoading={analyticsLoading}
        title="Completed Tasks"
        value={analytics?.completedTasks || 0}
      />
      <AnalyticsCard
        isLoading={membersLoading}
        title="Members"
        value={members.length}
      />
    </div>
  );
};

export default WorkspaceAnalytics;