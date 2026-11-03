import { Separator } from "@/components/ui/separator";
import InviteMember from "@/components/workspace/member/invite-member";
import AllMembers from "@/components/workspace/member/all-members";
import WorkspaceHeader from "@/components/workspace/common/workspace-header";
import MemberWorkloadDashboard from "@/components/workspace/member/member-workload-dashboard";
import { useAuthContext } from "@/context/auth-provider";
import { Permissions } from "@/constant";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users } from "lucide-react";

export default function Members() {
  const { user, workspace, hasPermission } = useAuthContext();

  const currentMember = workspace?.members?.find(
    (m: any) =>
      (m.userId?._id || m.userId)?.toString() === user?._id?.toString()
  );

  const isAdminOrOwner =
    currentMember?.role?.name === "OWNER" ||
    currentMember?.role?.name === "ADMIN" ||
    hasPermission(Permissions.CHANGE_MEMBER_ROLE) ||
    hasPermission(Permissions.MANAGE_WORKSPACE_SETTINGS);

  return (
    <div className="w-full h-auto pt-2">
      <WorkspaceHeader />
      <Separator className="my-4" />
      <main className="w-full max-w-5xl mx-auto pt-2 pb-12 px-2 sm:px-4">
        <div className="mb-4">
          <h2 className="text-xl font-bold tracking-tight">Workspace Members</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage workspace members, role permissions, and view team task distribution.
          </p>
        </div>

        {isAdminOrOwner ? (
          <Tabs defaultValue="workload" className="w-full space-y-4">
            <TabsList className="grid w-full sm:w-[420px] grid-cols-2">
              <TabsTrigger value="workload" className="text-xs gap-1.5 font-medium">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                <span>Team Workload (Admin)</span>
              </TabsTrigger>
              <TabsTrigger value="directory" className="text-xs gap-1.5 font-medium">
                <Users className="w-3.5 h-3.5" />
                <span>Member Directory</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="workload" className="space-y-4 focus-visible:outline-hidden">
              <MemberWorkloadDashboard />
            </TabsContent>

            <TabsContent value="directory" className="space-y-4 focus-visible:outline-hidden">
              <InviteMember />
              <Separator className="my-4 !h-[0.5px]" />
              <AllMembers />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <AllMembers />
          </div>
        )}
      </main>
    </div>
  );
}