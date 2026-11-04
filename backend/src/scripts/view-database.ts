import "dotenv/config";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import UserModel from "../models/user.model";
import WorkspaceModel from "../models/workspace.model";
import TaskModel from "../models/task.model";
import MessageModel from "../models/message.model";
import MemberModel from "../models/member.model";
import ProjectModel from "../models/project.model";
import RoleModel from "../models/roles-permission.model";

async function viewDatabase() {
  const uriFile = path.join(__dirname, "../../.active-db-uri");
  let uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/project_management_saas";

  if (fs.existsSync(uriFile)) {
    const saved = fs.readFileSync(uriFile, "utf8").trim();
    if (saved) uri = saved;
  }

  console.log("=================================================");
  console.log("             PROJECT DATABASE VIEWER             ");
  console.log("=================================================");
  console.log(`Connecting to: ${uri}\n`);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
  } catch (err: any) {
    console.error("Could not connect to database at", uri);
    console.error("Reason:", err.message);
    process.exit(1);
  }

  const [usersCount, workspacesCount, tasksCount, messagesCount, membersCount, projectsCount, rolesCount] =
    await Promise.all([
      UserModel.countDocuments(),
      WorkspaceModel.countDocuments(),
      TaskModel.countDocuments(),
      MessageModel.countDocuments(),
      MemberModel.countDocuments(),
      ProjectModel.countDocuments(),
      RoleModel.countDocuments(),
    ]);

  console.log("📊 COLLECTIONS OVERVIEW");
  console.log("-------------------------------------------------");
  console.table([
    { Collection: "users", Documents: usersCount },
    { Collection: "workspaces", Documents: workspacesCount },
    { Collection: "projects", Documents: projectsCount },
    { Collection: "tasks", Documents: tasksCount },
    { Collection: "messages", Documents: messagesCount },
    { Collection: "members", Documents: membersCount },
    { Collection: "roles", Documents: rolesCount },
  ]);

  // 1. Users
  console.log("\n👤 USERS (SAMPLE):");
  const users = await UserModel.find().limit(6).select("name email createdAt");
  console.table(
    users.map((u: any) => ({
      ID: u._id.toString().slice(-6),
      Name: u.name,
      Email: u.email,
    }))
  );

  // 2. Workspaces
  console.log("\n🏢 WORKSPACES:");
  const workspaces = await WorkspaceModel.find().populate("owner", "name email");
  console.table(
    workspaces.map((w: any) => ({
      ID: w._id.toString().slice(-6),
      Name: w.name,
      Owner: w.owner?.name || "Unknown",
    }))
  );

  // 3. Projects
  console.log("\n📁 PROJECTS:");
  const projects = await ProjectModel.find().select("name description");
  console.table(
    projects.map((p: any) => ({
      ID: p._id.toString().slice(-6),
      Name: p.name,
      Description: p.description?.slice(0, 30) || "-",
    }))
  );

  // 4. Tasks Summary
  console.log("\n📋 RECENT TASKS:");
  const tasks = await TaskModel.find()
    .limit(8)
    .populate("assignedTo", "name")
    .select("taskCode title status priority assignedTo");
  console.table(
    tasks.map((t: any) => ({
      Code: t.taskCode,
      Title: t.title.slice(0, 28),
      Status: t.status,
      Priority: t.priority,
      Assignee: t.assignedTo?.name || "Unassigned",
    }))
  );

  // 5. Messages Summary
  console.log("\n💬 RECENT MESSAGES:");
  const messages = await MessageModel.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("senderId", "name")
    .populate("recipientId", "name");
  console.table(
    messages.map((m: any) => ({
      Conversation: m.conversationId.slice(0, 25),
      Sender: m.senderId?.name || "Unknown",
      Recipient: m.recipientId?.name || "Channel",
      Content: m.content.slice(0, 30),
      Time: new Date(m.createdAt).toLocaleTimeString(),
    }))
  );

  console.log("\n=================================================");
  console.log("To view graphically, paste the connection URI into MongoDB Compass:");
  console.log(uri);
  console.log("=================================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

viewDatabase().catch((err) => {
  console.error(err);
  process.exit(1);
});
