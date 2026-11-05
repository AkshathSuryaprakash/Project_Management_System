import { ChevronDown, Loader, MessageSquare, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getAvatarColor, getAvatarFallbackText } from "@/lib/helper";
import { useAuthContext } from "@/context/auth-provider";
import useWorkspaceId from "@/hooks/use-workspace-id";
import useGetWorkspaceMembers from "@/hooks/api/use-get-workspace-members";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { changeWorkspaceMemberRoleMutationFn } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Permissions } from "@/constant";
import { useNavigate } from "react-router-dom";

const AllMembers = () => {
  const { user, hasPermission } = useAuthContext();
  const navigate = useNavigate();

  const canChangeMemberRole = hasPermission(Permissions.CHANGE_MEMBER_ROLE);
  const canRemoveMember = hasPermission(Permissions.REMOVE_MEMBER);

  const queryClient = useQueryClient();
  const workspaceId = useWorkspaceId();

  const { data, isPending, isError } = useGetWorkspaceMembers(workspaceId);
  const rawMembers = data?.members || [];
  const roles = data?.roles || [];

  // Filter out any invalid / unpopulated records
  const members = rawMembers.filter((m: any) => m && m.userId);

  const { mutate, isPending: isLoading } = useMutation({
    mutationFn: changeWorkspaceMemberRoleMutationFn,
  });

  const handleSelect = (roleId: string, memberId: string) => {
    if (!roleId || !memberId) return;
    const payload = {
      workspaceId,
      data: {
        roleId,
        memberId,
      },
    };
    mutate(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ["members", workspaceId],
        });
        toast({
          title: "Success",
          description: "Member's role changed successfully",
          variant: "success",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.response?.data?.message || error.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="grid gap-4 pt-2">
      {isPending && (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="text-center text-sm text-destructive py-4">
          Failed to load workspace members. Please try refreshing.
        </div>
      )}

      {!isPending && members.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-6">
          No members found in this workspace.
        </div>
      )}

      {members.map((member: any) => {
        const u = member.userId;
        const uId = (u?._id || u)?.toString();
        const currentUserId = user?._id?.toString();
        const name = u?.name || "Member";
        const email = u?.email || "";
        const isSelf = !!(uId && currentUserId && uId === currentUserId);
        const initials = getAvatarFallbackText(name);
        const avatarColor = getAvatarColor(name);
        const roleName = member.role?.name || "MEMBER";
        const isTargetOwner = roleName.toUpperCase() === "OWNER";
        const canEditThisRole = canChangeMemberRole && !isSelf && !isTargetOwner;

        return (
          <div
            key={member._id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/20 transition-colors"
          >
            <div className="flex items-center space-x-3 min-w-0">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={u?.profilePicture || ""} alt={name} />
                <AvatarFallback className={avatarColor}>{initials}</AvatarFallback>
              </Avatar>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold truncate leading-none">
                    {name}
                  </p>
                  {isSelf && (
                    <span className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">
                      You
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {email}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Joined {new Date(member.joinedAt || member.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Message button matching Figure 9.13 */}
              {!isSelf && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={() =>
                    navigate(`/workspace/${workspaceId}/messages?dm=${uId}`)
                  }
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Message</span>
                </Button>
              )}

              {/* Role selector matching Figure 9.13: Only Owner can change member roles, Owner role cannot be changed */}
              {canEditThisRole ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-w-24 capitalize text-xs h-8 justify-between"
                      disabled={isLoading}
                    >
                      <span>{roleName.toLowerCase()}</span>
                      <ChevronDown className="ml-1 h-3 w-3 text-muted-foreground shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0" align="end">
                    <Command>
                      <CommandInput
                        placeholder="Select new role..."
                        disabled={isLoading}
                        className="disabled:pointer-events-none text-xs"
                      />
                      <CommandList>
                        {isLoading ? (
                          <Loader className="w-6 h-6 animate-spin place-self-center flex my-4" />
                        ) : (
                          <>
                            <CommandEmpty>No roles found.</CommandEmpty>
                            <CommandGroup>
                              {roles?.map(
                                (r: any) =>
                                  r.name !== "OWNER" && (
                                    <CommandItem
                                      key={r._id}
                                      disabled={isLoading}
                                      className="gap-1 mb-1 flex flex-col items-start px-3 py-2 cursor-pointer text-xs"
                                      onSelect={() => {
                                        handleSelect(r._id, u?._id);
                                      }}
                                    >
                                      <p className="capitalize font-semibold">
                                        {r.name?.toLowerCase()}
                                      </p>
                                      <p className="text-[11px] text-muted-foreground">
                                        {r.name === "ADMIN" &&
                                          "Project and task allocation rights"}
                                        {r.name === "MEMBER" &&
                                          "View tasks and manage own assigned tasks"}
                                      </p>
                                    </CommandItem>
                                  )
                              )}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="min-w-24 capitalize text-xs h-8 cursor-default opacity-85"
                  disabled={true}
                  title={
                    isTargetOwner
                      ? "Workspace owner position is fixed and cannot be changed"
                      : "Only the workspace owner has permission to change member roles"
                  }
                >
                  <span>{roleName.toLowerCase()}</span>
                </Button>
              )}

              {/* Remove member button matching Figure 9.13 */}
              {canRemoveMember && !isSelf && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  title="Remove member"
                  onClick={() => {
                    toast({
                      title: "Action not permitted",
                      description: "To remove members, workspace settings are used.",
                    });
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AllMembers;
