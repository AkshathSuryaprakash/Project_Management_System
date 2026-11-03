export const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Multi-Tenant Collaborative Workspace & Project Management API",
    version: "1.0.0",
    description:
      "REST API for the Multi-Tenant Collaborative Workspace and Project Management SaaS Platform. Includes full RBAC, multi-tenancy, real-time messaging, task management, analytics, and reporting.",
  },
  servers: [
    {
      url: "http://localhost:8000/api",
      description: "Development Server",
    },
  ],
  paths: {
    "/auth/register": {
      post: {
        summary: "Register a new user",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "John Doe" },
                  email: { type: "string", example: "john@example.com" },
                  password: { type: "string", example: "Password123!" },
                },
                required: ["name", "email", "password"],
              },
            },
          },
        },
        responses: {
          201: { description: "User registered successfully" },
          400: { description: "Validation error or email already exists" },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "Sign in with email and password",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", example: "akshathdeepa1978@gmail.com" },
                  password: { type: "string", example: "password123" },
                },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: {
          200: { description: "Signed in successfully" },
          401: { description: "Invalid credentials" },
        },
      },
    },
    "/auth/logout": {
      post: {
        summary: "Sign out current session",
        tags: ["Authentication"],
        responses: {
          200: { description: "Logged out" },
        },
      },
    },
    "/user/current": {
      get: {
        summary: "Get current user profile and active workspace",
        tags: ["User"],
        responses: {
          200: { description: "Profile retrieved" },
          401: { description: "Unauthenticated" },
        },
      },
    },
    "/workspace/create/new": {
      post: {
        summary: "Create a new workspace",
        tags: ["Workspace"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", example: "Acme Team Workspace" },
                  description: { type: "string", example: "Main workspace" },
                },
                required: ["name"],
              },
            },
          },
        },
        responses: {
          201: { description: "Workspace created" },
        },
      },
    },
    "/workspace/all": {
      get: {
        summary: "List all workspaces the authenticated user belongs to",
        tags: ["Workspace"],
        responses: {
          200: { description: "List of workspaces" },
        },
      },
    },
    "/workspace/{id}": {
      get: {
        summary: "Get workspace details by ID",
        tags: ["Workspace"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Workspace details" } },
      },
    },
    "/workspace/members/{id}": {
      get: {
        summary: "List all members of a workspace",
        tags: ["Workspace"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "List of members" } },
      },
    },
    "/workspace/reset/invite-code/{id}": {
      post: {
        summary: "Reset workspace invite code (Owner/Admin only)",
        tags: ["Workspace"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Invite code regenerated" } },
      },
    },
    "/task/workspace/{workspaceId}/all": {
      get: {
        summary: "Get all tasks with filtering, sorting, and pagination",
        tags: ["Tasks"],
        parameters: [
          { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
          { name: "projectId", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "priority", in: "query", schema: { type: "string" } },
          { name: "assignedTo", in: "query", schema: { type: "string" } },
          { name: "keyword", in: "query", schema: { type: "string" } },
          { name: "pageSize", in: "query", schema: { type: "integer" } },
          { name: "pageNumber", in: "query", schema: { type: "integer" } },
        ],
        responses: { 200: { description: "List of tasks" } },
      },
    },
    "/task/project/{projectId}/workspace/{workspaceId}/create": {
      post: {
        summary: "Create a task (Members can only self-assign)",
        tags: ["Tasks"],
        parameters: [
          { name: "projectId", in: "path", required: true, schema: { type: "string" } },
          { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Task created" }, 403: { description: "Forbidden" } },
      },
    },
    "/workspace/{workspaceId}/messages/conversations/{conversationId}": {
      get: {
        summary: "Get conversation message history",
        tags: ["Messaging"],
        parameters: [
          { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
          { name: "conversationId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Message history" } },
      },
    },
    "/workspace/{workspaceId}/messages/send": {
      post: {
        summary: "Send a message in channel or direct message",
        tags: ["Messaging"],
        parameters: [
          { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 201: { description: "Message sent" } },
      },
    },
    "/workspace/{workspaceId}/analytics": {
      get: {
        summary: "Get workspace analytics and KPIs",
        tags: ["Analytics"],
        parameters: [
          { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Analytics metrics" } },
      },
    },
    "/workspace/{workspaceId}/reports": {
      get: {
        summary: "Get workspace reports and summaries",
        tags: ["Reports"],
        parameters: [
          { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Reports data" } },
      },
    },
    "/workspace/{workspaceId}/reports/export": {
      get: {
        summary: "Export tasks as CSV",
        tags: ["Reports"],
        parameters: [
          { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "CSV file content" } },
      },
    },
    "/workspace/{workspaceId}/search": {
      get: {
        summary: "Global search across projects, tasks, members, and comments",
        tags: ["Search"],
        parameters: [
          { name: "workspaceId", in: "path", required: true, schema: { type: "string" } },
          { name: "query", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: { 200: { description: "Search results" } },
      },
    },
  },
};

