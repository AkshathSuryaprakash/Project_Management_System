import TaskModel from "../models/task.model";
import ProjectModel from "../models/project.model";
import { TaskStatusEnum } from "../enums/task.enum";

export const getWorkspaceReportsService = async (workspaceId: string) => {
  const currentDate = new Date();

  const projects = await ProjectModel.find({ workspace: workspaceId });
  const tasks = await TaskModel.find({ workspace: workspaceId })
    .populate("project", "name emoji")
    .populate("assignedTo", "name email");

  // Project Summary
  const projectSummaries = projects.map((p) => {
    const pTasks = tasks.filter(
      (t) => (t.project as any)?._id?.toString() === (p._id as any).toString()
    );
    const total = pTasks.length;
    const done = pTasks.filter((t) => t.status === TaskStatusEnum.DONE).length;
    const pending = total - done;
    const overdue = pTasks.filter((t) => {
      if (t.status === TaskStatusEnum.DONE) return false;
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < currentDate;
    }).length;
    const completionPercentage = total > 0 ? Math.round((done / total) * 100) : 0;

    return {
      _id: p._id,
      name: p.name,
      emoji: p.emoji,
      total,
      done,
      pending,
      overdue,
      completionPercentage,
    };
  });

  // Task Breakdown
  const taskBreakdown = tasks.map((t) => ({
    _id: t._id,
    taskCode: t.taskCode,
    title: t.title,
    project: (t.project as any)?.name || "Unknown",
    status: t.status,
    priority: t.priority,
    assignedTo: (t.assignedTo as any)?.name || "Unassigned",
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
  }));

  return {
    projectSummaries,
    taskBreakdown,
  };
};

export const exportTasksCsvService = async (workspaceId: string) => {
  const tasks = await TaskModel.find({ workspace: workspaceId })
    .populate("project", "name")
    .populate("assignedTo", "name email");

  const headers = [
    "Task Code",
    "Title",
    "Project",
    "Status",
    "Priority",
    "Assigned To",
    "Due Date",
  ];

  const rows = tasks.map((t) => {
    const code = `"${(t.taskCode || "").replace(/"/g, '""')}"`;
    const title = `"${(t.title || "").replace(/"/g, '""')}"`;
    const project = `"${((t.project as any)?.name || "").replace(/"/g, '""')}"`;
    const status = `"${t.status}"`;
    const priority = `"${t.priority}"`;
    const assignee = `"${((t.assignedTo as any)?.name || "Unassigned").replace(/"/g, '""')}"`;
    const due = t.dueDate ? `"${new Date(t.dueDate).toISOString().split("T")[0]}"` : '""';

    return [code, title, project, status, priority, assignee, due].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
};
