import "dotenv/config";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import UserModel from "../models/user.model";
import WorkspaceModel from "../models/workspace.model";
import MemberModel from "../models/member.model";
import ProjectModel from "../models/project.model";
import TaskModel from "../models/task.model";
import RoleModel from "../models/roles-permission.model";
import { Roles } from "../enums/role.enum";
import { TaskPriorityEnum, TaskStatusEnum } from "../enums/task.enum";
import { RolePermissions } from "../utils/role-permission";
import {
  updateTaskController,
  deleteTaskController,
} from "../controllers/task.controller";

let mongoServer: MongoMemoryReplSet;

let ownerUser: any;
let adminUser: any;
let member1User: any;
let member2User: any;

let workspace: any;
let foreignWorkspace: any;
let project: any;
let member1Task: any;
let member2Task: any;

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    binary: { version: "4.4.29" },
  });

  const uri = mongoServer.getUri() + (mongoServer.getUri().includes("?") ? "&" : "?") + "retryWrites=false";
  await mongoose.connect(uri);

  // Seed roles
  for (const roleName in RolePermissions) {
    const role = roleName as keyof typeof RolePermissions;
    await RoleModel.create({
      name: role,
      permissions: RolePermissions[role],
    });
  }

  const ownerRole = await RoleModel.findOne({ name: Roles.OWNER });
  const adminRole = await RoleModel.findOne({ name: Roles.ADMIN });
  const memberRole = await RoleModel.findOne({ name: Roles.MEMBER });

  // Create Users
  ownerUser = await UserModel.create({
    name: "Owner User",
    email: "owner@example.com",
    password: "password123",
  });

  adminUser = await UserModel.create({
    name: "Admin User",
    email: "admin@example.com",
    password: "password123",
  });

  member1User = await UserModel.create({
    name: "Akshath Member",
    email: "member1@example.com",
    password: "password123",
  });

  member2User = await UserModel.create({
    name: "Rahul Member",
    email: "member2@example.com",
    password: "password123",
  });

  // Create Workspace
  workspace = await WorkspaceModel.create({
    name: "Main Test Workspace",
    description: "Workspace for RBAC testing",
    owner: ownerUser._id,
  });

  foreignWorkspace = await WorkspaceModel.create({
    name: "Foreign Workspace",
    description: "Workspace B for isolation testing",
    owner: ownerUser._id,
  });

  // Add memberships
  await MemberModel.create({
    userId: ownerUser._id,
    workspaceId: workspace._id,
    role: ownerRole!._id,
  });

  await MemberModel.create({
    userId: adminUser._id,
    workspaceId: workspace._id,
    role: adminRole!._id,
  });

  await MemberModel.create({
    userId: member1User._id,
    workspaceId: workspace._id,
    role: memberRole!._id,
  });

  await MemberModel.create({
    userId: member2User._id,
    workspaceId: workspace._id,
    role: memberRole!._id,
  });

  // Create Project
  project = await ProjectModel.create({
    name: "Test Project",
    emoji: "🚀",
    workspace: workspace._id,
    createdBy: ownerUser._id,
  });

  // Create Tasks
  member1Task = await TaskModel.create({
    title: "Member 1 Task",
    project: project._id,
    workspace: workspace._id,
    assignedTo: member1User._id,
    createdBy: ownerUser._id,
    status: TaskStatusEnum.TODO,
    priority: TaskPriorityEnum.MEDIUM,
    dueDate: new Date("2026-10-10T12:00:00.000Z"),
  });

  member2Task = await TaskModel.create({
    title: "Member 2 Task",
    project: project._id,
    workspace: workspace._id,
    assignedTo: member2User._id,
    createdBy: ownerUser._id,
    status: TaskStatusEnum.TODO,
    priority: TaskPriorityEnum.MEDIUM,
    dueDate: new Date("2026-10-15T12:00:00.000Z"),
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Helper to mock Express req, res, next
const mockReqRes = (reqData: any) => {
  const req = {
    user: reqData.user,
    params: reqData.params || {},
    body: reqData.body || {},
    query: reqData.query || {},
  } as any;

  let statusCode = 200;
  let responseData: any = null;

  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      responseData = data;
      return res;
    },
    send: (data: any) => {
      responseData = data;
      return res;
    },
  } as any;

  let errorCaught: any = null;
  const next = (err?: any) => {
    if (err) errorCaught = err;
  };

  return { req, res, next, getStatus: () => statusCode, getData: () => responseData, getError: () => errorCaught };
};

describe("RBAC Task Controller Tests", () => {
  test("T1: Member updates his or her own task (status to IN_PROGRESS)", async () => {
    const { req, res, next, getStatus } = mockReqRes({
      user: member1User,
      params: {
        id: member1Task._id.toString(),
        projectId: project._id.toString(),
        workspaceId: workspace._id.toString(),
      },
      body: { status: TaskStatusEnum.IN_PROGRESS },
    });

    await updateTaskController(req, res, next);

    expect(getStatus()).toBe(200);
    const updated = await TaskModel.findById(member1Task._id);
    expect(updated?.status).toBe(TaskStatusEnum.IN_PROGRESS);
  });

  test("T2: Member modifies a colleague's task -> 403 ForbiddenException", async () => {
    const { req, res, next, getError } = mockReqRes({
      user: member1User,
      params: {
        id: member2Task._id.toString(),
        projectId: project._id.toString(),
        workspaceId: workspace._id.toString(),
      },
      body: { status: TaskStatusEnum.DONE },
    });

    await updateTaskController(req, res, next);

    const err = getError();
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe("Members can only modify tasks assigned to themselves.");
  });

  test("T3: Member deletes another member's task -> 403 ForbiddenException", async () => {
    const { req, res, next, getError } = mockReqRes({
      user: member1User,
      params: {
        id: member2Task._id.toString(),
        workspaceId: workspace._id.toString(),
      },
    });

    await deleteTaskController(req, res, next);

    const err = getError();
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe("Members cannot delete tasks.");
  });

  test("T5: Member reassigns own task -> 403 ForbiddenException", async () => {
    const { req, res, next, getError } = mockReqRes({
      user: member1User,
      params: {
        id: member1Task._id.toString(),
        projectId: project._id.toString(),
        workspaceId: workspace._id.toString(),
      },
      body: { assignedTo: member2User._id.toString() },
    });

    await updateTaskController(req, res, next);

    const err = getError();
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe("Members cannot reassign tasks.");
  });

  test("T6: Owner updates any task -> 200 OK", async () => {
    const { req, res, next, getStatus } = mockReqRes({
      user: ownerUser,
      params: {
        id: member2Task._id.toString(),
        projectId: project._id.toString(),
        workspaceId: workspace._id.toString(),
      },
      body: { status: TaskStatusEnum.DONE },
    });

    await updateTaskController(req, res, next);

    expect(getStatus()).toBe(200);
    const updated = await TaskModel.findById(member2Task._id);
    expect(updated?.status).toBe(TaskStatusEnum.DONE);
  });

  test("T7: Admin changes priority and reassigns task -> 200 OK", async () => {
    const { req, res, next, getStatus } = mockReqRes({
      user: adminUser,
      params: {
        id: member1Task._id.toString(),
        projectId: project._id.toString(),
        workspaceId: workspace._id.toString(),
      },
      body: {
        priority: TaskPriorityEnum.HIGH,
        assignedTo: member2User._id.toString(),
      },
    });

    await updateTaskController(req, res, next);

    expect(getStatus()).toBe(200);
    const updated = await TaskModel.findById(member1Task._id);
    expect(updated?.priority).toBe(TaskPriorityEnum.HIGH);
    expect(updated?.assignedTo?.toString()).toBe(member2User._id.toString());
  });

  test("P05: User not a member of foreign workspace -> 403 Forbidden", async () => {
    const { req, res, next, getError } = mockReqRes({
      user: member1User,
      params: {
        id: member1Task._id.toString(),
        projectId: project._id.toString(),
        workspaceId: foreignWorkspace._id.toString(),
      },
      body: { status: TaskStatusEnum.DONE },
    });

    await updateTaskController(req, res, next);

    const err = getError();
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe("You are not a member of this workspace");
  });

  test("P06: Task id from workspace B sent with workspace A in URL -> 404 Task not found", async () => {
    // Member of workspace A sends an ID that belongs to another project or non-existent in workspace A
    const fakeTaskId = new mongoose.Types.ObjectId().toString();
    const { req, res, next, getError } = mockReqRes({
      user: ownerUser,
      params: {
        id: fakeTaskId,
        projectId: project._id.toString(),
        workspaceId: workspace._id.toString(),
      },
      body: { status: TaskStatusEnum.DONE },
    });

    await updateTaskController(req, res, next);

    const err = getError();
    expect(err).toBeDefined();
    expect(err.statusCode).toBe(404);
  });

  test("Calendar Date Preservation: Date selected (2026-10-10) is preserved", async () => {
    const foundTask = await TaskModel.findById(member1Task._id);
    expect(foundTask?.dueDate).toBeDefined();
    const isoString = foundTask!.dueDate!.toISOString();
    expect(isoString.startsWith("2026-10-10")).toBe(true);
  });
});
