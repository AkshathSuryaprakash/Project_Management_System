import mongoose from "mongoose";
import { Roles } from "../enums/role.enum";
import MemberModel from "../models/member.model";
import RoleModel from "../models/roles-permission.model";
import UserModel from "../models/user.model";
import WorkspaceModel from "../models/workspace.model";
import { BadRequestException, ForbiddenException, NotFoundException } from "../utils/appError";
import TaskModel from "../models/task.model";
import { TaskStatusEnum } from "../enums/task.enum";
import ProjectModel from "../models/project.model";
import CommentModel from "../models/comment.model";
import AttachmentModel from "../models/attachment.model";
import MessageModel from "../models/message.model";
import ActivityLogModel from "../models/activity-log.model";
import NotificationModel from "../models/notification.model";
import { getMemberRoleInWorkspace } from "./member.service";

//********************************
// CREATE NEW WORKSPACE
//**************** **************/
export const createWorkspaceService = async (
  userId: string,
  body: {
    name: string;
    description?: string | undefined;
  }
) => {
  const { name, description } = body;

  const user = await UserModel.findById(userId);

  if (!user) {
    throw new NotFoundException("User not found");
  }

  const ownerRole = await RoleModel.findOne({ name: Roles.OWNER });

  if (!ownerRole) {
    throw new NotFoundException("Owner role not found");
  }

  const workspace = new WorkspaceModel({
    name: name,
    description: description,
    owner: user._id,
  });

  await workspace.save();

  const member = new MemberModel({
    userId: user._id,
    workspaceId: workspace._id,
    role: ownerRole._id,
    joinedAt: new Date(),
  });

  await member.save();

  user.currentWorkspace = workspace._id as mongoose.Types.ObjectId;
  await user.save();

  return {
    workspace,
  };
};

//********************************
// GET WORKSPACES USER IS A MEMBER
//**************** **************/
export const getAllWorkspacesUserIsMemberService = async (userId: string) => {
  const memberships = await MemberModel.find({ userId })
    .populate("workspaceId")
    .select("-password")
    .exec();

  // Extract workspace details from memberships
  const workspaces = memberships.map((membership) => membership.workspaceId);

  return { workspaces };
};

export const getWorkspaceByIdService = async (workspaceId: string) => {
  const workspace = await WorkspaceModel.findById(workspaceId);

  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  const members = await MemberModel.find({
    workspaceId,
  }).populate("role");

  const workspaceWithMembers = {
    ...workspace.toObject(),
    members,
  };

  return {
    workspace: workspaceWithMembers,
  };
};

//********************************
// GET ALL MEMEBERS IN WORKSPACE
//**************** **************/

export const getWorkspaceMembersService = async (workspaceId: string) => {
  // Fetch all members of the workspace

  const members = await MemberModel.find({
    workspaceId,
  })
    .populate("userId", "name email profilePicture -password")
    .populate("role", "name");

  const roles = await RoleModel.find({}, { name: 1, _id: 1 })
    .select("-permission")
    .lean();

  return { members, roles };
};

export const getWorkspaceAnalyticsService = async (workspaceId: string) => {
  const currentDate = new Date();

  const totalTasks = await TaskModel.countDocuments({
    workspace: workspaceId,
  });

  const overdueTasks = await TaskModel.countDocuments({
    workspace: workspaceId,
    dueDate: { $lt: currentDate },
    status: { $ne: TaskStatusEnum.DONE },
  });

  const completedTasks = await TaskModel.countDocuments({
    workspace: workspaceId,
    status: TaskStatusEnum.DONE,
  });

  const analytics = {
    totalTasks,
    overdueTasks,
    completedTasks,
  };

  return { analytics };
};

export const changeMemberRoleService = async (
  workspaceId: string,
  memberId: string,
  roleId: string
) => {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  const role = await RoleModel.findById(roleId);
  if (!role) {
    throw new NotFoundException("Role not found");
  }

  const member = await MemberModel.findOne({
    userId: memberId,
    workspaceId: workspaceId,
  });

  if (!member) {
    throw new Error("Member not found in the workspace");
  }

  member.role = role;
  await member.save();

  return {
    member,
  };
};

//********************************
// UPDATE WORKSPACE
//**************** **************/
export const updateWorkspaceByIdService = async (
  workspaceId: string,
  name: string,
  description?: string
) => {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  // Update the workspace details
  workspace.name = name || workspace.name;
  workspace.description = description || workspace.description;
  await workspace.save();

  return {
    workspace,
  };
};

export const resetInviteCodeService = async (workspaceId: string) => {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }
  workspace.resetInviteCode();
  await workspace.save();
  return { inviteCode: workspace.inviteCode };
};

export const deleteWorkspaceService = async (
  workspaceId: string,
  userId: string
) => {
  const workspace = await WorkspaceModel.findById(workspaceId);
  if (!workspace) {
    throw new NotFoundException("Workspace not found");
  }

  // Check if the user owns the workspace
  if (!workspace.owner.equals(new mongoose.Types.ObjectId(userId))) {
    throw new ForbiddenException(
      "You are not authorized to delete this workspace. Owner only."
    );
  }

  const user = await UserModel.findById(userId);

  await ProjectModel.deleteMany({ workspace: workspace._id });
  await TaskModel.deleteMany({ workspace: workspace._id });
  await CommentModel.deleteMany({ workspaceId: workspace._id });
  await AttachmentModel.deleteMany({ workspaceId: workspace._id });
  await MessageModel.deleteMany({ workspaceId: workspace._id });
  await ActivityLogModel.deleteMany({ workspaceId: workspace._id });
  await NotificationModel.deleteMany({ workspaceId: workspace._id });
  await MemberModel.deleteMany({ workspaceId: workspace._id });

  if (user && user?.currentWorkspace?.equals(workspaceId)) {
    const memberWorkspace = await MemberModel.findOne({ userId });
    user.currentWorkspace = memberWorkspace ? memberWorkspace.workspaceId : null;
    await user.save();
  }

  await workspace.deleteOne();

  return {
    currentWorkspace: user ? user.currentWorkspace : null,
  };
};

//*************************************************
// GET WORKSPACE MEMBERS WORKLOAD (ADMIN ONLY)
//************************************************/
export const getWorkspaceMembersWorkloadService = async (
  workspaceId: string,
  userId: string
) => {
  // 1. Strict RBAC verification: Only OWNER or ADMIN can view member workload analytics
  const { role } = await getMemberRoleInWorkspace(userId, workspaceId);
  if (role !== Roles.OWNER && role !== Roles.ADMIN) {
    throw new ForbiddenException(
      "Only workspace administrators can view member workload and task performance analytics"
    );
  }

  // 2. Fetch all members in this workspace
  const members = await MemberModel.find({ workspaceId })
    .populate("userId", "name email profilePicture")
    .populate("role", "name")
    .lean();

  // 3. Fetch all tasks in this workspace with project details
  const tasks = await TaskModel.find({ workspace: workspaceId })
    .populate("project", "name emoji")
    .sort({ updatedAt: -1 })
    .lean();

  const now = new Date();
  const OVERLOAD_THRESHOLD = 5; // MCA standard threshold (>= 5 active pending tasks)

  // 4. Map workload per member
  const memberWorkloadList = members
    .filter((m: any) => m && m.userId)
    .map((m: any) => {
      const u = m.userId;
      const uId = u._id.toString();

      // Find all tasks assigned to this user
      const memberTasks = tasks.filter(
        (t: any) => t.assignedTo && t.assignedTo.toString() === uId
      );

      // Completed tasks
      const completedTasks = memberTasks.filter(
        (t: any) =>
          t.status === TaskStatusEnum.DONE ||
          t.status === "COMPLETED" ||
          t.status === "FINISHED"
      );

      // Pending / Active tasks (TODO, IN_PROGRESS, IN_REVIEW, BACKLOG)
      const pendingTasks = memberTasks.filter(
        (t: any) =>
          t.status !== TaskStatusEnum.DONE &&
          t.status !== "COMPLETED" &&
          t.status !== "FINISHED"
      );

      // Overdue tasks: dueDate < now and not completed
      const overdueTasks = memberTasks.filter(
        (t: any) =>
          t.dueDate &&
          new Date(t.dueDate) < now &&
          t.status !== TaskStatusEnum.DONE &&
          t.status !== "COMPLETED" &&
          t.status !== "FINISHED"
      );

      const totalTasks = memberTasks.length;
      const completedCount = completedTasks.length;
      const pendingCount = pendingTasks.length;
      const overdueCount = overdueTasks.length;

      // Success ratio (completion percentage)
      const successRatio =
        totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

      // Overloaded identification
      const isOverloaded = pendingCount >= OVERLOAD_THRESHOLD;
      const workloadLevel =
        pendingCount >= OVERLOAD_THRESHOLD
          ? "OVERLOADED"
          : pendingCount >= 3
          ? "HIGH"
          : pendingCount >= 1
          ? "MODERATE"
          : "LIGHT";

      return {
        memberId: m._id,
        user: {
          _id: u._id,
          name: u.name,
          email: u.email,
          profilePicture: u.profilePicture || null,
        },
        role: m.role?.name || "MEMBER",
        joinedAt: m.joinedAt || m.createdAt,
        totalTasks,
        completedCount,
        pendingCount,
        overdueCount,
        successRatio,
        isOverloaded,
        workloadLevel,
        completedTasks: completedTasks.map((t: any) => ({
          _id: t._id,
          taskCode: t.taskCode,
          title: t.title,
          priority: t.priority,
          project: {
            _id: t.project?._id,
            name: t.project?.name || "Project",
            emoji: t.project?.emoji || "📊",
          },
          dueDate: t.dueDate,
          completedAt: t.updatedAt,
        })),
        pendingTasks: pendingTasks.map((t: any) => ({
          _id: t._id,
          taskCode: t.taskCode,
          title: t.title,
          status: t.status,
          priority: t.priority,
          project: {
            _id: t.project?._id,
            name: t.project?.name || "Project",
            emoji: t.project?.emoji || "📊",
          },
          dueDate: t.dueDate,
          isOverdue: !!(t.dueDate && new Date(t.dueDate) < now),
        })),
      };
    });

  // Sort overloaded members first, then by pending task count descending
  memberWorkloadList.sort((a, b) => {
    if (a.isOverloaded && !b.isOverloaded) return -1;
    if (!a.isOverloaded && b.isOverloaded) return 1;
    return b.pendingCount - a.pendingCount;
  });

  const totalAssignedTasks = memberWorkloadList.reduce(
    (acc, m) => acc + m.totalTasks,
    0
  );
  const totalCompleted = memberWorkloadList.reduce(
    (acc, m) => acc + m.completedCount,
    0
  );
  const totalPending = memberWorkloadList.reduce(
    (acc, m) => acc + m.pendingCount,
    0
  );
  const totalOverdue = memberWorkloadList.reduce(
    (acc, m) => acc + m.overdueCount,
    0
  );
  const overloadedCount = memberWorkloadList.filter((m) => m.isOverloaded).length;
  const averageSuccessRatio =
    totalAssignedTasks > 0
      ? Math.round((totalCompleted / totalAssignedTasks) * 100)
      : 0;

  return {
    summary: {
      totalMembers: memberWorkloadList.length,
      overloadedMembersCount: overloadedCount,
      totalAssignedTasks,
      totalCompleted,
      totalPending,
      totalOverdue,
      averageSuccessRatio,
      overloadThreshold: OVERLOAD_THRESHOLD,
    },
    members: memberWorkloadList,
  };
};
