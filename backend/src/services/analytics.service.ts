import TaskModel from "../models/task.model";
import ProjectModel from "../models/project.model";
import MemberModel from "../models/member.model";
import { TaskPriorityEnum, TaskStatusEnum } from "../enums/task.enum";

export const getWorkspaceAnalyticsService = async (workspaceId: string) => {
  const currentDate = new Date();
  const next7Days = new Date();
  next7Days.setDate(next7Days.getDate() + 7);

  // 1. Tasks
  const tasks = await TaskModel.find({ workspace: workspaceId });
  const totalTasks = tasks.length;

  const completedTasks = tasks.filter((t) => t.status === TaskStatusEnum.DONE).length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === TaskStatusEnum.IN_PROGRESS
  ).length;
  const inReviewTasks = tasks.filter(
    (t) => t.status === TaskStatusEnum.IN_REVIEW
  ).length;
  const todoTasks = tasks.filter((t) => t.status === TaskStatusEnum.TODO).length;
  const backlogTasks = tasks.filter((t) => t.status === TaskStatusEnum.BACKLOG).length;

  const pendingTasks = totalTasks - completedTasks;

  const overdueTasks = tasks.filter((t) => {
    if (t.status === TaskStatusEnum.DONE) return false;
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < currentDate;
  }).length;

  // Status distribution
  const taskDistribution = {
    backlogCount: backlogTasks,
    todoCount: todoTasks,
    inProgressCount: inProgressTasks,
    inReviewCount: inReviewTasks,
    doneCount: completedTasks,
    total: totalTasks,
  };

  // Priority distribution
  const highPriority = tasks.filter((t) => t.priority === TaskPriorityEnum.HIGH).length;
  const mediumPriority = tasks.filter(
    (t) => t.priority === TaskPriorityEnum.MEDIUM
  ).length;
  const lowPriority = tasks.filter((t) => t.priority === TaskPriorityEnum.LOW).length;

  const priorityDistribution = {
    highCount: highPriority,
    mediumCount: mediumPriority,
    lowCount: lowPriority,
    total: totalTasks,
  };

  // 2. Projects
  const projects = await ProjectModel.find({ workspace: workspaceId });
  const totalProjects = projects.length;

  // 3. Members
  const totalMembers = await MemberModel.countDocuments({ workspaceId });

  // Project health
  const projectHealth = projects.map((p) => {
    const projectTasks = tasks.filter(
      (t) => t.project.toString() === (p._id as any).toString()
    );
    const pTotal = projectTasks.length;
    const pDone = projectTasks.filter((t) => t.status === TaskStatusEnum.DONE).length;
    const pInProgress = projectTasks.filter(
      (t) => t.status === TaskStatusEnum.IN_PROGRESS
    ).length;
    const pOverdue = projectTasks.filter((t) => {
      if (t.status === TaskStatusEnum.DONE) return false;
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < currentDate;
    }).length;

    const pDueSoon = projectTasks.filter((t) => {
      if (t.status === TaskStatusEnum.DONE) return false;
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate);
      return d >= currentDate && d <= next7Days;
    }).length;

    const pHigh = projectTasks.filter((t) => t.priority === TaskPriorityEnum.HIGH).length;
    const pMed = projectTasks.filter((t) => t.priority === TaskPriorityEnum.MEDIUM).length;
    const pLow = projectTasks.filter((t) => t.priority === TaskPriorityEnum.LOW).length;

    // Weighted progress formula: (done + 0.4 * inProgress) / total
    const progress =
      pTotal > 0
        ? Math.round(((pDone + 0.4 * pInProgress) / pTotal) * 100)
        : 0;

    return {
      _id: p._id,
      name: p.name,
      emoji: p.emoji,
      description: p.description,
      totalTasks: pTotal,
      completedTasks: pDone,
      inProgressTasks: pInProgress,
      overdueTasks: pOverdue,
      dueSoonTasks: pDueSoon,
      highPriority: pHigh,
      mediumPriority: pMed,
      lowPriority: pLow,
      progress,
    };
  });

  return {
    analytics: {
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      overdueTasks,
      totalProjects,
      totalMembers,
      taskDistribution,
      priorityDistribution,
      projectHealth,
    },
  };
};
