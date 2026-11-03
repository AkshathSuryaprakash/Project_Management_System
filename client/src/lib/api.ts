import API from "./axios-client";
import {
  AllMembersInWorkspaceResponseType,
  AllProjectPayloadType,
  AllProjectResponseType,
  AllTaskPayloadType,
  AllTaskResponseType,
  AnalyticsResponseType,
  ChangeWorkspaceMemberRoleType,
  CreateProjectPayloadType,
  CreateTaskPayloadType,
  EditTaskPayloadType,
  CreateWorkspaceResponseType,
  EditProjectPayloadType,
  ProjectByIdPayloadType,
  ProjectResponseType,
} from "../types/api.type";
import {
  AllWorkspaceResponseType,
  CreateWorkspaceType,
  CurrentUserResponseType,
  LoginResponseType,
  loginType,
  registerType,
  WorkspaceByIdResponseType,
  EditWorkspaceType,
} from "@/types/api.type";

export const loginMutationFn = async (
  data: loginType
): Promise<LoginResponseType> => {
  const response = await API.post("/auth/login", data);
  return response.data;
};

export const registerMutationFn = async (data: registerType) =>
  await API.post("/auth/register", data);

export const logoutMutationFn = async () => await API.post("/auth/logout");

export const getCurrentUserQueryFn =
  async (): Promise<CurrentUserResponseType> => {
    const response = await API.get(`/user/current`);
    return response.data;
  };

//********* WORKSPACE ****************
//************* */

export const createWorkspaceMutationFn = async (
  data: CreateWorkspaceType
): Promise<CreateWorkspaceResponseType> => {
  const response = await API.post(`/workspace/create/new`, data);
  return response.data;
};

export const editWorkspaceMutationFn = async ({
  workspaceId,
  data,
}: EditWorkspaceType) => {
  const response = await API.put(`/workspace/update/${workspaceId}`, data);
  return response.data;
};

export const getAllWorkspacesUserIsMemberQueryFn =
  async (): Promise<AllWorkspaceResponseType> => {
    const response = await API.get(`/workspace/all`);
    return response.data;
  };

export const getWorkspaceByIdQueryFn = async (
  workspaceId: string
): Promise<WorkspaceByIdResponseType> => {
  const response = await API.get(`/workspace/${workspaceId}`);
  return response.data;
};

export const getMembersInWorkspaceQueryFn = async (
  workspaceId: string
): Promise<AllMembersInWorkspaceResponseType> => {
  const response = await API.get(`/workspace/members/${workspaceId}`);
  return response.data;
};

export const getWorkspaceAnalyticsQueryFn = async (
  workspaceId: string
): Promise<AnalyticsResponseType> => {
  const response = await API.get(`/workspace/analytics/${workspaceId}`);
  return response.data;
};

export const changeWorkspaceMemberRoleMutationFn = async ({
  workspaceId,
  data,
}: ChangeWorkspaceMemberRoleType) => {
  const response = await API.put(
    `/workspace/change/member/role/${workspaceId}`,
    data
  );
  return response.data;
};

export const deleteWorkspaceMutationFn = async (
  workspaceId: string
): Promise<{
  message: string;
  currentWorkspace: string;
}> => {
  const response = await API.delete(`/workspace/delete/${workspaceId}`);
  return response.data;
};

//*******MEMBER ****************

export const invitedUserJoinWorkspaceMutationFn = async (
  iniviteCode: string
): Promise<{
  message: string;
  workspaceId: string;
}> => {
  const response = await API.post(`/member/workspace/${iniviteCode}/join`);
  return response.data;
};

//********* */
//********* PROJECTS
export const createProjectMutationFn = async ({
  workspaceId,
  data,
}: CreateProjectPayloadType): Promise<ProjectResponseType> => {
  const response = await API.post(
    `/project/workspace/${workspaceId}/create`,
    data
  );
  return response.data;
};

export const editProjectMutationFn = async ({
  projectId,
  workspaceId,
  data,
}: EditProjectPayloadType): Promise<ProjectResponseType> => {
  const response = await API.put(
    `/project/${projectId}/workspace/${workspaceId}/update`,
    data
  );
  return response.data;
};

export const getProjectsInWorkspaceQueryFn = async ({
  workspaceId,
  pageSize = 10,
  pageNumber = 1,
}: AllProjectPayloadType): Promise<AllProjectResponseType> => {
  const response = await API.get(
    `/project/workspace/${workspaceId}/all?pageSize=${pageSize}&pageNumber=${pageNumber}`
  );
  return response.data;
};

export const getProjectByIdQueryFn = async ({
  workspaceId,
  projectId,
}: ProjectByIdPayloadType): Promise<ProjectResponseType> => {
  const response = await API.get(
    `/project/${projectId}/workspace/${workspaceId}`
  );
  return response.data;
};

export const getProjectAnalyticsQueryFn = async ({
  workspaceId,
  projectId,
}: ProjectByIdPayloadType): Promise<AnalyticsResponseType> => {
  const response = await API.get(
    `/project/${projectId}/workspace/${workspaceId}/analytics`
  );
  return response.data;
};

export const deleteProjectMutationFn = async ({
  workspaceId,
  projectId,
}: ProjectByIdPayloadType): Promise<{
  message: string;
}> => {
  const response = await API.delete(
    `/project/${projectId}/workspace/${workspaceId}/delete`
  );
  return response.data;
};

//*******TASKS ********************************
//************************* */

export const createTaskMutationFn = async ({
  workspaceId,
  projectId,
  data,
}: CreateTaskPayloadType) => {
  const response = await API.post(
    `/task/project/${projectId}/workspace/${workspaceId}/create`,
    data
  );
  return response.data;
};


export const editTaskMutationFn = async ({
  taskId,
  projectId,
  workspaceId,
  data,
}: EditTaskPayloadType): Promise<{ message: string; task?: any }> => {
  const response = await API.put(
    `/task/${taskId}/project/${projectId}/workspace/${workspaceId}/update`,
    data
  );
  return response.data;
};

export const getAllTasksQueryFn = async ({
  workspaceId,
  keyword,
  projectId,
  assignedTo,
  priority,
  status,
  dueDate,
  pageNumber,
  pageSize,
}: AllTaskPayloadType): Promise<AllTaskResponseType> => {
  const baseUrl = `/task/workspace/${workspaceId}/all`;

  const queryParams = new URLSearchParams();
  if (keyword) queryParams.append("keyword", keyword);
  if (projectId) queryParams.append("projectId", projectId);
  if (assignedTo) queryParams.append("assignedTo", assignedTo);
  if (priority) queryParams.append("priority", priority);
  if (status) queryParams.append("status", status);
  if (dueDate) queryParams.append("dueDate", dueDate);
  if (pageNumber) queryParams.append("pageNumber", pageNumber?.toString());
  if (pageSize) queryParams.append("pageSize", pageSize?.toString());

  const url = queryParams.toString() ? `${baseUrl}?${queryParams}` : baseUrl;
  const response = await API.get(url);
  return response.data;
};

export const deleteTaskMutationFn = async ({
  workspaceId,
  taskId,
}: {
  workspaceId: string;
  taskId: string;
}): Promise<{
  message: string;
}> => {
  const response = await API.delete(
    `/task/${taskId}/workspace/${workspaceId}/delete`
  );
  return response.data;
};

// Reset Workspace Invite Code
export const resetWorkspaceInviteCodeMutationFn = async (
  workspaceId: string
): Promise<{ message: string; inviteCode: string }> => {
  const response = await API.post(`/workspace/reset/invite-code/${workspaceId}`);
  return response.data;
};

// Comments
export const getCommentsQueryFn = async (
  workspaceId: string,
  taskId: string
) => {
  const response = await API.get(
    `/workspace/${workspaceId}/comments/task/${taskId}`
  );
  return response.data;
};

export const createCommentMutationFn = async ({
  workspaceId,
  taskId,
  content,
}: {
  workspaceId: string;
  taskId: string;
  content: string;
}) => {
  const response = await API.post(
    `/workspace/${workspaceId}/comments/task/${taskId}`,
    { content }
  );
  return response.data;
};

export const deleteCommentMutationFn = async ({
  workspaceId,
  commentId,
}: {
  workspaceId: string;
  commentId: string;
}) => {
  const response = await API.delete(
    `/workspace/${workspaceId}/comments/${commentId}`
  );
  return response.data;
};

// Attachments
export const getAttachmentsQueryFn = async (
  workspaceId: string,
  taskId: string
) => {
  const response = await API.get(
    `/workspace/${workspaceId}/attachments/task/${taskId}`
  );
  return response.data;
};

export const createAttachmentMutationFn = async ({
  workspaceId,
  taskId,
  data,
}: {
  workspaceId: string;
  taskId: string;
  data: {
    fileName: string;
    fileSize: number;
    fileType: string;
    fileData: string;
  };
}) => {
  const response = await API.post(
    `/workspace/${workspaceId}/attachments/task/${taskId}`,
    data
  );
  return response.data;
};

export const deleteAttachmentMutationFn = async ({
  workspaceId,
  attachmentId,
}: {
  workspaceId: string;
  attachmentId: string;
}) => {
  const response = await API.delete(
    `/workspace/${workspaceId}/attachments/${attachmentId}`
  );
  return response.data;
};

// Messaging
export const getChannelsQueryFn = async (workspaceId: string) => {
  const response = await API.get(`/workspace/${workspaceId}/messages/channels`);
  return response.data;
};

export const getConversationMessagesQueryFn = async (
  workspaceId: string,
  conversationId: string
) => {
  const response = await API.get(
    `/workspace/${workspaceId}/messages/conversations/${conversationId}`
  );
  return response.data;
};

export const sendMessageMutationFn = async ({
  workspaceId,
  data,
}: {
  workspaceId: string;
  data: {
    conversationId?: string;
    channel?: string;
    recipientId?: string;
    content: string;
    attachments?: Array<{
      fileName: string;
      fileSize: number;
      fileType: string;
      fileData: string;
    }>;
    taskRef?: string;
  };
}) => {
  const response = await API.post(
    `/workspace/${workspaceId}/messages/send`,
    data
  );
  return response.data;
};

export const markMessagesAsReadMutationFn = async ({
  workspaceId,
  conversationId,
}: {
  workspaceId: string;
  conversationId: string;
}) => {
  const response = await API.put(`/workspace/${workspaceId}/messages/read`, {
    conversationId,
  });
  return response.data;
};

// Notifications
export const getNotificationsQueryFn = async (workspaceId: string) => {
  const response = await API.get(`/workspace/${workspaceId}/notifications`);
  return response.data;
};

export const markNotificationReadMutationFn = async ({
  workspaceId,
  id,
}: {
  workspaceId: string;
  id: string;
}) => {
  const response = await API.patch(
    `/workspace/${workspaceId}/notifications/${id}/read`
  );
  return response.data;
};

export const markAllNotificationsReadMutationFn = async (
  workspaceId: string
) => {
  const response = await API.patch(
    `/workspace/${workspaceId}/notifications/read-all`
  );
  return response.data;
};

// Activity Log
export const getActivityLogsQueryFn = async (
  workspaceId: string,
  limit: number = 50
) => {
  const response = await API.get(
    `/workspace/${workspaceId}/activity?limit=${limit}`
  );
  return response.data;
};

// Reports
export const getReportsQueryFn = async (workspaceId: string) => {
  const response = await API.get(`/workspace/${workspaceId}/reports`);
  return response.data;
};

export const exportReportsCsvQueryFn = async (workspaceId: string) => {
  const response = await API.get(`/workspace/${workspaceId}/reports/export`, {
    responseType: "blob",
  });
  return response.data;
};

// Search
export const searchWorkspaceQueryFn = async (
  workspaceId: string,
  query: string
) => {
  const response = await API.get(
    `/workspace/${workspaceId}/search?query=${encodeURIComponent(query)}`
  );
  return response.data;
};

// ==========================================
// WORKSPACE MEMBERS WORKLOAD (ADMIN ONLY)
// ==========================================

export const getWorkspaceMembersWorkloadQueryFn = async (
  workspaceId: string
) => {
  const response = await API.get(`/workspace/${workspaceId}/members/workload`);
  return response.data;
};

// ==========================================
// TASK DEPENDENCIES APIs
// ==========================================

export const getTaskDependenciesQueryFn = async (
  workspaceId: string,
  taskId: string
) => {
  const response = await API.get(
    `/task/${taskId}/dependencies?workspaceId=${workspaceId}`
  );
  return response.data;
};

export const addTaskDependencyMutationFn = async ({
  workspaceId,
  taskId,
  dependencyTaskId,
}: {
  workspaceId: string;
  taskId: string;
  dependencyTaskId: string;
}) => {
  const response = await API.post(`/task/${taskId}/dependencies`, {
    workspaceId,
    dependencyTaskId,
  });
  return response.data;
};

export const removeTaskDependencyMutationFn = async ({
  workspaceId,
  taskId,
  dependencyId,
}: {
  workspaceId: string;
  taskId: string;
  dependencyId: string;
}) => {
  const response = await API.delete(
    `/task/${taskId}/dependencies/${dependencyId}?workspaceId=${workspaceId}`
  );
  return response.data;
};

