import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import useCreateProjectDialog from "@/hooks/use-create-project-dialog";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { getProjectsInWorkspaceQueryFn, getAllTasksQueryFn } from "@/lib/api";
import WorkspaceAnalytics from "@/components/workspace/workspace-analytics";
import TaskDistributionChart from "@/components/workspace/task-distribution-chart";
import PriorityDistributionChart from "@/components/workspace/priority-distribution-chart";
import ProjectProgressChart from "@/components/workspace/project-progress-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RecentProjects from "@/components/workspace/project/recent-projects";
import RecentTasks from "@/components/workspace/task/recent-tasks";
import RecentMembers from "@/components/workspace/member/recent-members";

const WorkspaceDashboard = () => {
  const { onOpen } = useCreateProjectDialog();
  const workspaceId = useWorkspaceId();

  // Fetch projects
  const { data: projectsResponse } = useQuery({
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

  // Fetch all tasks
  const { data: tasksResponse } = useQuery({
    queryKey: ["tasks", workspaceId],
    queryFn: () =>
      getAllTasksQueryFn({
        workspaceId,
        pageSize: 1000,
        pageNumber: 1,
      }),
    staleTime: 0,
    enabled: !!workspaceId,
  });

  const projects = projectsResponse?.projects || [];
  const tasks = tasksResponse?.tasks || [];

  // Calculate task distribution by status
  const taskDistribution = {
    backlogCount: tasks.filter((task) => {
      const status = String(task.status).toUpperCase();
      return status === "BACKLOG";
    }).length,
    todoCount: tasks.filter((task) => {
      const status = String(task.status).toUpperCase();
      return status === "TODO";
    }).length,
    inProgressCount: tasks.filter((task) => {
      const status = String(task.status).toUpperCase();
      return status === "IN_PROGRESS" || status === "INPROGRESS";
    }).length,
    inReviewCount: tasks.filter((task) => {
      const status = String(task.status).toUpperCase();
      return status === "IN_REVIEW" || status === "INREVIEW" || status === "REVIEW";
    }).length,
    doneCount: tasks.filter((task) => {
      const status = String(task.status).toUpperCase();
      return status === "DONE" || status === "COMPLETED" || status === "FINISHED";
    }).length,
  };

  // Calculate priority distribution from tasks
  const priorityData = {
    highCount: tasks.filter((task) => {
      const priority = String(task.priority).toUpperCase();
      return priority === "HIGH";
    }).length,
    mediumCount: tasks.filter((task) => {
      const priority = String(task.priority).toUpperCase();
      return priority === "MEDIUM";
    }).length,
    lowCount: tasks.filter((task) => {
      const priority = String(task.priority).toUpperCase();
      return priority === "LOW";
    }).length,
  };

  return (
    <main className="flex flex-1 flex-col py-4 md:pt-3">
      <div className="flex items-center justify-between space-y-2 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Workspace Overview
          </h2>
          <p className="text-muted-foreground">
            Here&apos;s an overview for this workspace!
          </p>
        </div>
        <Button onClick={onOpen}>
          <Plus />
          New Project
        </Button>
      </div>
      <WorkspaceAnalytics />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <TaskDistributionChart
          backlogCount={taskDistribution.backlogCount}
          todoCount={taskDistribution.todoCount}
          inProgressCount={taskDistribution.inProgressCount}
          inReviewCount={taskDistribution.inReviewCount}
          doneCount={taskDistribution.doneCount}
        />
        <PriorityDistributionChart
          highCount={priorityData.highCount}
          mediumCount={priorityData.mediumCount}
          lowCount={priorityData.lowCount}
        />
      </div>

      {/* Project Progress */}
      {projects.length > 0 && (
        <div className="mt-6">
          <ProjectProgressChart projects={projects} tasks={tasks} />
        </div>
      )}

      {/* Tabs Section */}
      <div className="mt-6">
        <Tabs defaultValue="projects" className="w-full border rounded-lg p-2">
          <TabsList className="w-full justify-start border-0 bg-gray-50 px-1 h-12">
            <TabsTrigger className="py-2" value="tasks">
              Recent Tasks
            </TabsTrigger>
            <TabsTrigger className="py-2" value="members">
              Recent Members
            </TabsTrigger>
            <TabsTrigger className="py-2" value="projects">
              Recent Projects
            </TabsTrigger>
          </TabsList>
          <TabsContent value="projects">
            <RecentProjects />
          </TabsContent>
          <TabsContent value="tasks">
            <RecentTasks />
          </TabsContent>
          <TabsContent value="members">
            <RecentMembers />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default WorkspaceDashboard;