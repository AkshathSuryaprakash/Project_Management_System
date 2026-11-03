import axios from "axios";
import { io as ClientIO } from "socket.io-client";

const API_BASE = "http://localhost:8000/api";
const SOCKET_URL = "http://localhost:8000";

async function runMessagingVerification() {
  console.log("=== STARTING FULL MESSAGING INTEGRATION & SOCKET.IO VERIFICATION ===");

  // 1. Login as User A: Akshath
  console.log("\n[1] Logging in as User A: Akshath (akshathdeepa1978@gmail.com)...");
  const akshathLoginRes = await axios.post(
    `${API_BASE}/auth/login`,
    {
      email: "akshathdeepa1978@gmail.com",
      password: "password123",
    },
    { withCredentials: true }
  );

  const akshathCookie = akshathLoginRes.headers["set-cookie"]?.join("; ") || "";
  const akshathUser = akshathLoginRes.data.user;
  const workspaceId = akshathUser.currentWorkspace;
  console.log(`✓ Akshath logged in: ID = ${akshathUser._id}, Workspace = ${workspaceId}`);

  // 2. Login as User B: Rahul
  console.log("\n[2] Logging in as User B: Rahul (rahul@example.com)...");
  const rahulLoginRes = await axios.post(
    `${API_BASE}/auth/login`,
    {
      email: "rahul@example.com",
      password: "password123",
    },
    { withCredentials: true }
  );

  const rahulCookie = rahulLoginRes.headers["set-cookie"]?.join("; ") || "";
  const rahulUser = rahulLoginRes.data.user;
  console.log(`✓ Rahul logged in: ID = ${rahulUser._id}`);

  // Compute DM conversation ID
  const sortedIds = [akshathUser._id.toString(), rahulUser._id.toString()].sort();
  const dmConversationId = `dm:${sortedIds[0]}_${sortedIds[1]}`;
  console.log(`✓ Normalized DM Conversation ID: ${dmConversationId}`);

  // 3. Connect User A Socket
  console.log("\n[3] Connecting Akshath Socket.IO client...");
  const akshathSocket = ClientIO(SOCKET_URL, {
    transports: ["websocket"],
    auth: { userId: akshathUser._id },
    extraHeaders: { Cookie: akshathCookie },
  });

  await new Promise<void>((resolve) => {
    akshathSocket.on("connect", () => {
      console.log(`✓ Akshath Socket connected: socketId = ${akshathSocket.id}`);
      akshathSocket.emit("join_workspace", { workspaceId, userId: akshathUser._id });
      akshathSocket.emit("join_conversation", {
        workspaceId,
        conversationId: dmConversationId,
        userId: akshathUser._id,
      });
      resolve();
    });
  });

  // 4. Connect User B Socket
  console.log("\n[4] Connecting Rahul Socket.IO client...");
  const rahulSocket = ClientIO(SOCKET_URL, {
    transports: ["websocket"],
    auth: { userId: rahulUser._id },
    extraHeaders: { Cookie: rahulCookie },
  });

  await new Promise<void>((resolve) => {
    rahulSocket.on("connect", () => {
      console.log(`✓ Rahul Socket connected: socketId = ${rahulSocket.id}`);
      rahulSocket.emit("join_workspace", { workspaceId, userId: rahulUser._id });
      rahulSocket.emit("join_conversation", {
        workspaceId,
        conversationId: dmConversationId,
        userId: rahulUser._id,
      });
      resolve();
    });
  });

  // 5. Test 1: Akshath sends DM "Hello Rahul"
  console.log("\n[5] Test: Akshath sends Direct Message 'Hello Rahul'...");
  const rahulReceivedPromise = new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timeout waiting for Rahul to receive message")), 7000);
    rahulSocket.on("message:received", (msg: any) => {
      if (msg.conversationId === dmConversationId && msg.content === "Hello Rahul") {
        clearTimeout(timer);
        resolve(msg);
      }
    });
  });

  const send1Res = await axios.post(
    `${API_BASE}/workspace/${workspaceId}/messages/send`,
    {
      conversationId: dmConversationId,
      recipientId: rahulUser._id,
      content: "Hello Rahul",
    },
    {
      headers: { Cookie: akshathCookie },
      withCredentials: true,
    }
  );
  console.log(`✓ Akshath HTTP 201 Created: messageId = ${send1Res.data.data._id}`);

  const rahulReceivedMsg = await rahulReceivedPromise;
  console.log(`✓ Rahul Socket RECEIVED in REAL-TIME: "${rahulReceivedMsg.content}" from ${rahulReceivedMsg.senderId?.name}`);

  // 6. Test 2: Rahul replies "Hi Akshath"
  console.log("\n[6] Test: Rahul replies with Direct Message 'Hi Akshath'...");
  const akshathReceivedPromise = new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timeout waiting for Akshath to receive reply")), 7000);
    akshathSocket.on("message:received", (msg: any) => {
      if (msg.conversationId === dmConversationId && msg.content === "Hi Akshath") {
        clearTimeout(timer);
        resolve(msg);
      }
    });
  });

  const send2Res = await axios.post(
    `${API_BASE}/workspace/${workspaceId}/messages/send`,
    {
      conversationId: dmConversationId,
      recipientId: akshathUser._id,
      content: "Hi Akshath",
    },
    {
      headers: { Cookie: rahulCookie },
      withCredentials: true,
    }
  );
  console.log(`✓ Rahul HTTP 201 Created: messageId = ${send2Res.data.data._id}`);

  const akshathReceivedReply = await akshathReceivedPromise;
  console.log(`✓ Akshath Socket RECEIVED in REAL-TIME: "${akshathReceivedReply.content}" from ${akshathReceivedReply.senderId?.name}`);

  // 7. Test 3: Simulate browser refresh & verify persistent history from MongoDB
  console.log("\n[7] Test: Refresh browser simulation (fetch DM conversation history)...");
  const akshathHistoryRes = await axios.get(
    `${API_BASE}/workspace/${workspaceId}/messages/conversations/${dmConversationId}`,
    {
      headers: { Cookie: akshathCookie },
      withCredentials: true,
    }
  );

  const rahulHistoryRes = await axios.get(
    `${API_BASE}/workspace/${workspaceId}/messages/conversations/${dmConversationId}`,
    {
      headers: { Cookie: rahulCookie },
      withCredentials: true,
    }
  );

  const akshathMessages = akshathHistoryRes.data.messages;
  const rahulMessages = rahulHistoryRes.data.messages;
  console.log(`✓ Akshath fetched ${akshathMessages.length} messages from MongoDB`);
  console.log(`✓ Rahul fetched ${rahulMessages.length} messages from MongoDB`);

  const lastTwo = akshathMessages.slice(-2);
  console.log(`✓ Message 1: [${lastTwo[0].senderId?.name}] "${lastTwo[0].content}" at ${lastTwo[0].createdAt}`);
  console.log(`✓ Message 2: [${lastTwo[1].senderId?.name}] "${lastTwo[1].content}" at ${lastTwo[1].createdAt}`);

  if (lastTwo[0].content !== "Hello Rahul" || lastTwo[1].content !== "Hi Akshath") {
    throw new Error("Message history order or content mismatch!");
  }

  // 8. Test Channel Messaging: #general, #development, #testing, #design
  console.log("\n[8] Test: Channel messaging across all 4 channels...");
  const channels = ["general", "development", "testing", "design"];

  for (const ch of channels) {
    const chConvId = `channel:${ch}`;
    akshathSocket.emit("join_conversation", { workspaceId, conversationId: chConvId, userId: akshathUser._id });
    rahulSocket.emit("join_conversation", { workspaceId, conversationId: chConvId, userId: rahulUser._id });

    const channelReceivedPromise = new Promise<any>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout waiting for channel #${ch} message`)), 7000);
      rahulSocket.on("message:received", (msg: any) => {
        if (msg.conversationId === chConvId) {
          clearTimeout(timer);
          resolve(msg);
        }
      });
    });

    const chContent = `Testing channel message in #${ch} at ${Date.now()}`;
    await axios.post(
      `${API_BASE}/workspace/${workspaceId}/messages/send`,
      {
        conversationId: chConvId,
        channel: ch,
        content: chContent,
      },
      {
        headers: { Cookie: akshathCookie },
        withCredentials: true,
      }
    );

    const received = await channelReceivedPromise;
    console.log(`✓ Channel #${ch} broadcast verified: "${received.content}" received by Rahul`);

    // Fetch channel history
    const chHistoryRes = await axios.get(
      `${API_BASE}/workspace/${workspaceId}/messages/conversations/${chConvId}`,
      {
        headers: { Cookie: rahulCookie },
        withCredentials: true,
      }
    );
    console.log(`✓ Channel #${ch} history persisted: ${chHistoryRes.data.messages.length} messages in DB`);
  }

  // Clean up
  akshathSocket.disconnect();
  rahulSocket.disconnect();

  console.log("\n=======================================================");
  console.log("🎉 ALL MESSAGING & SOCKET.IO TESTS PASSED 100% SUCCESFULLY!");
  console.log("=======================================================");
}

runMessagingVerification().catch((err) => {
  console.error("❌ Messaging verification failed:", err);
  process.exit(1);
});

