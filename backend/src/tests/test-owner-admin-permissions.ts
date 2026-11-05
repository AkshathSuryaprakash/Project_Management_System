import axios from "axios";

const API_BASE = "http://localhost:8000/api";

async function runTest() {
  console.log("=== 1. Login as Akshath (Workspace Owner) ===");
  const ownerLogin = await axios.post(`${API_BASE}/auth/login`, {
    email: "akshathdeepa1978@gmail.com",
    password: "password123",
  });
  const ownerCookie = ownerLogin.headers["set-cookie"]?.join("; ") || "";
  const owner = ownerLogin.data.user;
  const workspaceId = owner.currentWorkspace;
  console.log(`Owner: ${owner.name} (${owner._id}), Workspace: ${workspaceId}`);

  // Fetch workspace members and roles
  const membersRes = await axios.get(`${API_BASE}/workspace/members/${workspaceId}`, {
    headers: { Cookie: ownerCookie },
  });
  const members = membersRes.data.members;
  const roles = membersRes.data.roles;
  const adminRole = roles.find((r: any) => r.name === "ADMIN");
  const memberRole = roles.find((r: any) => r.name === "MEMBER");
  const ownerRole = roles.find((r: any) => r.name === "OWNER");

  const ownerMember = members.find((m: any) => m.userId?._id === owner._id);
  const rahulMember = members.find((m: any) => m.userId?.email === "rahul@example.com");

  console.log(`Owner Role ID: ${ownerRole?._id}`);
  console.log(`Admin Role ID: ${adminRole?._id}`);
  console.log(`Member Role ID: ${memberRole?._id}`);
  console.log(`Rahul User ID: ${rahulMember?.userId?._id}`);

  console.log("\n=== 2. Owner promotes Rahul to ADMIN ===");
  const promoteRes = await axios.put(
    `${API_BASE}/workspace/change/member/role/${workspaceId}`,
    {
      memberId: rahulMember.userId._id,
      roleId: adminRole._id,
    },
    { headers: { Cookie: ownerCookie } }
  );
  console.log("Promotion status:", promoteRes.status, promoteRes.data.message);

  console.log("\n=== 3. Login as Rahul (Now ADMIN) ===");
  const rahulLogin = await axios.post(`${API_BASE}/auth/login`, {
    email: "rahul@example.com",
    password: "password123",
  });
  const rahulCookie = rahulLogin.headers["set-cookie"]?.join("; ") || "";
  console.log("Rahul successfully logged in as ADMIN.");

  console.log("\n=== 4. TEST: Admin attempts to change Owner's position (MUST FAIL) ===");
  try {
    await axios.put(
      `${API_BASE}/workspace/change/member/role/${workspaceId}`,
      {
        memberId: owner._id,
        roleId: memberRole._id,
      },
      { headers: { Cookie: rahulCookie } }
    );
    throw new Error("SECURITY FAILURE: Admin was able to change Owner's position!");
  } catch (err: any) {
    console.log("Blocked as expected! Status:", err.response?.status, "| Message:", err.response?.data?.message);
    if (err.response?.status !== 403 && err.response?.status !== 400) {
      throw new Error(`Unexpected status code: ${err.response?.status}`);
    }
  }

  console.log("\n=== 5. TEST: Admin attempts to change another member's position (MUST FAIL) ===");
  const ashokMember = members.find((m: any) => m.userId?.email === "ashok@example.com");
  try {
    await axios.put(
      `${API_BASE}/workspace/change/member/role/${workspaceId}`,
      {
        memberId: ashokMember.userId._id,
        roleId: adminRole._id,
      },
      { headers: { Cookie: rahulCookie } }
    );
    throw new Error("SECURITY FAILURE: Admin was able to change another member's position!");
  } catch (err: any) {
    console.log("Blocked as expected! Status:", err.response?.status, "| Message:", err.response?.data?.message);
    if (err.response?.status !== 403) {
      throw new Error(`Expected 403 Forbidden, got: ${err.response?.status}`);
    }
  }

  console.log("\n=== 6. TEST: Admin CAN allocate/create tasks (MUST SUCCEED) ===");
  const projectsRes = await axios.get(`${API_BASE}/project/workspace/${workspaceId}/all`, {
    headers: { Cookie: rahulCookie },
  });
  const projId = projectsRes.data.projects[0]._id;

  const taskRes = await axios.post(
    `${API_BASE}/task/project/${projId}/workspace/${workspaceId}/create`,
    {
      title: "Task allocated by Admin",
      description: "Admin has full rights to allocate and manage tasks",
      assignedTo: ashokMember.userId._id,
      status: "TODO",
      priority: "HIGH",
    },
    { headers: { Cookie: rahulCookie } }
  );
  console.log("Task created by Admin status:", taskRes.status, "| Task Title:", taskRes.data.task?.title);

  console.log("\n=== 7. TEST: Owner attempts to demote Owner role (MUST FAIL) ===");
  try {
    await axios.put(
      `${API_BASE}/workspace/change/member/role/${workspaceId}`,
      {
        memberId: owner._id,
        roleId: memberRole._id,
      },
      { headers: { Cookie: ownerCookie } }
    );
    throw new Error("SECURITY FAILURE: Owner was able to demote Owner position!");
  } catch (err: any) {
    console.log("Blocked as expected! Status:", err.response?.status, "| Message:", err.response?.data?.message);
  }

  console.log("\n=== ALL PERMISSION TESTS PASSED! ===");
}

runTest().catch((err) => {
  console.error("Test failed:", err.response?.data || err.message);
  process.exit(1);
});
