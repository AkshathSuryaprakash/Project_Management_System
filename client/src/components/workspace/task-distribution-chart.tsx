'use client';

import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import useWorkspaceId from '@/hooks/use-workspace-id';

interface TaskDistributionChartProps {
  backlogCount: number;
  todoCount: number;
  inProgressCount: number;
  inReviewCount: number;
  doneCount: number;
}

const TaskDistributionChart = ({
  backlogCount = 0,
  todoCount = 0,
  inProgressCount = 0,
  inReviewCount = 0,
  doneCount = 0,
}: TaskDistributionChartProps) => {
  const navigate = useNavigate();
  const workspaceId = useWorkspaceId();

  const statusMap: Record<string, string> = {
    'Backlog': 'BACKLOG',
    'Todo': 'TODO',
    'In Progress': 'IN_PROGRESS',
    'In Review': 'IN_REVIEW',
    'Done': 'DONE',
  };

  const allData = [
    {
      name: 'Backlog',
      value: backlogCount,
      fill: '#94A3B8',
    },
    {
      name: 'Todo',
      value: todoCount,
      fill: '#F97316',
    },
    {
      name: 'In Progress',
      value: inProgressCount,
      fill: '#3B82F6',
    },
    {
      name: 'In Review',
      value: inReviewCount,
      fill: '#8B5CF6',
    },
    {
      name: 'Done',
      value: doneCount,
      fill: '#10B981',
    },
  ];

  const chartData = allData.filter(item => item.value > 0);
  const totalTasks = allData.reduce((sum, item) => sum + item.value, 0);

  const handleSliceClick = (statusName: string) => {
    const status = statusMap[statusName];
    navigate(`/workspace/${workspaceId}/tasks?status=${status}`);
  };

  const handleStatBoxClick = (statusName: string) => {
    const status = statusMap[statusName];
    navigate(`/workspace/${workspaceId}/tasks?status=${status}`);
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={15}
        fontWeight={700}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const renderCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0];
      return (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3 pointer-events-none">
          <p className="text-sm font-semibold text-gray-900">{name}</p>
          <p className="text-sm text-gray-600">{value} tasks</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Task Distribution</h3>
          <p className="text-sm text-gray-500 mt-1">Project task breakdown</p>
        </div>
      </div>

      <div className="relative w-full" style={{ height: '400px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={100}
              outerRadius={180}
              paddingAngle={1}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
              animationDuration={800}
              animationEasing="ease-out"
              onClick={(state: any) => handleSliceClick(state.name)}
              style={{ cursor: 'pointer' }}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip content={renderCustomTooltip} cursor={false} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Stats - Absolutely positioned */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">{totalTasks}</div>
            <div className="text-xs text-gray-500 mt-1">Total Tasks</div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2">
        <div className="flex flex-wrap justify-center gap-8">
          {allData.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-4 h-4"
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-sm font-semibold text-gray-700">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-2 mt-6">
        {allData.map((item) => (
          <div
            key={item.name}
            onClick={() => handleStatBoxClick(item.name)}
            className="text-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="text-lg font-bold text-gray-900">{item.value}</div>
            <div className="text-xs text-gray-600 mt-1">{item.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskDistributionChart;