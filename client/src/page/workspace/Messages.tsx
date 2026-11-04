import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import useWorkspaceId from "@/hooks/use-workspace-id";
import { useAuthContext } from "@/context/auth-provider";
import { useSocket } from "@/context/socket-context";
import {
  getChannelsQueryFn,
  getConversationMessagesQueryFn,
  getRecentConversationsQueryFn,
  markMessagesAsReadMutationFn,
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
  X,
  Loader,
  UserCheck,
  FileText,
  Clock,
} from "lucide-react";
import { getAvatarColor, getAvatarFallbackText } from "@/lib/helper";
import { toast } from "@/hooks/use-toast";

// Helper to reliably extract an ID string from an object or string
export const extractId = (obj: any): string => {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return (obj._id || obj.id || "").toString();
};

export default function Messages() {
  const workspaceId = useWorkspaceId();
  const { user } = useAuthContext();
  const { socket, isConnected } = useSocket();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const [activeType, setActiveType] = useState<"channel" | "dm">("channel");
  const [activeChannel, setActiveChannel] = useState("general");
  const [activeDmUser, setActiveDmUser] = useState<any | null>(null);
  const [searchMember, setSearchMember] = useState("");
  const [messageText, setMessageText] = useState("");
  const [attachments, setAttachments] = useState<
    Array<{ fileName: string; fileSize: number; fileType: string; fileData: string }>
  >([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Channels
  const { data: channelsData } = useQuery({
    queryKey: ["channels", workspaceId],
    queryFn: () => getChannelsQueryFn(workspaceId),
    enabled: !!workspaceId,
  });

  // Recent DM Conversations
  const { data: recentData } = useQuery({
    queryKey: ["recent-conversations", workspaceId],
    queryFn: () => getRecentConversationsQueryFn(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 15000,
  });
  const recentConversations = (recentData?.conversations || []).filter(
    (c: any) => !c.isSelf
  );

  // Mark as read mutation
  const { mutate: markAsRead } = useMutation({
    mutationFn: markMessagesAsReadMutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["recent-conversations", workspaceId],
      });
    },
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

  const currentUserId = extractId(user);

  // Helper to extract clean user object from member record
  const getMemberUser = (m: any) => {
    if (!m) return null;
    if (m.userId && typeof m.userId === "object") {
      return {
        _id: extractId(m.userId),
        name: m.userId.name || "Colleague",
        email: m.userId.email || "",
        profilePicture: m.userId.profilePicture || null,
      };
    }
    return {
      _id: extractId(m.userId || m),
      name: m.name || "Colleague",
      email: m.email || "",
      profilePicture: m.profilePicture || null,
    };
  };

  // Clean list of team members
  const memberUsers = useMemo(() => {
    return members
      .map((m: any) => ({
        memberRecordId: extractId(m),
        user: getMemberUser(m),
      }))
      .filter((item: any) => item.user && item.user._id);
  }, [members]);

  // Auto-select DM user from URL search param `?dm=userId` if present
  useEffect(() => {
    const dmUserId = searchParams.get("dm");
    if (dmUserId && memberUsers.length > 0) {
      const targetItem = memberUsers.find(
        (item: any) =>
          item.user._id === dmUserId ||
          item.memberRecordId === dmUserId ||
          item.user.email === dmUserId
      );
      if (targetItem && targetItem.user) {
        setActiveType("dm");
        setActiveDmUser(targetItem.user);
      }
    }
  }, [searchParams, memberUsers]);

  const activeDmUserId = extractId(activeDmUser);

  // Compute normalized conversationId
  const conversationId = useMemo(() => {
    if (activeType === "channel") {
      return `channel:${(activeChannel || "general").toLowerCase()}`;
    }
    if (activeType === "dm" && activeDmUserId && currentUserId) {
      const sorted = [currentUserId, activeDmUserId].sort();
      return `dm:${sorted[0]}_${sorted[1]}`;
    }
    return "";
  }, [activeType, activeChannel, activeDmUserId, currentUserId]);

  // Join/leave conversation room over Socket.IO
  useEffect(() => {
    if (socket && conversationId && workspaceId && currentUserId) {
      socket.emit("join_conversation", {
        workspaceId,
        conversationId,
        userId: currentUserId,
      });

      return () => {
        socket.emit("leave_conversation", { conversationId });
      };
    }
  }, [socket, conversationId, workspaceId, currentUserId]);

  // Messages Query
  const { data: messagesData, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["messages", workspaceId, conversationId],
    queryFn: () => getConversationMessagesQueryFn(workspaceId, conversationId),
    enabled: !!workspaceId && !!conversationId,
    staleTime: 0,
  });

  const messages = messagesData?.messages || [];

  // Send Message Mutation
  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: sendMessageMutationFn,
    onSuccess: (resData) => {
      setMessageText("");
      setAttachments([]);
      const newMsg = resData.data || resData.message;
      if (newMsg && newMsg._id) {
        queryClient.setQueryData(
          ["messages", workspaceId, conversationId],
          (old: any) => {
            const list = old?.messages || [];
            if (list.some((m: any) => extractId(m) === extractId(newMsg))) return old;
            return { ...old, messages: [...list, newMsg] };
          }
        );
      }
      queryClient.invalidateQueries({
        queryKey: ["messages", workspaceId, conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["recent-conversations", workspaceId],
      });
    },
    onError: (err: any) => {
      toast({
        title: "Message send failed",
        description: err.response?.data?.message || err.message || "Could not deliver message.",
        variant: "destructive",
      });
    },
  });

  // Real-time Socket.IO listener for live incoming messages & typing
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: any) => {
      if (!msg) return;
      const msgWsId = extractId(msg.workspaceId);
      const curWsId = workspaceId?.toString();
      if (msgWsId && curWsId && msgWsId !== curWsId) return;

      const incomingConvId = (msg.conversationId || "").toLowerCase();
      const currentConvId = (conversationId || "").toLowerCase();

      // Check if message belongs to current active conversation
      if (incomingConvId === currentConvId) {
        queryClient.setQueryData(
          ["messages", workspaceId, conversationId],
          (old: any) => {
            const list = old?.messages || [];
            if (list.some((m: any) => extractId(m) === extractId(msg))) return old;
            return { ...old, messages: [...list, msg] };
          }
        );
      } else {
        // Update cached messages for that conversation room so switching is instant
        queryClient.setQueryData(
          ["messages", workspaceId, msg.conversationId],
          (old: any) => {
            const list = old?.messages || [];
            if (list.some((m: any) => extractId(m) === extractId(msg))) return old;
            return { ...old, messages: [...list, msg] };
          }
        );

        // Update unread count for DM sender if message was sent to us
        const senderId = extractId(msg.senderId);
        const recipientId = extractId(msg.recipientId);
        if (
          recipientId &&
          currentUserId &&
          recipientId === currentUserId &&
          senderId !== currentUserId
        ) {
          setUnreadCounts((prev) => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1,
          }));
        }
      }
      queryClient.invalidateQueries({
        queryKey: ["recent-conversations", workspaceId],
      });
    };

    const handleTypingStart = (data: any) => {
      if (
        data.conversationId === conversationId &&
        extractId(data.userId) !== currentUserId
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
  }, [socket, workspaceId, conversationId, currentUserId, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = messageText.trim();
    if (!trimmed && attachments.length === 0) return;

    if (activeType === "dm" && !activeDmUserId) {
      toast({
        title: "No member selected",
        description: "Please select a team member from the Direct Messages list to start chatting.",
        variant: "destructive",
      });
      return;
    }

    if (!conversationId) {
      toast({
        title: "No conversation selected",
        description: "Please select a channel or member to send your message.",
        variant: "destructive",
      });
      return;
    }

    const finalContent = trimmed || (attachments.length > 0 ? "Shared attachment" : "");

    sendMessage({
      workspaceId,
      data: {
        conversationId,
        content: finalContent,
        channel: activeType === "channel" ? activeChannel.toLowerCase() : undefined,
        recipientId: activeType === "dm" ? activeDmUserId : undefined,
        attachments: attachments.length > 0 ? attachments : undefined,
      },
    });

    if (socket && conversationId) {
      socket.emit("typing:stop", {
        workspaceId,
        conversationId,
        userId: currentUserId,
        userName: user?.name,
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);
    if (socket && conversationId) {
      if (e.target.value.length > 0) {
        socket.emit("typing:start", {
          workspaceId,
          conversationId,
          userId: currentUserId,
          userName: user?.name || "Colleague",
        });
      } else {
        socket.emit("typing:stop", {
          workspaceId,
          conversationId,
          userId: currentUserId,
          userName: user?.name,
        });
      }
    }
  };

  // Attachment upload handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 25MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachments((prev) => [
        ...prev,
        {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || "application/octet-stream",
          fileData: reader.result as string,
        },
      ]);
      toast({
        title: "Attachment added",
        description: `${file.name} ready to send.`,
        variant: "success",
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // Filter members for DM list (excludes current user so members never accidentally message themselves)
  const filteredMemberUsers = memberUsers.filter((item: any) => {
    if (item.user?._id === currentUserId) return false;
    const name = item.user?.name || "";
    const email = item.user?.email || "";
    const q = searchMember.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  const isPersonalNotes = activeType === "dm" && activeDmUserId === currentUserId;

  const activeTitle =
    activeType === "channel"
      ? `#${activeChannel}`
      : isPersonalNotes
      ? "Personal Notes"
      : activeDmUser
      ? activeDmUser.name
      : "Direct Message";

  const placeholderText =
    activeType === "channel"
      ? `Message #${activeChannel}...`
      : isPersonalNotes
      ? "Write a private note to yourself..."
      : activeDmUser
      ? `Message ${activeDmUser.name}...`
      : "Select a colleague to message...";

  return (
    <div className="w-full flex h-[calc(100vh-5rem)] rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* LEFT SIDEBAR matching Figure 9.10 */}
      <div className="w-64 md:w-72 border-r bg-muted/20 flex flex-col shrink-0">
        <div className="p-3 border-b space-y-2.5 bg-muted/30">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base tracking-tight flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" /> Messages
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                }`}
                title={isConnected ? "Socket connected" : "Socket disconnected"}
              />
              <span>{isConnected ? "Live" : "Offline"}</span>
            </div>
          </div>

          {/* Active Account Pill */}
          {user && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-background border text-xs shadow-2xs">
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarImage src={user.profilePicture || ""} />
                <AvatarFallback className="text-[9px] bg-primary/20 text-primary font-bold">
                  {getAvatarFallbackText(user.name || "U")}
                </AvatarFallback>
              </Avatar>
              <div className="truncate min-w-0 flex-1">
                <p className="font-semibold text-xs leading-none truncate text-foreground flex items-center gap-1">
                  <span className="truncate">{user.name}</span>
                  <span className="text-[10px] text-primary font-bold">(You)</span>
                </p>
                <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                  {user.email}
                </p>
              </div>
            </div>
          )}

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
                  activeType === "channel" &&
                  activeChannel.toLowerCase() === ch.name.toLowerCase();
                return (
                  <button
                    key={ch.name}
                    onClick={() => {
                      setActiveType("channel");
                      setActiveChannel(ch.name.toLowerCase());
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

          {/* RECENT DIRECT MESSAGES GROUP */}
          {recentConversations.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold text-muted-foreground uppercase px-2 mb-1.5 tracking-wider flex items-center justify-between">
                <span>Recent Chats</span>
                <Clock className="w-3 h-3 text-muted-foreground" />
              </h3>
              <div className="space-y-0.5">
                {recentConversations.map((c: any) => {
                  const partner = c.partner;
                  const partnerId = extractId(partner);
                  const isSelected = activeType === "dm" && activeDmUserId === partnerId;
                  const initials = getAvatarFallbackText(partner?.name || "U");
                  const color = getAvatarColor(partner?.name || "U");
                  const unread = c.unreadCount || unreadCounts[partnerId] || 0;

                  return (
                    <button
                      key={c.conversationId}
                      onClick={() => {
                        setActiveType("dm");
                        setActiveDmUser(partner);
                        setUnreadCounts((prev) => ({ ...prev, [partnerId]: 0 }));
                        markAsRead({
                          workspaceId,
                          conversationId: c.conversationId,
                        });
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "hover:bg-accent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={partner?.profilePicture || ""} />
                          <AvatarFallback className={`${color} text-[10px]`}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col text-left truncate min-w-0">
                          <span className="truncate font-medium text-foreground">
                            {partner?.name || "Colleague"}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                            {c.lastMessage?.content || "Message"}
                          </span>
                        </div>
                      </div>

                      {unread > 0 && !isSelected && (
                        <span className="ml-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shrink-0">
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ALL TEAM MEMBERS */}
          <div>
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase px-2 mb-1.5 tracking-wider">
              Team Members
            </h3>
            <div className="space-y-0.5">
              {filteredMemberUsers.length === 0 ? (
                <p className="text-[11px] text-muted-foreground px-2 py-1 italic">
                  No other members found
                </p>
              ) : (
                filteredMemberUsers.map((item: any) => {
                  const u = item.user;
                  const uId = u._id;
                  const isSelected = activeType === "dm" && activeDmUserId === uId;
                  const initials = getAvatarFallbackText(u.name || "U");
                  const color = getAvatarColor(u.name || "U");
                  const unread = unreadCounts[uId] || 0;

                  return (
                    <button
                      key={uId}
                      onClick={() => {
                        setActiveType("dm");
                        setActiveDmUser(u);
                        setUnreadCounts((prev) => ({ ...prev, [uId]: 0 }));
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "hover:bg-accent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate min-w-0">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={u.profilePicture || ""} />
                          <AvatarFallback className={`${color} text-[10px]`}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col text-left truncate min-w-0">
                          <span className="truncate font-medium">{u.name}</span>
                          <span className="text-[10px] text-muted-foreground truncate leading-tight">
                            {u.email}
                          </span>
                        </div>
                      </div>

                      {unread > 0 && !isSelected && (
                        <span className="ml-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center shrink-0">
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* PERSONAL NOTES SECTION */}
          <div className="pt-2 border-t">
            <h3 className="text-[11px] font-bold text-muted-foreground uppercase px-2 mb-1.5 tracking-wider">
              Self Notes
            </h3>
            <button
              onClick={() => {
                setActiveType("dm");
                setActiveDmUser({
                  _id: currentUserId,
                  name: `${user?.name || "You"} (Personal Notes)`,
                  email: user?.email || "",
                  profilePicture: user?.profilePicture || null,
                });
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isPersonalNotes
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="h-6 w-6 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="truncate font-semibold">Personal Notes</span>
                <span className="text-[10px] text-muted-foreground truncate">Private to you</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT CHAT AREA matching Figure 9.10 */}
      <div className="flex-1 flex flex-col h-full bg-background min-w-0">
        {/* Conversation Header */}
        <div className="h-12 border-b flex items-center px-4 justify-between shrink-0 bg-muted/10">
          <div className="flex items-center gap-2 truncate">
            {activeType === "channel" ? (
              <>
                <Hash className="w-4 h-4 text-primary shrink-0" />
                <span className="font-semibold text-sm truncate">#{activeChannel}</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  • Workspace Channel
                </span>
              </>
            ) : activeDmUser ? (
              <>
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={activeDmUser?.profilePicture || ""} />
                  <AvatarFallback className="text-[10px]">
                    {getAvatarFallbackText(activeDmUser?.name || "U")}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold text-sm truncate">{activeTitle}</span>
                {activeDmUser.email && (
                  <span className="text-[11px] text-muted-foreground font-normal">
                    ({activeDmUser.email})
                  </span>
                )}
                {activeDmUserId === currentUserId && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                    Personal Notes
                  </span>
                )}
              </>
            ) : (
              <span className="font-medium text-sm text-muted-foreground">
                Select a team member to start chatting
              </span>
            )}
          </div>
        </div>

        {/* Message History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeType === "dm" && !activeDmUser ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-base">Select a Team Member</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Choose a colleague from the Direct Messages list on the left to start a private one-to-one conversation.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md pt-2">
                {memberUsers
                  .filter((m: any) => m.user._id !== currentUserId)
                  .slice(0, 4)
                  .map((m: any) => (
                    <Button
                      key={m.user._id}
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 h-8"
                      onClick={() => {
                        setActiveType("dm");
                        setActiveDmUser(m.user);
                      }}
                    >
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={m.user.profilePicture || ""} />
                        <AvatarFallback className="text-[8px]">
                          {getAvatarFallbackText(m.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{m.user.name}</span>
                    </Button>
                  ))}
              </div>
            </div>
          ) : isLoadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <Loader className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
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
              const senderId = extractId(msg.senderId);
              const isMe = currentUserId ? senderId === currentUserId : false;
              const senderName = isMe
                ? "You"
                : (msg.senderId?.name || (activeType === "dm" ? activeDmUser?.name : null) || "Colleague");
              const initials = getAvatarFallbackText(isMe ? (user?.name || "You") : senderName);
              const color = getAvatarColor(isMe ? (user?.name || "You") : senderName);
              const avatarUrl = isMe ? (user?.profilePicture || "") : (msg.senderId?.profilePicture || "");

              return (
                <div
                  key={msg._id}
                  className={`flex items-start gap-2.5 max-w-[85%] ${
                    isMe ? "ml-auto flex-row-reverse" : ""
                  }`}
                >
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                    <AvatarImage src={avatarUrl} />
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
                      <span className={`font-semibold ${isMe ? "text-primary" : "text-foreground"}`}>
                        {senderName}
                      </span>
                      <span>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {!isMe && (activeType === "channel" || isPersonalNotes) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (msg.senderId) {
                              const partner = {
                                _id: extractId(msg.senderId),
                                name: msg.senderId.name || "Colleague",
                                email: msg.senderId.email || "",
                                profilePicture: msg.senderId.profilePicture || null,
                              };
                              setActiveType("dm");
                              setActiveDmUser(partner);
                            }
                          }}
                          className="text-[10px] text-primary hover:underline flex items-center gap-1 font-medium ml-1.5 cursor-pointer"
                          title="Direct message this colleague"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Reply in DM</span>
                        </button>
                      )}
                    </div>

                    <div
                      className={`p-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                        isMe
                          ? "bg-primary text-primary-foreground rounded-tr-none shadow-xs"
                          : "bg-muted text-foreground rounded-tl-none border shadow-2xs"
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
            {typingUsers.join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing...
          </div>
        )}

        {/* Selected Attachments Preview */}
        {attachments.length > 0 && (
          <div className="px-3 py-1.5 bg-muted/40 border-t flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1.5 bg-background border rounded px-2 py-1 text-xs"
              >
                <FileIcon className="w-3 h-3 text-muted-foreground" />
                <span className="truncate max-w-[150px]">{att.fileName}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="hover:text-destructive ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
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
            onClick={() => fileInputRef.current?.click()}
            className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0"
            title="Attach file (up to 25MB)"
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          <Input
            value={messageText}
            onChange={handleInputChange}
            placeholder={placeholderText}
            disabled={activeType === "dm" && !activeDmUser}
            className="h-10 text-sm bg-background"
          />

          <Button
            type="submit"
            size="icon"
            disabled={
              isSending ||
              (activeType === "dm" && !activeDmUser) ||
              (!messageText.trim() && attachments.length === 0)
            }
            className="h-9 w-9 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
