import axios from "axios";

const API_BASE = "http://localhost:8000/api";

async function runWorkloadRBACTests() {
  console.log("=== STARTING ADMIN MEMBER WORKLOAD & RBAC VERIFICATION ===");

  // 1. Login as Admin / Owner: Akshath
  console.log("\n[1] Logging in as Workspace Owner/Admin (Akshath)...");
  const adminLogin = await axios.post(
    `${API_BASE}/auth/login`,
    {
      email: "akshathdeepa1978@gmail.com",
      password: "password123",
    },
    { withCredentials: true }
  );
  const adminCookie = adminLogin.headers["set-cookie"]?.join("; ") || "";
  const adminUser = adminLogin.data.user;
  const workspaceId = adminUser.currentWorkspace;
  console.log(`✓ Admin logged in: ${adminUser.name} (${adminUser._id}), Workspace: ${workspaceId}`);

  // 2. Login as Normal Member: Rahul
  console.log("\n[2] Logging in as Normal Member (Rahul)...");
  const memberLogin = await axios.post(
    `${API_BASE}/auth/login`,
    {
      email: "rahul@example.com",
      password: "password123",
    },
    { withCredentials: true }
  );
  const memberCookie = memberLogin.headers["set-cookie"]?.join("; ") || "";
  const memberUser = memberLogin.data.user;
  console.log(`✓ Member logged in: ${memberUser.name} (${memberUser._id})`);

  // 3. Admin retrieves Member Workload & Task Performance Analytics
  console.log("\n[3] Admin requesting /api/workspace/:id/members/workload...");
  const adminWorkloadRes = await axios.get(
    `${API_BASE}/workspace/${workspaceId}/members/workload`,
    {
      headers: { Cookie: adminCookie },
    }
  );

  console.log("✓ Admin response status:", adminWorkloadRes.status);
  const { summary, members } = adminWorkloadRes.data;
  console.log(`✓ Workspace Summary: Total Members = ${summary.totalMembers}, Assigned Tasks = ${summary.totalAssignedTasks}, Avg Success = ${summary.averageSuccessRatio}%, Overloaded Members = ${summary.overloadedMembersCount}`);

  members.forEach((m: any) => {
    console.log(`  - Member: ${m.user.name} [${m.role}]`);
    console.log(`    Total: ${m.totalTasks}, Done: ${m.completedCount}, Pending: ${m.pendingCount}, Overdue: ${m.overdueCount}`);
    console.log(`    Success Ratio: ${m.successRatio}%, Overloaded: ${m.isOverloaded} (${m.workloadLevel})`);
    console.log(`    Completed Tasks (${m.completedTasks.length}):`, m.completedTasks.map((t: any) => `${t.taskCode} - ${t.title}`).join(", ") || "None");
  });

  if (!Array.isArray(members) || members.length === 0) {
    throw new Error("Failed: members array should not be empty");
  }

  // 4. Strict RBAC Verification: Normal member attempts to access workload analytics
  console.log("\n[4] Normal member (Rahul) attempting to access /api/workspace/:id/members/workload...");
  let memberBlocked = false;
  try {
    await axios.get(
      `${API_BASE}/workspace/${workspaceId}/members/workload`,
      {
        headers: { Cookie: memberCookie },
      }
    );
  } catch (err: any) {
    if (err.response?.status === 403) {
      memberBlocked = true;
      console.log(`✓ Access correctly DENIED (HTTP 403 Forbidden): "${err.response.data.message}"`);
    } else {
      console.error("Unexpected error:", err.response?.status, err.response?.data);
    }
  }

  if (!memberBlocked) {
    throw new Error("SECURITY FAILURE: Normal member was NOT blocked with 403 from viewing admin workload analytics!");
  }

  // 5. Verify Time Tracking endpoint is removed
  console.log("\n[5] Verifying Time Tracking endpoint is removed (/api/time-tracking/start)...");
  let timeTrackingRemoved = false;
  try {
    await axios.post(
      `${API_BASE}/time-tracking/start`,
      { workspaceId },
      { headers: { Cookie: adminCookie } }
    );
  } catch (err: any) {
    if (err.response?.status === 404) {
      timeTrackingRemoved = true;
      console.log("✓ Correctly returned HTTP 404 Not Found (Time tracking removed)");
    } else {
      console.log(`Status: ${err.response?.status}`);
    }
  }

  if (!timeTrackingRemoved) {
    throw new Error("Time tracking routes should not be mounted or should return 404");
  }

  // 6. Verify Task Dependencies still functioning cleanly
  console.log("\n[6] Verifying Task Dependencies API is intact...");
  const tasksRes = await axios.get(
    `${API_BASE}/task/workspace/${workspaceId}/all?pageSize=10`,
    {
      headers: { Cookie: adminCookie },
    }
  );
  const tasks = tasksRes.data.tasks || [];
  if (tasks.length > 0) {
    const depsRes = await axios.get(
      `${API_BASE}/task/${tasks[0]._id}/dependencies?workspaceId=${workspaceId}`,
      {
        headers: { Cookie: adminCookie },
      }
    );
    console.log(`✓ Task Dependencies endpoint returned 200 OK for task ${tasks[0].taskCode || tasks[0]._id}`);
    console.log(`  Status summary: isBlocked = ${depsRes.data.statusSummary.isBlocked}, isReady = ${depsRes.data.statusSummary.isReady}`);
  }

  console.log("\n=======================================================");
  console.log("🎉 ALL TESTS PASSED: Admin Member Workload, RBAC Protection, & Time Tracking Removal Verified!");
  console.log("=======================================================\n");
}

runWorkloadRBACTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
