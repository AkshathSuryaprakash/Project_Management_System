import axios from "axios";

const API_BASE = "http://localhost:8000/api";

async function runFeaturesVerification() {
  console.log("===============================================================");
  console.log("STARTING VERIFICATION: TASK TIME TRACKING & TASK DEPENDENCIES");
  console.log("===============================================================\n");

  // 1. Login as Akshath (Owner)
  console.log("[1] Logging in as Akshath (Owner)...");
  const akshathLogin = await axios.post(
    `${API_BASE}/auth/login`,
    {
      email: "akshathdeepa1978@gmail.com",
      password: "password123",
    },
    { withCredentials: true }
  );
  const akshathCookie = akshathLogin.headers["set-cookie"]?.join("; ") || "";
  const akshathUser = akshathLogin.data.user;
  const workspaceId = akshathUser.currentWorkspace;
  console.log(`✓ Akshath logged in: ID = ${akshathUser._id}, Workspace = ${workspaceId}`);

  // 2. Login as Rahul (Member)
  console.log("\n[2] Logging in as Rahul (Member)...");
  const rahulLogin = await axios.post(
    `${API_BASE}/auth/login`,
    {
      email: "rahul@example.com",
      password: "password123",
    },
    { withCredentials: true }
  );
  const rahulCookie = rahulLogin.headers["set-cookie"]?.join("; ") || "";
  const rahulUser = rahulLogin.data.user;
  console.log(`✓ Rahul logged in: ID = ${rahulUser._id}`);

  // 3. Fetch workspace projects & tasks for test setup
  console.log("\n[3] Fetching projects in workspace...");
  const projectsRes = await axios.get(
    `${API_BASE}/project/workspace/${workspaceId}/all`,
    { headers: { Cookie: akshathCookie } }
  );
  const projects = projectsRes.data.projects;
  if (!projects || projects.length < 2) {
    throw new Error("Need at least 2 projects in the workspace for testing cross-project constraints.");
  }
  const project1 = projects[0];
  const project2 = projects[1];
  console.log(`✓ Project 1: "${project1.name}" (${project1._id})`);
  console.log(`✓ Project 2: "${project2.name}" (${project2._id})`);

  // Create 3 tasks in Project 1
  console.log("\n[4] Creating test tasks in Project 1...");
  const taskARes = await axios.post(
    `${API_BASE}/task/project/${project1._id}/workspace/${workspaceId}/create`,
    {
      title: "Task A - Design Database",
      description: "First phase database design",
      priority: "HIGH",
      status: "TODO",
      assignedTo: akshathUser._id,
    },
    { headers: { Cookie: akshathCookie } }
  );
  const taskA = taskARes.data.task;

  const taskBRes = await axios.post(
    `${API_BASE}/task/project/${project1._id}/workspace/${workspaceId}/create`,
    {
      title: "Task B - Develop Backend API",
      description: "Second phase backend API development",
      priority: "HIGH",
      status: "TODO",
      assignedTo: akshathUser._id,
    },
    { headers: { Cookie: akshathCookie } }
  );
  const taskB = taskBRes.data.task;

  const taskCRes = await axios.post(
    `${API_BASE}/task/project/${project1._id}/workspace/${workspaceId}/create`,
    {
      title: "Task C - Integrate Frontend",
      description: "Third phase frontend integration",
      priority: "MEDIUM",
      status: "TODO",
      assignedTo: akshathUser._id,
    },
    { headers: { Cookie: akshathCookie } }
  );
  const taskC = taskCRes.data.task;

  // Create 1 task in Project 2 for cross-project test
  const taskOtherRes = await axios.post(
    `${API_BASE}/task/project/${project2._id}/workspace/${workspaceId}/create`,
    {
      title: "Task Other - Project 2 Task",
      priority: "LOW",
      status: "TODO",
      assignedTo: akshathUser._id,
    },
    { headers: { Cookie: akshathCookie } }
  );
  const taskOther = taskOtherRes.data.task;
  console.log(`✓ Task A created: ${taskA.taskCode} (${taskA._id})`);
  console.log(`✓ Task B created: ${taskB.taskCode} (${taskB._id})`);
  console.log(`✓ Task C created: ${taskC.taskCode} (${taskC._id})`);
  console.log(`✓ Task Other (Proj 2) created: ${taskOther.taskCode} (${taskOther._id})`);

  // =========================================================================
  // FEATURE 1: TASK TIME TRACKING VERIFICATION
  // =========================================================================
  console.log("\n---------------------------------------------------------------");
  console.log("FEATURE 1: TASK TIME TRACKING VERIFICATION");
  console.log("---------------------------------------------------------------");

  // A. Start Timer for Akshath on Task A
  console.log("\n[F1.1] Starting timer for Akshath on Task A...");
  const startTimerRes = await axios.post(
    `${API_BASE}/time-tracking/start`,
    {
      workspaceId,
      taskId: taskA._id,
      description: "Initial database architecture design session",
    },
    { headers: { Cookie: akshathCookie } }
  );
  const activeEntry = startTimerRes.data.entry;
  console.log(`✓ Timer started: ID = ${activeEntry._id}, Status = ${activeEntry.status}, StartTime = ${activeEntry.startTime}`);

  // B. Verify active timer query
  console.log("\n[F1.2] Verifying GET /api/time-tracking/active...");
  const activeTimerRes = await axios.get(
    `${API_BASE}/time-tracking/active?workspaceId=${workspaceId}`,
    { headers: { Cookie: akshathCookie } }
  );
  if (!activeTimerRes.data.activeTimer || activeTimerRes.data.activeTimer._id !== activeEntry._id) {
    throw new Error("Failed to retrieve active timer for Akshath");
  }
  console.log(`✓ Active timer verified for user: Task = "${activeTimerRes.data.activeTimer.taskId?.title}"`);

  // C. Try starting another timer while one is already active (Must be rejected)
  console.log("\n[F1.3] Attempting to start a SECOND timer while first is running (must fail)...");
  try {
    await axios.post(
      `${API_BASE}/time-tracking/start`,
      {
        workspaceId,
        taskId: taskB._id,
        description: "Should fail duplicate timer test",
      },
      { headers: { Cookie: akshathCookie } }
    );
    throw new Error("FAIL: Server allowed second concurrent timer!");
  } catch (err: any) {
    if (err.response?.status === 400) {
      console.log(`✓ Correctly rejected duplicate concurrent timer: "${err.response.data.message}"`);
    } else {
      throw err;
    }
  }

  // D. Try stopping Akshath's timer using Rahul's account (Must be rejected)
  console.log("\n[F1.4] Attempting to stop Akshath's timer as Rahul (must fail with 403)...");
  try {
    await axios.post(
      `${API_BASE}/time-tracking/stop`,
      {
        workspaceId,
        timeEntryId: activeEntry._id,
      },
      { headers: { Cookie: rahulCookie } }
    );
    throw new Error("FAIL: Rahul was able to stop Akshath's timer!");
  } catch (err: any) {
    if (err.response?.status === 403) {
      console.log(`✓ Correctly rejected cross-user timer stop: "${err.response.data.message}"`);
    } else {
      throw err;
    }
  }

  // E. Wait 2 seconds and stop the timer
  console.log("\n[F1.5] Waiting 2 seconds then stopping Akshath's timer...");
  await new Promise((r) => setTimeout(r, 2000));
  const stopTimerRes = await axios.post(
    `${API_BASE}/time-tracking/stop`,
    {
      workspaceId,
      timeEntryId: activeEntry._id,
    },
    { headers: { Cookie: akshathCookie } }
  );
  const stoppedEntry = stopTimerRes.data.entry;
  console.log(`✓ Timer stopped: Status = ${stoppedEntry.status}, Duration = ${stoppedEntry.duration}s, EndTime = ${stoppedEntry.endTime}`);
  if (stoppedEntry.duration < 2) {
    throw new Error(`Expected duration >= 2 seconds, got ${stoppedEntry.duration}`);
  }

  // F. Verify task time entries and total duration
  console.log("\n[F1.6] Fetching time entries for Task A...");
  const taskTimeRes = await axios.get(
    `${API_BASE}/time-tracking/task/${taskA._id}?workspaceId=${workspaceId}`,
    { headers: { Cookie: akshathCookie } }
  );
  console.log(`✓ Total completed sessions: ${taskTimeRes.data.entries.length}`);
  console.log(`✓ Total duration tracked: ${taskTimeRes.data.totalDuration}s (${taskTimeRes.data.formattedTotalDuration})`);
  console.log(`✓ Active timer on task: ${taskTimeRes.data.activeTimer ? "Yes" : "None"}`);

  // =========================================================================
  // FEATURE 2: TASK DEPENDENCIES VERIFICATION
  // =========================================================================
  console.log("\n---------------------------------------------------------------");
  console.log("FEATURE 2: TASK DEPENDENCIES VERIFICATION");
  console.log("---------------------------------------------------------------");

  // A. Self-dependency check (Task A depends on Task A - must fail)
  console.log("\n[F2.1] Attempting self-dependency (Task A depends on Task A)...");
  try {
    await axios.post(
      `${API_BASE}/task/${taskA._id}/dependencies`,
      {
        workspaceId,
        dependencyTaskId: taskA._id,
      },
      { headers: { Cookie: akshathCookie } }
    );
    throw new Error("FAIL: Server allowed a task to depend on itself!");
  } catch (err: any) {
    if (err.response?.status === 400) {
      console.log(`✓ Correctly rejected self-dependency: "${err.response.data.message}"`);
    } else {
      throw err;
    }
  }

  // B. Cross-project dependency check (Task A in Proj 1 depends on Task Other in Proj 2 - must fail)
  console.log("\n[F2.2] Attempting cross-project dependency (Proj 1 depends on Proj 2)...");
  try {
    await axios.post(
      `${API_BASE}/task/${taskA._id}/dependencies`,
      {
        workspaceId,
        dependencyTaskId: taskOther._id,
      },
      { headers: { Cookie: akshathCookie } }
    );
    throw new Error("FAIL: Server allowed cross-project dependency!");
  } catch (err: any) {
    if (err.response?.status === 400) {
      console.log(`✓ Correctly rejected cross-project dependency: "${err.response.data.message}"`);
    } else {
      throw err;
    }
  }

  // C. Add valid dependency: Task B depends on Task A
  console.log("\n[F2.3] Adding valid dependency: Task B depends on Task A...");
  const depBtoARes = await axios.post(
    `${API_BASE}/task/${taskB._id}/dependencies`,
    {
      workspaceId,
      dependencyTaskId: taskA._id,
    },
    { headers: { Cookie: akshathCookie } }
  );
  console.log(`✓ Dependency added: Task B now depends on Task A`);

  // D. Try adding duplicate dependency (Task B depends on Task A again - must fail)
  console.log("\n[F2.4] Attempting duplicate dependency (Task B depends on Task A again)...");
  try {
    await axios.post(
      `${API_BASE}/task/${taskB._id}/dependencies`,
      {
        workspaceId,
        dependencyTaskId: taskA._id,
      },
      { headers: { Cookie: akshathCookie } }
    );
    throw new Error("FAIL: Server allowed duplicate dependency!");
  } catch (err: any) {
    if (err.response?.status === 400) {
      console.log(`✓ Correctly rejected duplicate dependency: "${err.response.data.message}"`);
    } else {
      throw err;
    }
  }

  // E. Add valid dependency: Task C depends on Task B
  console.log("\n[F2.5] Adding valid dependency: Task C depends on Task B...");
  await axios.post(
    `${API_BASE}/task/${taskC._id}/dependencies`,
    {
      workspaceId,
      dependencyTaskId: taskB._id,
    },
    { headers: { Cookie: akshathCookie } }
  );
  console.log(`✓ Dependency added: Task C now depends on Task B`);
  console.log(`✓ Current chain: Task C -> Task B -> Task A`);

  // F. Circular dependency check: Task A depends on Task C (creates cycle A -> C -> B -> A!)
  console.log("\n[F2.6] Attempting circular dependency: Task A depends on Task C...");
  try {
    await axios.post(
      `${API_BASE}/task/${taskA._id}/dependencies`,
      {
        workspaceId,
        dependencyTaskId: taskC._id,
      },
      { headers: { Cookie: akshathCookie } }
    );
    throw new Error("FAIL: Server allowed circular dependency!");
  } catch (err: any) {
    if (err.response?.status === 400) {
      console.log(`✓ Circular dependency successfully detected and blocked: "${err.response.data.message}"`);
    } else {
      throw err;
    }
  }

  // G. Verify dependency status & warning when prerequisite is incomplete
  console.log("\n[F2.7] Fetching dependencies for Task B (Prerequisite Task A is TODO)...");
  const depStatusRes1 = await axios.get(
    `${API_BASE}/task/${taskB._id}/dependencies?workspaceId=${workspaceId}`,
    { headers: { Cookie: akshathCookie } }
  );
  const summary1 = depStatusRes1.data.statusSummary;
  console.log(`✓ Status Summary: isBlocked = ${summary1.isBlocked}, isReady = ${summary1.isReady}`);
  console.log(`✓ Message: "${summary1.message}"`);
  if (!summary1.isBlocked) {
    throw new Error("Expected Task B to be blocked because Task A is in TODO status.");
  }

  // H. Complete prerequisite Task A and verify status becomes READY
  console.log("\n[F2.8] Marking prerequisite Task A as DONE and re-checking Task B...");
  await axios.put(
    `${API_BASE}/task/${taskA._id}/project/${project1._id}/workspace/${workspaceId}/update`,
    {
      status: "DONE",
    },
    { headers: { Cookie: akshathCookie } }
  );

  const depStatusRes2 = await axios.get(
    `${API_BASE}/task/${taskB._id}/dependencies?workspaceId=${workspaceId}`,
    { headers: { Cookie: akshathCookie } }
  );
  const summary2 = depStatusRes2.data.statusSummary;
  console.log(`✓ Status Summary: isBlocked = ${summary2.isBlocked}, isReady = ${summary2.isReady}`);
  console.log(`✓ Message: "${summary2.message}"`);
  if (!summary2.isReady || summary2.isBlocked) {
    throw new Error("Expected Task B to be ready now that Task A is DONE.");
  }

  // I. Remove dependency
  console.log("\n[F2.9] Removing dependency from Task B...");
  const removeRes = await axios.delete(
    `${API_BASE}/task/${taskB._id}/dependencies/${taskA._id}?workspaceId=${workspaceId}`,
    { headers: { Cookie: akshathCookie } }
  );
  console.log(`✓ Dependency removed: Remaining dependencies = ${removeRes.data.dependencies.length}`);
  if (removeRes.data.dependencies.length !== 0) {
    throw new Error("Expected 0 dependencies after removal.");
  }

  console.log("\n===============================================================");
  console.log("🎉 ALL TESTS FOR TIME TRACKING AND DEPENDENCIES PASSED 100%!");
  console.log("===============================================================\n");
}

runFeaturesVerification().catch((err) => {
  console.error("❌ Test failed:", err.response?.data || err.message || err);
  process.exit(1);
});
