import mongoose from "mongoose";
import dotenv from "dotenv";
import WorkspaceModel from "./models/workspace.model";
import MemberModel from "./models/member.model";
import UserModel from "./models/user.model";

dotenv.config();

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("Connected to DB");

    const users = await UserModel.find();
    console.log(`Total users in DB: ${users.length}`);
    
    // Find who the current active user is (the one who might be the owner)
    // We can assume the user the client is logged in as is probably the owner of the workspaces or has the most recent activity
    const realUsers = users.filter(u => !u.email.includes("example.com"));
    console.log(`Real users: ${realUsers.map(u => u.name + " (" + u.email + ")").join(", ")}`);

    const workspaces = await WorkspaceModel.find();
    console.log(`Total workspaces in DB: ${workspaces.length}`);

    for (let i = 0; i < workspaces.length; i++) {
      const ws = workspaces[i];
      const members = await MemberModel.find({ workspaceId: ws._id }).populate("userId", "name email");
      console.log(`\nWorkspace: ${ws.name} (ID: ${ws._id})`);
      console.log(`Owner ID: ${ws.owner}`);
      console.log(`Members Count: ${members.length}`);
      
      members.forEach((m: any) => {
        console.log(` - ${m.userId?.name} (${m.userId?.email})`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

check();
