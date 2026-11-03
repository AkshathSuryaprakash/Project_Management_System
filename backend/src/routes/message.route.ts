import { Router } from "express";
import {
  getChannelsController,
  getConversationMessagesController,
  markMessagesAsReadController,
  sendMessageController,
} from "../controllers/message.controller";

const messageRoutes = Router({ mergeParams: true });

messageRoutes.get("/channels", getChannelsController);
messageRoutes.get("/conversations/:conversationId", getConversationMessagesController);
messageRoutes.post("/send", sendMessageController);
messageRoutes.put("/read", markMessagesAsReadController);

export default messageRoutes;

