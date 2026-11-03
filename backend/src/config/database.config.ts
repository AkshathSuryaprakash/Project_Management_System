import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { config } from "./app.config";
import RoleModel from "../models/roles-permission.model";
import { RolePermissions } from "../utils/role-permission";
import UserModel from "../models/user.model";
import WorkspaceModel from "../models/workspace.model";
import MemberModel from "../models/member.model";
import AccountModel from "../models/account.model";
import { ProviderEnum } from "../enums/account-provider.enum";
import { Roles } from "../enums/role.enum";
import ProjectModel from "../models/project.model";
import TaskModel from "../models/task.model";
import { TaskStatusEnum, TaskPriorityEnum } from "../enums/task.enum";

let mongoServer: MongoMemoryReplSet | null = null;

const dummyMembers = [
  { name: "Akshath S", email: "akshathdeepa1978@gmail.com", role: Roles.OWNER },
  { name: "Rahul", email: "rahul@example.com", role: Roles.MEMBER },
  { name: "Akshath S", email: "akshath1025@gmail.com", role: Roles.MEMBER },
  { name: "Ashok Kumar", email: "ashok@example.com", role: Roles.MEMBER },
  { name: "Ashish Patel", email: "ashish@example.com", role: Roles.MEMBER },
  { name: "Guru Prasad", email: "guru@example.com", role: Roles.MEMBER },
  { name: "Kushal Gowda", email: "kushal@example.com", role: Roles.MEMBER },
  { name: "Chiranth D Jain", email: "chiranth@example.com", role: Roles.MEMBER },
  { name: "Aarav Sharma", email: "aarav@example.com", role: Roles.MEMBER },
  { name: "Priya Nair", email: "priya@example.com", role: Roles.MEMBER },
  { name: "Ananya Iyer", email: "ananya@example.com", role: Roles.MEMBER },
];

export const seedRolesIfEmpty = async () => {
  try {
    const count = await RoleModel.countDocuments();
    if (count === 0) {
      console.log("No roles found in database. Seeding roles...");
      for (const roleName in RolePermissions) {
        const role = roleName as keyof typeof RolePermissions;
        const permissions = RolePermissions[role];
        const newRole = new RoleModel({
          name: role,
          permissions: permissions,
        });
        await newRole.save();
        console.log(`Role ${role} added with permissions.`);
      }
      console.log("Roles seeded successfully.");
    }
  } catch (error) {
    console.error("Error checking or seeding roles:", error);
  }
};

export const seedDemonstrationData = async () => {
  try {
    console.log("Checking demonstration data...");
    await seedRolesIfEmpty();

    const ownerRole = await RoleModel.findOne({ name: Roles.OWNER });
    const memberRole = await RoleModel.findOne({ name: Roles.MEMBER });
    if (!ownerRole || !memberRole) return;

    // 1. Ensure users and accounts exist
    const userMap = new Map<string, any>();
    for (const m of dummyMembers) {
      let user = await UserModel.findOne({ email: m.email });
      if (!user) {
        user = await UserModel.create({
          name: m.name,
          email: m.email,
          password: "password123",
        });
        console.log(`Seeded user: ${m.name} (${m.email})`);
      }
      userMap.set(m.email, user);

      let account = await AccountModel.findOne({
        provider: ProviderEnum.EMAIL,
        providerId: m.email,
      });
      if (!account) {
        await AccountModel.create({
          userId: user._id,
          provider: ProviderEnum.EMAIL,
          providerId: m.email,
        });
      }
    }

    const primaryOwner = userMap.get("akshathdeepa1978@gmail.com");

    // 2. Ensure demonstration workspace exists
    let workspace = await WorkspaceModel.findOne({ name: "Akshath Workspace" });
    if (!workspace) {
      workspace = await WorkspaceModel.create({
        name: "Akshath Workspace",
        description: "Default workspace for team collaboration",
        owner: primaryOwner._id,
        inviteCode: "b4ae958d", // 8-char code visible in report screenshot Figure 9.13
      });
      console.log("Seeded demonstration workspace: Akshath Workspace");
    }

    // Set current workspace for all seeded users so login redirects correctly
    for (const m of dummyMembers) {
      const u = userMap.get(m.email);
      const wsIdStr = (workspace._id as any)?.toString();
      if (u && (!u.currentWorkspace || u.currentWorkspace.toString() !== wsIdStr)) {
        u.currentWorkspace = workspace._id as any;
        await u.save();
      }
    }

    // 3. Ensure memberships exist
    for (const m of dummyMembers) {
      const u = userMap.get(m.email);
      let membership = await MemberModel.findOne({
        userId: u._id,
        workspaceId: workspace._id,
      });

      const roleId = m.role === Roles.OWNER ? ownerRole._id : memberRole._id;
      if (!membership) {
        await MemberModel.create({
          userId: u._id,
          workspaceId: workspace._id,
          role: roleId,
          joinedAt: new Date("2026-10-11T00:00:00.000Z"),
        });
      }
    }

    // 4. Ensure four demonstration projects exist (Appendix E)
    const demoProjects = [
      {
        name: "NeuroScan AI",
        emoji: "🧠",
        description: "AI-powered brain MRI analysis and tumor segmentation.",
      },
      {
        name: "SmartVision AI",
        emoji: "👁️",
        description: "Computer vision and object detection.",
      },
      {
        name: "InsightAI",
        emoji: "📊",
        description: "AI-powered analytics and predictive intelligence.",
      },
      {
        name: "Website Redesign",
        emoji: "🎨",
        description: "Website UI and frontend redesign.",
      },
    ];

    const projectMap = new Map<string, any>();
    for (const p of demoProjects) {
      let project = await ProjectModel.findOne({
        name: p.name,
        workspace: workspace._id,
      });
      if (!project) {
        project = await ProjectModel.create({
          name: p.name,
          emoji: p.emoji,
          description: p.description,
          workspace: workspace._id,
          createdBy: primaryOwner._id,
        });
        console.log(`Seeded project: ${p.name}`);
      }
      projectMap.set(p.name, project);
    }

    // 5. Ensure 11 demonstration tasks exist (Appendix E, Table E.1)
    const demoTasks = [
      {
        taskCode: "task-042",
        title: "Build AI Analytics Dashboard",
        projectName: "InsightAI",
        assigneeEmail: "ananya@example.com",
        dueDate: new Date("2026-10-16T12:00:00.000Z"),
        status: TaskStatusEnum.TODO,
        priority: TaskPriorityEnum.MEDIUM,
      },
      {
        taskCode: "task-eaa",
        title: "Develop Prediction Model",
        projectName: "InsightAI",
        assigneeEmail: "priya@example.com",
        dueDate: new Date("2026-10-11T12:00:00.000Z"),
        status: TaskStatusEnum.IN_PROGRESS,
        priority: TaskPriorityEnum.HIGH,
      },
      {
        taskCode: "task-163",
        title: "Design Data Preprocessing Pipeline",
        projectName: "InsightAI",
        assigneeEmail: "aarav@example.com",
        dueDate: new Date("2026-10-03T12:00:00.000Z"),
        status: TaskStatusEnum.DONE,
        priority: TaskPriorityEnum.MEDIUM,
      },
      {
        taskCode: "task-93b",
        title: "Train Object Detection Model",
        projectName: "SmartVision AI",
        assigneeEmail: "chiranth@example.com",
        dueDate: new Date("2026-10-14T12:00:00.000Z"),
        status: TaskStatusEnum.TODO,
        priority: TaskPriorityEnum.HIGH,
      },
      {
        taskCode: "task-75c",
        title: "Implement Image Preprocessing Pipeline",
        projectName: "SmartVision AI",
        assigneeEmail: "kushal@example.com",
        dueDate: new Date("2026-10-09T12:00:00.000Z"),
        status: TaskStatusEnum.IN_PROGRESS,
        priority: TaskPriorityEnum.MEDIUM,
      },
      {
        taskCode: "task-81b",
        title: "Collect Object Detection Dataset",
        projectName: "SmartVision AI",
        assigneeEmail: "guru@example.com",
        dueDate: new Date("2026-10-04T12:00:00.000Z"),
        status: TaskStatusEnum.DONE,
        priority: TaskPriorityEnum.HIGH,
      },
      {
        taskCode: "task-613",
        title: "Build MRI Prediction API",
        projectName: "NeuroScan AI",
        assigneeEmail: "ashish@example.com",
        dueDate: new Date("2026-10-12T12:00:00.000Z"),
        status: TaskStatusEnum.TODO,
        priority: TaskPriorityEnum.MEDIUM,
      },
      {
        taskCode: "task-f8a",
        title: "Develop Tumor Segmentation Model",
        projectName: "NeuroScan AI",
        assigneeEmail: "ashok@example.com",
        dueDate: new Date("2026-10-08T12:00:00.000Z"),
        status: TaskStatusEnum.TODO,
        priority: TaskPriorityEnum.HIGH,
      },
      {
        taskCode: "task-401",
        title: "Implement MRI Image Preprocessing",
        projectName: "NeuroScan AI",
        assigneeEmail: "akshathdeepa1978@gmail.com",
        dueDate: new Date("2026-10-05T12:00:00.000Z"),
        status: TaskStatusEnum.IN_PROGRESS,
        priority: TaskPriorityEnum.HIGH,
      },
      {
        taskCode: "task-b0d",
        title: "Collect and Prepare MRI Dataset",
        projectName: "NeuroScan AI",
        assigneeEmail: "akshathdeepa1978@gmail.com",
        dueDate: new Date("2026-10-02T12:00:00.000Z"),
        status: TaskStatusEnum.DONE,
        priority: TaskPriorityEnum.HIGH,
      },
      {
        taskCode: "task-65a",
        title: "Design Homepage Mockups",
        projectName: "Website Redesign",
        assigneeEmail: "akshathdeepa1978@gmail.com",
        dueDate: new Date("2026-10-18T12:00:00.000Z"),
        status: TaskStatusEnum.TODO,
        priority: TaskPriorityEnum.MEDIUM,
      },
    ];

    for (const dt of demoTasks) {
      const proj = projectMap.get(dt.projectName);
      const assignee = userMap.get(dt.assigneeEmail);

      let task = await TaskModel.findOne({
        taskCode: dt.taskCode,
        workspace: workspace._id,
      });

      if (!task) {
        await TaskModel.create({
          taskCode: dt.taskCode,
          title: dt.title,
          project: proj._id,
          workspace: workspace._id,
          assignedTo: assignee?._id || null,
          createdBy: primaryOwner._id,
          dueDate: dt.dueDate,
          status: dt.status,
          priority: dt.priority,
        });
        console.log(`Seeded task: [${dt.taskCode}] ${dt.title}`);
      }
    }

    console.log("Demonstration data check/seeding complete.");
  } catch (error) {
    console.error("Error during demonstration seeding:", error);
  }
};

const connectDatabase = async () => {
  try {
    console.log("Attempting to connect to configured MONGO_URI...");
    await mongoose.connect(config.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("Connected to MongoDB successfully (persistent)");
    await seedDemonstrationData();
  } catch (error) {
    console.warn("Could not connect to configured MONGO_URI:", (error as Error).message || error);
    console.log("Starting in-memory MongoDB replica set fallback...");
    try {
      mongoServer = await MongoMemoryReplSet.create({
        replSet: {
          count: 1,
          storageEngine: "wiredTiger",
        },
        binary: {
          version: "4.4.29",
        },
      });
      let mongoUri = mongoServer.getUri();
      if (!mongoUri.includes("retryWrites=")) {
        mongoUri += (mongoUri.includes("?") ? "&" : "?") + "retryWrites=false";
      }
      console.log(`In-memory MongoDB Replica Set active at ${mongoUri}`);
      await mongoose.connect(mongoUri);
      console.log("Connected to in-memory fallback database");
      await seedDemonstrationData();
    } catch (fallbackError) {
      console.error("Failed to start or connect to in-memory MongoDB fallback:", fallbackError);
      process.exit(1);
    }
  }
};

export default connectDatabase;
