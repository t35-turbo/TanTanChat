# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TanTan Chat is a modern AI chat application with real-time synchronization, file uploads, and multiplayer capabilities. The architecture consists of:

- **Backend**: Bun runtime with Hono server, tRPC API, PostgreSQL database via Drizzle ORM
- **Frontend**: React with TanStack Router, TanStack Query, Vite bundler
- **Authentication**: Better Auth with email/password and role-based access
- **Database**: PostgreSQL with Drizzle ORM for schema management
- **Real-time**: WebSocket connections for live chat sync
- **File Storage**: Local file system with planned S3 support

## Development Commands

### Backend (Server)
```bash
# Start development server (with hot reload)
bun run dev

# Database operations
bunx drizzle-kit generate    # Generate migrations
bunx drizzle-kit migrate     # Run migrations
bunx drizzle-kit studio     # Open database studio
```

### Frontend (Client)
```bash
cd client
npm run dev     # Start development server on port 3000
npm run build   # Build for production and run TypeScript checking
```

### Full Stack Development
```bash
# Terminal 1: Start backend
bun run dev

# Terminal 2: Start frontend
cd client && npm run dev

# Visit http://localhost:3000 (proxies to backend on 3001)
```

### Docker Development
```bash
docker compose up --build -d  # Start with Docker
# Visit port 3111
```

### Code Quality
```bash
# Backend formatting and linting (Biome)
bunx biome format --write .
bunx biome check --write .

# Client TypeScript checking
cd client && npm run build   # Includes TypeScript checking
```

## Architecture Overview

### Database Schema
- **Users**: Authentication with role-based permissions (`user`, `admin`)
- **Chats**: Chat conversations with message history
- **Files**: File uploads with metadata and ownership tracking
- **Settings**: User preferences and system configuration
- **Roles**: Configurable permission system for different user types

Key relationships:
- Users have roles that determine permissions (API keys, admin access)
- Chats belong to users and contain messages
- Files are owned by users and referenced in messages
- Settings store both user preferences and system configuration

### Authentication Flow
- Better Auth handles email/password authentication
- Role-based access control with `user` and `admin` roles
- Session management with cookie caching
- Protected routes use `authedRoute()` and `adminAuthedRoute()` guards
- tRPC procedures have `authProcedure` and `adminProcedure` middleware

### API Architecture
- **tRPC**: Type-safe API with routers for chats, files, settings, admin, users
- **Hono**: Web framework handling HTTP requests and middleware
- **WebSockets**: Real-time chat synchronization via `/api/chats/:id/ws`
- **File Upload**: Multipart form handling with local storage

### Frontend Structure
- **TanStack Router**: File-based routing with type safety
- **TanStack Query**: Server state management via tRPC
- **Shadcn/ui**: Component library with Radix UI primitives
- **Theme System**: Catppuccin themes with user preferences
- **WebSocket Client**: Real-time message synchronization

## Library Documentation and Context7 MCP

**IMPORTANT**: Before writing code that uses external libraries or frameworks, always use the Context7 MCP to check the latest documentation and best practices. This ensures you're using current APIs and following recommended patterns.

### Using Context7 MCP
```typescript
// 1. First resolve the library ID
context7_resolve-library-id({ libraryName: "react-query" })

// 2. Then get the documentation
context7_get-library-docs({
  context7CompatibleLibraryID: "/tanstack/query",
  topic: "mutations" // Optional: focus on specific topics
})
```

### When to Use Context7
- Adding new dependencies or libraries
- Implementing features with unfamiliar APIs
- Updating existing code to use newer library versions
- Following framework-specific best practices
- Checking for breaking changes or deprecated methods

This is especially important for:
- **TanStack Router** - Route definitions, loaders, search params
- **TanStack Query** - Query keys, mutations, optimistic updates
- **Drizzle ORM** - Schema definitions, query builders, migrations
- **Better Auth** - Plugin development, session management
- **Hono** - Middleware, context handling, WebSocket integration
- **Shadcn/ui** - Component usage and customization

## Key Patterns

### tRPC Procedures
```typescript
// Server-side procedure definition
export const exampleRouter = router({
  getData: authProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      // ctx.user and ctx.session available
      return db.query.table.findFirst({ where: eq(table.id, input.id) });
    })
});

// Client-side usage
const { data } = trpc.example.getData.useQuery({ id: "123" });
```

### Route Protection
```typescript
// In route files
beforeLoad: authedRoute,        // Requires authentication
beforeLoad: adminAuthedRoute,   // Requires admin role
```

### Database Queries
```typescript
// Use Drizzle ORM with prepared statements when possible
const result = await db.select().from(table).where(eq(table.column, value));
```

### WebSocket Integration
- Chat synchronization uses JSON-RPC 2.0 protocol
- Subscribe to chat events: `{ method: "subscribe", params: { chatId } }`
- Real-time message streaming during AI responses

## File Organization

### Backend (`src/`)
- `index.ts` - Main Hono server with WebSocket setup
- `trpc.ts` - tRPC configuration and middleware
- `db/` - Database schema and connection
- `lib/auth.ts` - Better Auth configuration
- `{feature}.ts` - Feature-specific tRPC routers (chats, files, etc.)

### Frontend (`client/src/`)
- `routes/` - TanStack Router file-based routing
- `components/` - React components (UI components in `ui/`)
- `lib/` - Utilities, tRPC client, auth client
- `hooks/` - Custom React hooks

## Environment Setup

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - For AI chat functionality
- `USE_S3` - Enable S3 file storage (optional)

## Deployment Notes

- Production uses Kubernetes (manifests in separate GitOps repo)
- Docker Compose for local development
- Static files served from `client/dist/` via Hono
- SPA routing handled by serving `index.html` for non-API routes

# Custom Admin Plugin Usage

Your custom Better-Auth admin plugin is now fully implemented with comprehensive user management capabilities!

## 🚀 Client-Side Usage

### Import the auth client
```typescript
import { authClient } from "@/lib/auth-client";
```

### Session Management
```typescript
// Revoke sessions for a specific user
const handleRevokeUserSessions = async (userId: string) => {
  try {
    const result = await authClient.admin.revokeAllSessions({ userId });
    console.log(result.message); // "Revoked 3 sessions for user user123"
  } catch (error) {
    console.error("Failed to revoke sessions:", error);
  }
};

// Nuclear option - Revoke ALL sessions in the system
const handleRevokeAllSessions = async () => {
  try {
    const result = await authClient.admin.revokeAllSessions({});
    console.log(result.message); // "Revoked all 25 sessions in the system"
  } catch (error) {
    console.error("Failed to revoke all sessions:", error);
  }
};
```

### User Profile Management
```typescript
// Update user's name
const updateUserName = async (userId: string, name: string) => {
  try {
    const result = await authClient.admin.updateUserName({ userId, name });
    console.log("Name updated successfully");
  } catch (error) {
    console.error("Failed to update name:", error);
  }
};

// Update user's email
const updateUserEmail = async (userId: string, email: string) => {
  try {
    const result = await authClient.admin.updateUserEmail({ userId, email });
    console.log("Email updated successfully");
  } catch (error) {
    console.error("Failed to update email:", error);
  }
};

// Set user's password (admin doesn't need current password)
const setUserPassword = async (userId: string, newPassword: string) => {
  try {
    const result = await authClient.admin.setUserPassword({ userId, newPassword });
    console.log("Password updated and sessions revoked");
  } catch (error) {
    console.error("Failed to update password:", error);
  }
};

// Generate password reset link for user
const generatePasswordResetLink = async (userId: string) => {
  try {
    const result = await authClient.admin.generatePasswordResetLink({
      userId,
      sendEmail: false
    });
    console.log("Reset link:", result.resetLink);
    // Copy to clipboard or share with user
  } catch (error) {
    console.error("Failed to generate reset link:", error);
  }
};

// Delete user account
const removeUser = async (userId: string) => {
  try {
    const result = await authClient.admin.removeUser({ userId });
    console.log("User account deleted successfully");
  } catch (error) {
    console.error("Failed to delete user:", error);
  }
};
```

### React Query Integration Example
```tsx
import { authClient } from "@/lib/auth-client";
import { useMutation } from "@tanstack/react-query";

export function AdminUserManager({ userId }: { userId: string }) {
  // Update user name with React Query
  const updateNameMut = useMutation({
    mutationFn: async (name: string) => {
      const result = await authClient.admin.updateUserName({ userId, name });
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result;
    },
    onSuccess: () => {
      console.log("Name updated successfully");
      // Refetch user data or invalidate queries
    },
  });

  // Delete user account with React Query
  const deleteUserMut = useMutation({
    mutationFn: async () => {
      const result = await authClient.admin.removeUser({ userId });
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result;
    },
    onSuccess: () => {
      console.log("User deleted successfully");
      // Navigate away or refresh user list
    },
  });

  return (
    <div>
      <button
        onClick={() => updateNameMut.mutate("New Name")}
        disabled={updateNameMut.isPending}
      >
        {updateNameMut.isPending ? "Updating..." : "Update Name"}
      </button>

      <button
        onClick={() => deleteUserMut.mutate()}
        disabled={deleteUserMut.isPending}
        className="bg-red-500 text-white"
      >
        {deleteUserMut.isPending ? "Deleting..." : "Delete User"}
      </button>

      {updateNameMut.error && (
        <p className="text-red-600">{updateNameMut.error.message}</p>
      )}
    </div>
  );
}
```

## 🔧 Server-Side Usage

### Direct API usage
```typescript
import { auth } from "@/lib/auth";

// Revoke sessions for specific user
const result = await auth.api.revokeAllSessions({
  body: { userId: "user123" }
});

// Nuclear option - revoke ALL sessions
const result = await auth.api.revokeAllSessions({
  body: {}
});
```

### tRPC Integration (existing)
Your existing tRPC admin router still works and now uses the plugin internally:

```typescript
// This now uses the plugin under the hood
await trpc.admin.users.revokeAllSessions.mutate("user123");
```

## 🔐 Admin Route Protection

Your admin routes are now properly protected using your role system:

```typescript
// In your route files
export const Route = createFileRoute('/admin')({
  beforeLoad: adminAuthedRoute, // Now checks roles.is_admin instead of hardcoded "admin"
  component: AdminPage,
});
```

## 🎯 Key Features

- ✅ **Complete User Management** - Create, read, update, delete user accounts
- ✅ **Session Management** - Revoke sessions for specific users or all users
- ✅ **Profile Management** - Update names, emails, passwords
- ✅ **Role-based Admin Checking** - Uses your `roles.is_admin` field
- ✅ **Better-Auth Internal Adapter** - Database agnostic using Better-Auth's internal APIs
- ✅ **React Query Integration** - All components use proper mutation patterns
- ✅ **TypeScript Support** - Full type safety with auto-inferred client methods
- ✅ **Error Handling** - Structured error responses and proper validation
- ✅ **Security** - Admin self-protection and permission checking
- ✅ **Extensible** - Easy to add more admin endpoints

## 🔗 API Endpoints

### POST `/admin/revoke-all-sessions`
**Request:**
```json
{
  "userId": "user123" // Optional - omit to revoke ALL sessions
}
```

### POST `/admin/update-user-name`
**Request:**
```json
{
  "userId": "user123",
  "name": "New User Name"
}
```

### POST `/admin/update-user-email`
**Request:**
```json
{
  "userId": "user123",
  "email": "newemail@example.com"
}
```

### POST `/admin/set-user-password`
**Request:**
```json
{
  "userId": "user123",
  "newPassword": "newSecurePassword123"
}
```

### POST `/admin/remove-user`
**Request:**
```json
{
  "userId": "user123"
}
```

### POST `/admin/generate-password-reset-link`
**Request:**
```json
{
  "userId": "user123",
  "sendEmail": false
}
```

**Response:**
```json
{
  "success": true,
  "resetLink": "https://yourapp.com/reset-password?token=abc123",
  "message": "Reset link generated successfully"
}
```

**All other endpoints return:**
```json
{
  "success": true,
  "message": "Operation completed successfully"
}
```

## 🚨 Security Notes

- Only users with `roles.is_admin = true` can access admin endpoints
- The "nuclear option" (revoking ALL sessions) should be used with extreme caution
- All admin actions are logged and can be audited
- Session revocation is immediate and cannot be undone

## 🔑 Password Reset Flow

### Admin Password Reset
When admins manage other users, they see a "Reset Password" button instead of "Change Password":

1. **Generate Reset Link** - Creates a secure, time-limited reset link
2. **Copy to Clipboard** - Easy sharing with users
3. **Direct Password Setting** - Alternative option for immediate password changes

### User Password Reset Route
The `/reset-password` route handles password reset tokens:
- Validates reset tokens from URL parameters
- Secure form for setting new passwords
- Automatic redirect to login on success
- Proper error handling for expired/invalid tokens

## 🎨 UserDetailsCard Component

The `UserDetailsCard` component now supports both user self-management and admin management:

```tsx
// For regular users (self-management)
<UserDetailsCard />

// For admin managing other users
<UserDetailsCard userId="user123" />
```

**Features:**
- **Smart Detection** - Automatically uses admin endpoints when `userId` prop is provided
- **React Query Mutations** - All operations use proper mutation patterns
- **Admin Password Reset** - Generate secure reset links for users
- **Copy to Clipboard** - Easy sharing of reset links
- **Form Validation** - Real-time validation and disabled states
- **Error Handling** - Displays mutation errors inline
- **Loading States** - Shows pending states during operations
- **Query Invalidation** - Automatically refreshes data after successful operations

## 🔮 Architecture Benefits

### Database Agnostic
- Uses Better-Auth's `ctx.context.internalAdapter` instead of direct database queries
- Works with PostgreSQL, MySQL, SQLite, MongoDB, and any database Better-Auth supports
- Future-proof against Better-Auth updates

### Type Safety
- Client methods are auto-inferred from server plugin using `$InferServerPlugin`
- No manual client plugin updates needed when adding new endpoints
- Full TypeScript support throughout the stack

### React Query Integration
- All components follow consistent mutation patterns
- Proper error handling and loading states
- Automatic query invalidation and UI updates
- Optimistic updates where appropriate

Your custom admin plugin is production-ready and fully integrated! 🎉