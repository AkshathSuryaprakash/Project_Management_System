import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useWorkspaceId from '@/hooks/use-workspace-id';
import { ProjectType, TaskType } from '@/types/api.type';

interface ProjectProgressChartProps {
  projects: ProjectType[];
  tasks: TaskType[];
}

const ProjectProgressChart = ({ projects, tasks }: ProjectProgressChartProps) => {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();
  const [showAll, setShowAll] = useState(false);

  const MAX_VISIBLE_PROJECTS = 4;

  if (!workspaceId) {
    return <div className="text-center py-12 text-gray-500">Loading workspace...</div>;
  }

  const getProjectTasks = (projectId: string): TaskType[] => {
    return tasks.filter(task => task.project?._id === projectId);
  };

  const getWeightedProgress = (projectTasks: TaskType[]) => {
    if (projectTasks.length === 0) return 0;

    const weights: Record<string, number> = {
      BACKLOG: 0.0,
      TODO: 0.0,
      IN_PROGRESS: 0.4,
      IN_REVIEW: 0.8,
      DONE: 1.0,
    };

    const totalWeight = projectTasks.reduce((sum, task) => {
      const weight = weights[task.status] ?? 0;
      return sum + weight;
    }, 0);
    
    return (totalWeight / projectTasks.length) * 100;
  };

  const getOverdueCount = (projectTasks: TaskType[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return projectTasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today && task.status !== 'DONE';
    }).length;
  };

  const getUpcomingCount = (projectTasks: TaskType[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fourDaysLater = new Date(today);
    fourDaysLater.setDate(fourDaysLater.getDate() + 4);

    return projectTasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today && dueDate <= fourDaysLater && task.status !== 'DONE';
    }).length;
  };

  const getPriorityDistribution = (projectTasks: TaskType[]) => {
    const distribution = { LOW: 0, MEDIUM: 0, HIGH: 0 };

    projectTasks.forEach(task => {
      if (task.priority === 'LOW') distribution.LOW++;
      else if (task.priority === 'MEDIUM') distribution.MEDIUM++;
      else if (task.priority === 'HIGH') distribution.HIGH++;
    });

    return distribution;
  };

  const handlePriorityClick = (projectId: string, priority: string) => {
    navigate(`/workspace/${workspaceId}/project/${projectId}?priority=${priority}`);
  };

  const handleProjectClick = (projectId: string) => {
    navigate(`/workspace/${workspaceId}/project/${projectId}`);
  };

  const handleOverdueClick = (projectId: string) => {
    // Use dueDate=overdue which will be handled by client-side filtering
    navigate(`/workspace/${workspaceId}/project/${projectId}?dueDate=overdue`);
  };

  const handleUpcomingClick = (projectId: string) => {
    // Use dueDate=due_soon which will be handled by client-side filtering
    navigate(`/workspace/${workspaceId}/project/${projectId}?dueDate=due_soon`);  // ✅ Changed
  };

  const visibleProjects = showAll ? projects : projects.slice(0, MAX_VISIBLE_PROJECTS);
  const hiddenCount = projects.length - MAX_VISIBLE_PROJECTS;

  return (
    <div className="w-full">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900">Project Health</h3>
        <p className="text-sm text-gray-500 mt-1">Monitor project status, deadlines, and task priorities</p>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-gray-500 font-medium">No projects yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first project to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleProjects.map((project) => {
            const projectTasks = getProjectTasks(project._id);
            const progress = getWeightedProgress(projectTasks);
            const overdueCount = getOverdueCount(projectTasks);
            const upcomingCount = getUpcomingCount(projectTasks);
            const priorityDistribution = getPriorityDistribution(projectTasks);

            return (
              <div
                key={project._id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 p-4"
              >
                {/* Row 1: Project Title + Progress + Overdue + Upcoming */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Project Title */}
                  <div 
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity flex-1 min-w-[200px]"
                    onClick={() => handleProjectClick(project._id)}
                  >
                    <span className="text-xl">{project.emoji || '📦'}</span>
                    <div>
                      <h4 className="font-semibold text-gray-900 hover:text-violet-600 transition-colors text-sm">
                        {project.name}
                      </h4>
                      <p className="text-xs text-gray-400">{projectTasks.length} tasks</p>
                    </div>
                  </div>

                  {/* Stats Cards - Row 1 */}
                  <div className="flex items-center gap-2">
                    {/* Progress Card - Modern Violet/Purple with Label */}
                    <div className="group relative">
                      <div className="bg-gradient-to-br from-violet-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all cursor-default">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold opacity-90">Progress</span>
                          <span className="text-base font-bold">{progress.toFixed(0)}%</span>
                        </div>
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-30 pointer-events-none">
                        <p className="text-xs font-semibold text-gray-800">Progress: {progress.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500">Weighted by task status</p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent border-t-white"></div>
                      </div>
                    </div>

                    {/* Overdue Card - Red with Label */}
                    <div className="group relative">
                      <div 
                        className={`px-4 py-2 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all ${
                          overdueCount > 0 
                            ? 'bg-gradient-to-br from-red-500 to-red-600 text-white cursor-pointer' 
                            : 'bg-gray-100 text-gray-400 cursor-default'
                        }`}
                        onClick={() => overdueCount > 0 && handleOverdueClick(project._id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold opacity-90">Overdue</span>
                          <span className="text-base font-bold">{overdueCount}</span>
                        </div>
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-30 pointer-events-none">
                        <p className="text-xs font-semibold text-gray-800">Overdue Tasks: {overdueCount}</p>
                        <p className="text-xs text-gray-500">{overdueCount > 0 ? 'Click to view overdue tasks' : 'No overdue tasks'}</p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent border-t-white"></div>
                      </div>
                    </div>

                    {/* Upcoming Card - Modern Cyan/Teal with Label */}
                    <div className="group relative">
                      <div 
                        className={`px-4 py-2 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all ${
                          upcomingCount > 0 
                            ? 'bg-gradient-to-br from-cyan-500 to-teal-500 text-white cursor-pointer' 
                            : 'bg-gray-100 text-gray-400 cursor-default'
                        }`}
                        onClick={() => upcomingCount > 0 && handleUpcomingClick(project._id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold opacity-90">Due Soon</span>
                          <span className="text-base font-bold">{upcomingCount}</span>
                        </div>
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-30 pointer-events-none">
                        <p className="text-xs font-semibold text-gray-800">Approaching Deadline: {upcomingCount}</p>
                        <p className="text-xs text-gray-500">{upcomingCount > 0 ? 'Due in next 4 days' : 'No upcoming deadlines'}</p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent border-t-white"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: Priority Cards */}
                {projectTasks.length > 0 && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400 mr-1">Priority:</span>
                    
                    {/* High Priority - Vibrant Red Gradient */}
                    <div className="group relative">
                      <div 
                        className={`px-2.5 py-1 rounded-md shadow-sm hover:shadow-md hover:scale-105 transition-all ${
                          priorityDistribution.HIGH > 0 
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white cursor-pointer' 
                            : 'bg-gray-100 text-gray-400 cursor-default'
                        }`}
                        onClick={() => priorityDistribution.HIGH > 0 && handlePriorityClick(project._id, 'HIGH')}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium">High</span>
                          <span className="text-xs font-bold">{priorityDistribution.HIGH}</span>
                        </div>
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-30 pointer-events-none">
                        <p className="text-xs font-semibold text-gray-800">High Priority: {priorityDistribution.HIGH} tasks</p>
                        <p className="text-xs text-gray-500">{priorityDistribution.HIGH > 0 ? 'Click to filter' : 'No high priority tasks'}</p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent border-t-white"></div>
                      </div>
                    </div>

                    {/* Medium Priority - Vibrant Orange/Amber */}
                    <div className="group relative">
                      <div 
                        className={`px-2.5 py-1 rounded-md shadow-sm hover:shadow-md hover:scale-105 transition-all ${
                          priorityDistribution.MEDIUM > 0 
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white cursor-pointer' 
                            : 'bg-gray-100 text-gray-400 cursor-default'
                        }`}
                        onClick={() => priorityDistribution.MEDIUM > 0 && handlePriorityClick(project._id, 'MEDIUM')}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium">Med</span>
                          <span className="text-xs font-bold">{priorityDistribution.MEDIUM}</span>
                        </div>
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-30 pointer-events-none">
                        <p className="text-xs font-semibold text-gray-800">Medium Priority: {priorityDistribution.MEDIUM} tasks</p>
                        <p className="text-xs text-gray-500">{priorityDistribution.MEDIUM > 0 ? 'Click to filter' : 'No medium priority tasks'}</p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent border-t-white"></div>
                      </div>
                    </div>

                    {/* Low Priority - Vibrant Green/Emerald */}
                    <div className="group relative">
                      <div 
                        className={`px-2.5 py-1 rounded-md shadow-sm hover:shadow-md hover:scale-105 transition-all ${
                          priorityDistribution.LOW > 0 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white cursor-pointer' 
                            : 'bg-gray-100 text-gray-400 cursor-default'
                        }`}
                        onClick={() => priorityDistribution.LOW > 0 && handlePriorityClick(project._id, 'LOW')}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium">Low</span>
                          <span className="text-xs font-bold">{priorityDistribution.LOW}</span>
                        </div>
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-30 pointer-events-none">
                        <p className="text-xs font-semibold text-gray-800">Low Priority: {priorityDistribution.LOW} tasks</p>
                        <p className="text-xs text-gray-500">{priorityDistribution.LOW > 0 ? 'Click to filter' : 'No low priority tasks'}</p>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-8 border-transparent border-t-white"></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty State for no tasks */}
                {projectTasks.length === 0 && (
                  <p className="text-xs text-gray-400 mt-2">No tasks yet</p>
                )}
              </div>
            );
          })}

          {/* Show More / Show Less Button */}
          {projects.length > MAX_VISIBLE_PROJECTS && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-3 px-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:text-gray-800 transition-all duration-200 flex items-center justify-center gap-2"
            >
              {showAll ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Show Less
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Show {hiddenCount} More Project{hiddenCount > 1 ? 's' : ''}
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectProgressChart;