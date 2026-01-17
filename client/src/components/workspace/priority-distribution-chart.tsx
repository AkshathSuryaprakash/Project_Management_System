'use client';

import { useNavigate } from 'react-router-dom';
import useWorkspaceId from '@/hooks/use-workspace-id';

interface PriorityDistributionChartProps {
  highCount?: number;
  mediumCount?: number;
  lowCount?: number;
}

const PriorityDistributionChart = ({
  highCount = 0,
  mediumCount = 0,
  lowCount = 0,
}: PriorityDistributionChartProps) => {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();

  const priorityData = [
    {
      name: 'High',
      value: highCount,
      fill: '#ef4444',
      key: 'HIGH',
    },
    {
      name: 'Medium',
      value: mediumCount,
      fill: '#eab308',
      key: 'MEDIUM',
    },
    {
      name: 'Low',
      value: lowCount,
      fill: '#22c55e',
      key: 'LOW',
    },
  ];

  const totalTasks = priorityData.reduce((sum, item) => sum + item.value, 0);
  const maxValue = Math.max(...priorityData.map(item => item.value), 1);

  const handleBarClick = (priority: string) => {
    navigate(`/workspace/${workspaceId}/tasks?priority=${priority}`);
  };

  return (
    <div className="w-full bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col items-center justify-center">
      <div className="flex items-center justify-between mb-6 w-full max-w-2xl">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Priority Distribution</h3>
          <p className="text-sm text-gray-500 mt-1">Task breakdown by priority</p>
        </div>
      </div>

      {/* Priority Bars */}
      <div className="space-y-8 w-full max-w-2xl">
        {priorityData.map((priority) => {
          const percentage = totalTasks > 0 ? (priority.value / totalTasks) * 100 : 0;
          const barWidth = totalTasks > 0 ? (priority.value / maxValue) * 100 : 0;

          return (
            <div
              key={priority.key}
              onClick={() => handleBarClick(priority.key)}
              className="cursor-pointer group"
            >
              {/* Label and count */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-base font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                  {priority.name}
                </span>
                <div className="text-right">
                  {/* <span className="text-lg font-bold text-gray-900">{priority.value}</span> */}
                  <span className="text-base font-semibold text-gray-600 ml-2">{percentage.toFixed(1)}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-4 group-hover:shadow-md"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: priority.fill,
                  }}
                >
                  {barWidth > 15 && (
                    <span className="text-m font-bold text-white">
                      {priority.value}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-20 pt-8 border-t border-gray-200 w-full max-w-2xl">
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-900">{totalTasks}</div>
          <div className="text-sm text-gray-500 mt-2">Total Tasks by Priority</div>
        </div>
      </div>
    </div>
  );
};

export default PriorityDistributionChart;