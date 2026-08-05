import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

// Increase download timeout for slow network environments to 5 minutes
process.env.MONGOMS_DOWNLOAD_TIMEOUT = "300000";

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
  { name: "Akshath S", email: "akshath1025@gmail.com" },
  { name: "Akshath S", email: "akshathdeepa1978@gmail.com" },
  { name: "Ashok Kumar", email: "ashok@example.com" },
  { name: "Ashish Patel", email: "ashish@example.com" },
  { name: "Guru Prasad", email: "guru@example.com" },
  { name: "Kushal Gowda", email: "kushal@example.com" },
  { name: "Chiranth D Jain", email: "chiranth@example.com" },
  { name: "Aarav Sharma", email: "aarav@example.com" },
  { name: "Priya Nair", email: "priya@example.com" },
  { name: "Ananya Iyer", email: "ananya@example.com" }
];

const autoSeedMembers = async () => {
  try {
    const memberRole = await RoleModel.findOne({ name: Roles.MEMBER });
    const ownerRole = await RoleModel.findOne({ name: Roles.OWNER });
    if (!memberRole || !ownerRole) return;

    // Get or create akshathdeepa1978@gmail.com
    let targetOwner = await UserModel.findOne({ email: "akshathdeepa1978@gmail.com" });
    if (!targetOwner) {
      targetOwner = await UserModel.create({
        name: "Akshath S",
        email: "akshathdeepa1978@gmail.com",
        password: "password123",
      });
      console.log("Auto-seeded target owner: Akshath S (akshathdeepa1978@gmail.com)");
    }
    
    // Ensure account exists for target owner
    let targetOwnerAccount = await AccountModel.findOne({ provider: ProviderEnum.EMAIL, providerId: "akshathdeepa1978@gmail.com" });
    if (!targetOwnerAccount) {
      await AccountModel.create({
        userId: targetOwner._id,
        provider: ProviderEnum.EMAIL,
        providerId: "akshathdeepa1978@gmail.com",
      });
      console.log("Auto-seeded account for target owner");
    }

    let workspaces = await WorkspaceModel.find();
    if (workspaces.length === 0) {
      const defaultWorkspace = await WorkspaceModel.create({
        name: "Akshath Workspace",
        description: "Default workspace for team collaboration",
        owner: targetOwner._id,
      });
      console.log("Auto-seeded default workspace:", defaultWorkspace.name);
      
      // Seed a default project
      const defaultProject = await ProjectModel.create({
        name: "Website Redesign",
        description: "Modernizing the corporate landing page",
        emoji: "🎨",
        workspace: defaultWorkspace._id,
        createdBy: targetOwner._id,
      });
      console.log("Auto-seeded default project:", defaultProject.name);

      // Seed a default task assigned to target owner
      const defaultTask = await TaskModel.create({
        title: "Design Homepage Mockups",
        description: "Create high-fidelity landing page mockups",
        project: defaultProject._id,
        workspace: defaultWorkspace._id,
        status: TaskStatusEnum.TODO,
        priority: TaskPriorityEnum.MEDIUM,
        assignedTo: targetOwner._id,
        createdBy: targetOwner._id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      });
      console.log("Auto-seeded default task:", defaultTask.title);

      workspaces = [defaultWorkspace];
    }

    for (const workspace of workspaces) {
      // 1. Ensure akshathdeepa1978@gmail.com is set as the workspace owner
      if (!workspace.owner.equals(targetOwner._id)) {
        workspace.owner = targetOwner._id;
        await workspace.save();
        console.log(`Updated workspace ${workspace.name} owner to akshathdeepa1978@gmail.com`);
      }

      // 2. Ensure akshathdeepa1978@gmail.com has an OWNER membership record
      let ownerMembership = await MemberModel.findOne({
        userId: targetOwner._id,
        workspaceId: workspace._id,
      });
      if (!ownerMembership) {
        await MemberModel.create({
          userId: targetOwner._id,
          workspaceId: workspace._id,
          role: ownerRole._id,
        });
        console.log(`Created OWNER membership for akshathdeepa1978@gmail.com in workspace ${workspace.name}`);
      } else if (!ownerMembership.role.equals(ownerRole._id)) {
        ownerMembership.role = ownerRole._id;
        await ownerMembership.save();
        console.log(`Updated membership for akshathdeepa1978@gmail.com to OWNER in workspace ${workspace.name}`);
      }

      // 3. Auto seed all other members (including akshath1025@gmail.com) as MEMBER
      for (const memberInfo of dummyMembers) {
        const { name, email } = memberInfo;
        
        // Skip target owner as we already handled them
        if (email === "akshathdeepa1978@gmail.com") {
          continue;
        }

        let user = await UserModel.findOne({ email });
        if (!user) {
          user = await UserModel.create({
            name,
            email,
            password: "password123",
          });
          console.log(`Auto-seeded user: ${name}`);
        }

        // Ensure the Account record exists so they can log in
        let account = await AccountModel.findOne({ provider: ProviderEnum.EMAIL, providerId: email });
        if (!account) {
          await AccountModel.create({
            userId: user._id,
            provider: ProviderEnum.EMAIL,
            providerId: email,
          });
          console.log(`Auto-seeded account for: ${email}`);
        }

        const existingMember = await MemberModel.findOne({
          userId: user._id,
          workspaceId: workspace._id,
        });

        if (!existingMember) {
          await MemberModel.create({
            userId: user._id,
            workspaceId: workspace._id,
            role: memberRole._id,
          });
          console.log(`Auto-seeded membership: Added ${name} to workspace ${workspace.name}`);
        } else if (existingMember.role.equals(ownerRole._id)) {
          // If they were owner before, demote them to MEMBER since targetOwner is now owner
          existingMember.role = memberRole._id;
          await existingMember.save();
          console.log(`Demoted ${name} to MEMBER in workspace ${workspace.name}`);
        }
      }
    }
  } catch (error) {
    console.error("Error in auto-seed members:", error);
  }
};

const seedRolesIfEmpty = async () => {
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
      console.log("Seeding completed successfully.");
    } else {
      console.log("Roles already exist in database.");
    }
  } catch (error) {
    console.error("Error checking or seeding roles:", error);
  }
};

const connectDatabase = async () => {
  try {
    console.log("Attempting to connect to MONGO_URI...");
    await mongoose.connect(config.MONGO_URI, {
      serverSelectionTimeoutMS: 5000 // fail fast in 5 seconds
    });
    console.log("Connected to Mongo database (remote)");
    await seedRolesIfEmpty();
    // Start auto-seeder for workspaces
    setInterval(autoSeedMembers, 5000);
  } catch (error) {
    console.warn("Failed to connect to remote Mongo database:", (error as Error).message || error);
    console.log("Spinning up local MongoMemoryServer fallback...");
    try {
      console.log("DEBUG: Calling MongoMemoryReplSet.create...");
      mongoServer = await MongoMemoryReplSet.create({
        replSet: {
          count: 1,
          storageEngine: "wiredTiger",
        },
        binary: {
          version: "4.4.29",
        },
      });
      console.log("DEBUG: MongoMemoryReplSet.create completed!");
      let mongoUri = mongoServer.getUri();
      if (!mongoUri.includes("retryWrites=")) {
        mongoUri += (mongoUri.includes("?") ? "&" : "?") + "retryWrites=false";
      }
      console.log(`Local MongoDB Memory Replica Set started at ${mongoUri}`);
      console.log("DEBUG: Connecting mongoose to local replset...");
      await mongoose.connect(mongoUri);
      console.log("Connected to Mongo database (in-memory replica set fallback)");
      await seedRolesIfEmpty();
      // Start auto-seeder for workspaces
      setInterval(autoSeedMembers, 5000);
    } catch (fallbackError) {
      console.error("Critical error starting or connecting to fallback MongoDB Memory Server:", fallbackError);
      process.exit(1);
    }
  }
};

export default connectDatabase;
