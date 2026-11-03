import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { useAuthContext } from "@/context/auth-provider";
import { useSocket } from "@/context/socket-context";
import {
  getChannelsQueryFn,
  getConversationMessagesQueryFn,
  sendMessageMutationFn,
} from "@/lib/api";
import useGetWorkspaceMembers from "@/hooks/api/use-get-workspace-members";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Hash,
  Send,
  Paperclip,
  Search,
  MessageSquare,
  FileIcon,
  Download,
} from "lucide-react";
import { getAvatarColor, getAvatarFallbackText } from "@/lib/helper";
import { toast } from "@/hooks/use-toast";

export default function Messages() {
  const workspaceId = useWorkspaceId();
  const { user } = useAuthContext();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const [activeType, setActiveType] = useState<"channel" | "dm">("channel");
  const [activeChannel, setActiveChannel] = useState("general");
  const [activeDmUser, setActiveDmUser] = useState<any | null>(null);
  const [searchMember, setSearchMember] = useState("");
  const [messageText, setMessageText] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Channels
  const { data: channelsData } = useQuery({
    queryKey: ["channels", workspaceId],
    queryFn: () => getChannelsQueryFn(workspaceId),
    enabled: !!workspaceId,
  });

  // Members for DM
  const { data: membersData } = useGetWorkspaceMembers(workspaceId);
  const members = membersData?.members || [];
  const channels = channelsData?.channels || [
    { name: "general", conversationId: "channel:general" },
    { name: "development", conversationId: "channel:development" },
    { name: "testing", conversationId: "channel:testing" },
    { name: "design", conversationId: "channel:design" },
  ];

  // Compute active conversationId
  const conversationId =
    activeType === "channel"
      ? `channel:${activeChannel.toLowerCase()}`
      : activeDmUser
      ? `dm:${[user?._id, activeDmUser._id].sort().join("_")}`
      : "";

  // Messages Query
  const { data: messagesData, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["messages", workspaceId, conversationId],
    queryFn: () => getConversationMessagesQueryFn(workspaceId, conversationId),
    enabled: !!workspaceId && !!conversationId,
    refetchInterval: false,
  });

  const messages = messagesData?.messages || [];

  // Send Message Mutation
  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: sendMessageMutationFn,
    onSuccess: (data) => {
      setMessageText("");
      queryClient.setQueryData(
        ["messages", workspaceId, conversationId],
        (old: any) => {
          const oldList = old?.messages || [];
          return { ...old, messages: [...oldList, data.data] };
        }
      );
      queryClient.invalidateQueries({
        queryKey: ["messages", workspaceId, conversationId],
      });
    },
    onError: (err: any) => {
      toast({
        title: "Send failed",
        description: err.message || "Could not send message",
        variant: "destructive",
      });
    },
  });

  // Socket listener for live incoming messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      if (
        msg.workspaceId === workspaceId &&
        msg.conversationId === conversationId
      ) {
        queryClient.setQueryData(
          ["messages", workspaceId, conversationId],
          (old: any) => {
            const list = old?.messages || [];
            if (list.some((m: any) => m._id === msg._id)) return old;
            return { ...old, messages: [...list, msg] };
          }
        );
      }
    };

    const handleTypingStart = (data: any) => {
      if (
        data.conversationId === conversationId &&
        data.userId !== user?._id
      ) {
        setTypingUsers((prev) =>
          prev.includes(data.userName) ? prev : [...prev, data.userName]
        );
      }
    };

    const handleTypingStop = (data: any) => {
      if (data.conversationId === conversationId) {
        setTypingUsers((prev) => prev.filter((u) => u !== data.userName));
      }
    };

    socket.on("message:received", handleNewMessage);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);

    return () => {
      socket.off("message:received", handleNewMessage);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
    };
  }, [socket, workspaceId, conversationId, user?._id, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    sendMessage({
      workspaceId,
      data: {
        conversationId,
        content: messageText.trim(),
        channel: activeType === "channel" ? activeChannel : undefined,
        recipientId: activeType === "dm" ? activeDmUser?._id : undefined,
      },
    });

    if (socket) {
      socket.emit("typing:stop", {
        workspaceId,
        conversationId,
        userId: user?._id,
        userName: user?.name,
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    if (socket) {
      if (e.target.value.length > 0) {
        socket.emit("typing:start", {
          workspaceId,
          conversationId,
          userId: user?._id,
          userName: user?.name || "Colleague",
        });
      } else {
        socket.emit("typing:stop", {
          workspaceId,
          conversationId,
          userId: user?._id,
          userName: user?.name,
        });
      }
    }
  };

  // Filter members for DM list
  const filteredMembers = members.filter((m: any) => {
    const name = m.userId?.name || "";
    const email = m.userId?.email || "";
    const q = searchMember.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  const activeTitle =
    activeType === "channel"
      ? `#${activeChannel}`
      : `${activeDmUser?.name || "Member"} – Direct Message`;

  const placeholderText =
    activeType === "channel"
      ? `Message #${activeChannel}...`
      : `Message ${activeDmUser?.name || "colleague"}...`;

  return (
    <div className="w-full flex h-[calc(100vh-5rem)] rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
      {/* LEFT SIDEBAR matching Figure 9.10 */}
      <div className="w-64 md:w-72 border-r bg-muted/20 flex flex-col shrink-0">
        <div className="p-3.5 border-b space-y-3">
          <h2 className="font-bold text-base tracking-tight flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" /> Messages
          </h2>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search chat"
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* CHANNELS GROUP */}
          <div>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase px-2 mb-1.5 tracking-wider">
              Channels
            </h3>
            <div className="space-y-0.5">
              {channels.map((ch: any) => {
                const isSelected =
                  activeType === "channel" && activeChannel === ch.name;
                return (
                  <button
                    key={ch.name}
                    onClick={() => {
                      setActiveType("channel");
                      setActiveChannel(ch.name);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-accent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Hash className="w-3.5 h-3.5 shrink-0" />
                    <span>{ch.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DIRECT MESSAGES GROUP */}
          <div>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase px-2 mb-1.5 tracking-wider">
              Direct Messages
            </h3>
            <div className="space-y-0.5">
              {filteredMembers.map((m: any) => {
                const u = m.userId;
                if (!u) return null;
                const isSelected =
                  activeType === "dm" && activeDmUser?._id === u._id;
                const isSelf = u._id === user?._id;
                const initials = getAvatarFallbackText(u.name);
                const color = getAvatarColor(u.name);

                return (
                  <button
                    key={u._id}
                    onClick={() => {
                      setActiveType("dm");
                      setActiveDmUser(u);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-accent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarImage src={u.profilePicture || ""} />
                        <AvatarFallback className={`${color} text-[9px]`}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">
                        {u.name} {isSelf && "(You)"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT CHAT AREA matching Figure 9.10 */}
      <div className="flex-1 flex flex-col h-full bg-background">
        {/* Conversation Header */}
        <div className="h-12 border-b flex items-center px-4 justify-between shrink-0 bg-muted/10">
          <div className="flex items-center gap-2">
            {activeType === "channel" ? (
              <Hash className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Avatar className="h-6 w-6">
                <AvatarImage src={activeDmUser?.profilePicture || ""} />
                <AvatarFallback className="text-[10px]">
                  {getAvatarFallbackText(activeDmUser?.name || "U")}
                </AvatarFallback>
              </Avatar>
            )}
            <span className="font-semibold text-sm">{activeTitle}</span>
          </div>
        </div>

        {/* Message History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-xs text-muted-foreground">
                Loading messages...
              </span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-sm">No messages yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Send the first message to start this conversation.
              </p>
            </div>
          ) : (
            messages.map((msg: any) => {
              const isMe = msg.senderId?._id === user?._id;
              const senderName = msg.senderId?.name || "User";
              const initials = getAvatarFallbackText(senderName);
              const color = getAvatarColor(senderName);

              return (
                <div
                  key={msg._id}
                  className={`flex items-start gap-2.5 max-w-[80%] ${
                    isMe ? "ml-auto flex-row-reverse" : ""
                  }`}
                >
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                    <AvatarImage src={msg.senderId?.profilePicture || ""} />
                    <AvatarFallback className={`${color} text-[10px]`}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-1">
                    <div
                      className={`flex items-center gap-2 text-[11px] text-muted-foreground ${
                        isMe ? "justify-end" : ""
                      }`}
                    >
                      <span className="font-semibold text-foreground">
                        {isMe ? "You" : senderName}
                      </span>
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div
                      className={`p-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                        isMe
                          ? "bg-primary text-primary-foreground rounded-tr-none"
                          : "bg-muted text-foreground rounded-tl-none border"
                      }`}
                    >
                      {msg.content}

                      {/* Message Attachments */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2 space-y-1.5 pt-2 border-t border-primary-foreground/20">
                          {msg.attachments.map((att: any, idx: number) => (
                            <a
                              key={idx}
                              href={att.fileData}
                              download={att.fileName}
                              className="flex items-center gap-2 text-xs bg-black/10 dark:bg-white/10 p-1.5 rounded hover:opacity-80 transition-opacity"
                            >
                              <FileIcon className="w-3.5 h-3.5" />
                              <span className="truncate">{att.fileName}</span>
                              <Download className="w-3.5 h-3.5 ml-auto shrink-0" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicators */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-1 text-[11px] text-muted-foreground italic">
            {typingUsers.join(", ")} {typingUsers.length > 1 ? "are" : "is"}{" "}
            typing...
          </div>
        )}

        {/* Message Input matching Figure 9.10 */}
        <form
          onSubmit={handleSend}
          className="p-3 border-t bg-muted/20 flex items-center gap-2 shrink-0"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          <Input
            value={messageText}
            onChange={handleInputChange}
            placeholder={placeholderText}
            className="h-10 text-sm bg-background"
          />

          <Button
            type="submit"
            size="icon"
            disabled={isSending || !messageText.trim()}
            className="h-9 w-9 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

