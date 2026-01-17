# Multi-Tenant Project Management SaaS Application

A full-stack project management application built with React, TypeScript, Express, and MongoDB. This application enables teams to collaborate on projects with workspace management, task tracking, and role-based access control.

## Features

- **Authentication**: Local authentication and Google OAuth integration
- **Workspace Management**: Create and manage multiple workspaces
- **Project Management**: Organize work into projects within workspaces
- **Task Tracking**: Create, assign, and track tasks with various statuses and priorities
- **Role-Based Access Control (RBAC)**: Manage team permissions with Owner, Admin, and Member roles
- **Team Collaboration**: Invite and manage team members via invite codes
- **Analytics Dashboard**: View workspace and project analytics

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.x | UI library |
| TypeScript | 5.6.x | Type-safe JavaScript |
| Vite | 6.x | Build tool |
| Tailwind CSS | 3.4.x | Utility-first CSS |
| Radix UI | Various | Accessible components |
| TanStack Query | 5.x | Server state management |
| TanStack Table | - | Data tables |
| React Hook Form | 7.x | Form handling |
| Zod | 3.x | Schema validation |
| Axios | 1.7.x | HTTP client |
| Zustand | 4.x | Client state management |
| React Router | 7.x | Client-side routing |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18.x LTS | JavaScript runtime |
| Express.js | 4.x | Web framework |
| TypeScript | 5.6.x | Type-safe JavaScript |
| MongoDB | 7.x | NoSQL database |
| Mongoose | 8.x | MongoDB ODM |
| Passport.js | 0.5.x | Authentication middleware |
| Zod | 3.x | Schema validation |
| bcrypt | 5.x | Password hashing |

## Prerequisites

| Software | Version |
|----------|---------|
| Node.js | 18.x LTS or higher |
| npm | 9.x or higher |
| MongoDB | 7.x |
| Git | 2.x |

## Project Structure

```
project_management_saas/
├── backend/
│   └── src/
│       ├── @types/          # TypeScript type definitions
│       ├── config/          # Configuration files
│       │   ├── app.config.ts
│       │   ├── database.config.ts
│       │   ├── http.config.ts
│       │   └── passport.config.ts
│       ├── controllers/     # Request handlers
│       ├── enums/           # Enumeration types
│       ├── middlewares/     # Express middlewares
│       ├── models/          # MongoDB models
│       ├── routes/          # API routes
│       ├── seeders/         # Database seeders
│       ├── services/        # Business logic
│       ├── utils/           # Utility functions
│       └── validation/      # Request validation schemas
├── client/
│   └── src/
│       ├── components/      # React components
│       │   ├── ui/          # Reusable UI components
│       │   ├── workspace/   # Workspace-related components
│       │   └── resuable/    # Shared components
│       ├── context/         # React context providers
│       ├── hooks/           # Custom React hooks
│       ├── lib/             # Utilities and API
│       ├── page/            # Page components
│       └── types/           # TypeScript type definitions
```

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd project_management_saas
   ```

2. **Install all dependencies**

   ```bash
   npm run install-all
   ```

3. **Configure environment variables**

   **Backend** - Create `backend/.env` from the example:

   ```bash
   cp backend/.env.example backend/.env
   ```

   **Client** - Create `client/.env` from the example:

   ```bash
   cp client/.env.example client/.env
   ```

4. **Seed the database** (required for initial roles)

   ```bash
   cd backend
   npm run seed
   ```

## Running the Application

Run both frontend and backend concurrently from the root directory:

```bash
npm run dev
```

## License

ISC
