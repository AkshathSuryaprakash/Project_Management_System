import axios from "axios";

const API_BASE = "http://localhost:8000/api";

async function verifyMessaging() {
  console.log("=== 1. Login as Akshath (Admin) ===");
  const akshathLogin = await axios.post(`${API_BASE}/auth/login`, {
    email: "akshathdeepa1978@gmail.com",
    password: "password123",
  });
  const akshathCookie = akshathLogin.headers["set-cookie"]?.join("; ") || "";
  const akshath = akshathLogin.data.user;
  const workspaceId = akshath.currentWorkspace;
  console.log(`Akshath ID: ${akshath._id}, Workspace: ${workspaceId}`);

  console.log("\n=== 2. Login as Rahul (Member) ===");
  const rahulLogin = await axios.post(`${API_BASE}/auth/login`, {
    email: "rahul@example.com",
    password: "password123",
  });
  const rahulCookie = rahulLogin.headers["set-cookie"]?.join("; ") || "";
  const rahul = rahulLogin.data.user;
  console.log(`Rahul ID: ${rahul._id}`);

  const sortedPair = [akshath._id.toString(), rahul._id.toString()].sort();
  const dmConvId = `dm:${sortedPair[0]}_${sortedPair[1]}`;
  console.log(`Target DM Conversation ID: ${dmConvId}`);

  console.log("\n=== 3. Rahul sends a message to Akshath ===");
  const rahulSend = await axios.post(
    `${API_BASE}/workspace/${workspaceId}/messages/send`,
    {
      conversationId: dmConvId,
      recipientId: akshath._id,
      content: `Hello Akshath! Checking in at ${Date.now()}`,
    },
    { headers: { Cookie: rahulCookie } }
  );
  console.log("Rahul sent:", rahulSend.data.data.content);
  console.log("Saved under conversationId:", rahulSend.data.data.conversationId);
  if (rahulSend.data.data.conversationId !== dmConvId) {
    throw new Error(`Expected ${dmConvId} but got ${rahulSend.data.data.conversationId}`);
  }

  console.log("\n=== 4. Akshath checks recent conversations ===");
  const recentRes = await axios.get(
    `${API_BASE}/workspace/${workspaceId}/messages/recent`,
    { headers: { Cookie: akshathCookie } }
  );
  console.log(`Found ${recentRes.data.conversations.length} recent conversations for Akshath.`);
  const rahulConv = recentRes.data.conversations.find((c: any) => c.conversationId === dmConvId);
  if (!rahulConv) {
    throw new Error("Rahul conversation not found in recent conversations list!");
  }
  console.log(`Recent conversation with ${rahulConv.partner?.name}: "${rahulConv.lastMessage?.content}" (unread: ${rahulConv.unreadCount})`);

  console.log("\n=== 5. Akshath replies back in the same DM conversation ===");
  // Note: Even if recipientId is not provided or if conversationId is provided, backend correctly routes to Rahul
  const akshathReply = await axios.post(
    `${API_BASE}/workspace/${workspaceId}/messages/send`,
    {
      conversationId: dmConvId,
      content: `Hi Rahul! Got your check-in, everything is on track at ${Date.now()}`,
    },
    { headers: { Cookie: akshathCookie } }
  );
  console.log("Akshath replied:", akshathReply.data.data.content);
  console.log("Saved under conversationId:", akshathReply.data.data.conversationId);
  console.log("Recipient is:", akshathReply.data.data.recipientId?.name || akshathReply.data.data.recipientId);

  if (akshathReply.data.data.conversationId !== dmConvId) {
    throw new Error(`Reply was misrouted to ${akshathReply.data.data.conversationId} instead of ${dmConvId}!`);
  }

  const personalNotesId = `dm:${akshath._id}_${akshath._id}`;
  if (akshathReply.data.data.conversationId === personalNotesId) {
    throw new Error("Reply went to personal notes! Bug still exists!");
  }

  console.log("\n=== 6. Verify full conversation history for both users ===");
  const akshathView = await axios.get(
    `${API_BASE}/workspace/${workspaceId}/messages/conversations/${dmConvId}`,
    { headers: { Cookie: akshathCookie } }
  );
  const rahulView = await axios.get(
    `${API_BASE}/workspace/${workspaceId}/messages/conversations/${dmConvId}`,
    { headers: { Cookie: rahulCookie } }
  );

  console.log(`Akshath sees ${akshathView.data.messages.length} messages.`);
  console.log(`Rahul sees ${rahulView.data.messages.length} messages.`);
  console.log("Latest message in chat:", rahulView.data.messages.slice(-1)[0].content);

  console.log("\n=== ALL TESTS PASSED SUCCESSFULLY! ===");
}

verifyMessaging().catch((err) => {
  console.error("Test failed:", err.response?.data || err.message);
  process.exit(1);
});
