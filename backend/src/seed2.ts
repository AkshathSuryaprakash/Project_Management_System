import mongoose from "mongoose";
import dotenv from "dotenv";
import UserModel from "./models/user.model";
import WorkspaceModel from "./models/workspace.model";
import MemberModel from "./models/member.model";
import RoleModel from "./models/roles-permission.model";
import AccountModel from "./models/account.model";
import { ProviderEnum } from "./enums/account-provider.enum";
import { Roles } from "./enums/role.enum";

dotenv.config();

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

async function seed2() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("Connected to DB");

    // We get or create akshathdeepa1978@gmail.com
    let targetOwner = await UserModel.findOne({ email: "akshathdeepa1978@gmail.com" });
    if (!targetOwner) {
      targetOwner = await UserModel.create({
        name: "Akshath S",
        email: "akshathdeepa1978@gmail.com",
        password: "password123",
      });
      console.log("Created target owner: Akshath S (akshathdeepa1978@gmail.com)");
    }

    let targetOwnerAccount = await AccountModel.findOne({ provider: ProviderEnum.EMAIL, providerId: "akshathdeepa1978@gmail.com" });
    if (!targetOwnerAccount) {
      await AccountModel.create({
        userId: targetOwner._id,
        provider: ProviderEnum.EMAIL,
        providerId: "akshathdeepa1978@gmail.com",
      });
      console.log("Created account for target owner");
    }

    const memberRole = await RoleModel.findOne({ name: Roles.MEMBER });
    const ownerRole = await RoleModel.findOne({ name: Roles.OWNER });
    if (!memberRole || !ownerRole) {
      console.log("Roles not found.");
      process.exit(1);
    }

    // Find any workspaces (or workspaces owned by either akshath1025@gmail.com or akshathdeepa1978@gmail.com)
    const workspaces = await WorkspaceModel.find();
    if (workspaces.length === 0) {
       console.log("No workspaces found in DB.");
       process.exit(1);
    }

    for (const workspace of workspaces) {
      console.log(`Setting owner & members for workspace: ${workspace.name}`);

      // Ensure akshathdeepa1978@gmail.com is set as owner of the workspace
      if (!workspace.owner.equals(targetOwner._id)) {
        workspace.owner = targetOwner._id;
        await workspace.save();
        console.log(` -> Set owner to akshathdeepa1978@gmail.com`);
      }

      // Ensure akshathdeepa1978@gmail.com has OWNER membership record
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
        console.log(" -> Created OWNER membership");
      } else if (!ownerMembership.role.equals(ownerRole._id)) {
        ownerMembership.role = ownerRole._id;
        await ownerMembership.save();
        console.log(" -> Updated membership to OWNER");
      }

      // Add all other dummy members as MEMBER
      for (const memberInfo of dummyMembers) {
        const { name, email } = memberInfo;
        
        // Skip target owner as they are already handled
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
          console.log(` -> Created user ${name}`);
        }

        // Ensure Account record exists
        let account = await AccountModel.findOne({ provider: ProviderEnum.EMAIL, providerId: email });
        if (!account) {
          await AccountModel.create({
            userId: user._id,
            provider: ProviderEnum.EMAIL,
            providerId: email,
          });
          console.log(` -> Created account for ${email}`);
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
          console.log(` -> Added member ${name}`);
        } else if (existingMember.role.equals(ownerRole._id)) {
          existingMember.role = memberRole._id;
          await existingMember.save();
          console.log(` -> Demoted ${name} to MEMBER`);
        }
      }
    }

    console.log("Seeding complete.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding:", error);
    process.exit(1);
  }
}

seed2();
