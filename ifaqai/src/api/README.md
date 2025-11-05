# API Folder Structure Documentation

This document explains the functionality of each folder and file in the `api` directory.

## Overview

The `api` folder is organized into three main directories:
- **`client/`** - Client-side code that runs in the browser
- **`server/`** - Server-side code that runs in Cloudflare Workers
- **`types/`** - Shared TypeScript type definitions

---

## 📁 Root Files

### `api/index.ts`
**Purpose**: Main entry point for the API module  
**Exports**:
- All types from `./types`
- Client API as `clientApi`
- Server API as `serverApi`

**Usage**: Provides a single import point for all API functionality.

---

## 📁 `types/` Folder

### `types/index.ts`
**Purpose**: Shared TypeScript type definitions used by both client and server  
**Exports**:

1. **`DbUser`** - Database schema matching D1 table structure
   - Fields: `user_id`, `email`, `user_name`, `first_name`, `last_name`, `user_bio`, `created_at`, `modified_at`

2. **`User`** - Application-level user interface
   - Fields: `userId`, `username`, `name`, `firstName`, `lastName`, `email`, `password`, `bio`, `faqs`, `createdAt`, `modifiedAt`

3. **`ZeroTrustAuthPayload`** - Authentication payload from Cloudflare ZeroTrust
   - Fields: `name`, `email`

4. **`FAQ`** - FAQ question-answer pair
   - Fields: `question`, `answer`, `id`

5. **`LoginCredentials`** - Legacy login interface (commented out)
6. **`SignupData`** - Legacy signup interface (commented out)
7. **`ProfileData`** - User profile update data
8. **`UpdateUserData`** - Partial user update data

---

## 📁 `client/` Folder

**Purpose**: Client-side code that runs in the browser. These services make HTTP requests to the server API and provide fallback to localStorage.

### `client/index.ts`
**Purpose**: Re-exports all client services for convenient importing  
**Exports**: All functions from `authService.ts` and `userService.ts`

### `client/authService.ts`
**Purpose**: Authentication service for Cloudflare ZeroTrust  
**Key Functions**:

1. **`fetchAuthFromServer()`** - Fetches authentication payload from `/api/auth/me`
   - Returns `ZeroTrustAuthPayload` or `null` if not authenticated
   - Handles errors gracefully

2. **`setLoggedInUser(payload)`** - Stores auth payload in localStorage
   - Creates or updates user in localStorage
   - Handles name splitting into firstName/lastName

3. **`getAuthPayload()`** - Retrieves stored auth payload from localStorage

4. **`getLoggedInUser()`** - Returns current logged-in user email

5. **`logout()`** - Clears all authentication data
   - Removes localStorage items
   - Clears cookies
   - Clears sessionStorage

6. **`isLoggedIn()`** - Checks if user is logged in

**Storage Keys**:
- `users` - Array of users in localStorage
- `loggedInUser` - Currently logged-in username
- `authPayload` - ZeroTrust authentication payload

### `client/userService.ts`
**Purpose**: User service with dual storage (D1 database + localStorage fallback)  
**Key Functions**:

1. **`fetchUserFromDatabase(email)`** - Fetches user from D1 via `/api/users/me`
   - Falls back to localStorage if API fails
   - Returns `User | null`

2. **`createUserInDatabase(user)`** - Creates/updates user via POST `/api/users`
   - Handles username conflicts (409 status)
   - Falls back to localStorage on error
   - Returns created/updated `User`

3. **`getAllUsers()`** - Gets all users from localStorage (internal use)

4. **`getUserByUsername(username)`** - Gets user from localStorage by username

5. **`getUserByEmail(email)`** - Gets user from localStorage by email

6. **`getCurrentUser()`** - Gets currently logged-in user from localStorage (legacy)

7. **`updateUserProfile(email, profile)`** - Updates user profile in localStorage
   - Updates username, name, bio

8. **`updateUser(username, data)`** - Generic user update in localStorage

9. **`updateUserFAQs(username, faqs)`** - Updates user FAQs in localStorage

10. **`isUsernameAvailable(username, excludeEmail?)`** - Checks if username is available

**Note**: Functions prefixed with `get`/`update` work with localStorage only. Functions with `Database` suffix work with the server API.

---

## 📁 `server/` Folder

**Purpose**: Server-side code that runs in Cloudflare Workers. Handles HTTP requests and interacts with D1 database.

### `server/index.ts`
**Purpose**: Re-exports server routes for Cloudflare Worker  
**Exports**: Routes from `routes.ts`

### `server/routes.ts`
**Purpose**: Defines Hono API routes  
**Routes**:

1. **`GET /api/auth/me`** - Returns ZeroTrust authentication payload
   - Handler: `handleAuthEndpoint()`

2. **`GET /api/users/me`** - Fetches user by email query parameter
   - Query param: `email` (required)
   - Handler: `handleGetCurrentUser()`

3. **`POST /api/users`** - Creates or updates user
   - Body: `User` object (JSON)
   - Handler: `handleCreateUser()`

**Setup**: Uses Hono framework with typed bindings (`Env`) for D1 database access.

### `server/authHandler.ts`
**Purpose**: Handles Cloudflare ZeroTrust authentication  
**Key Functions**:

1. **`extractZeroTrustAuth(request)`** - Extracts user info from ZeroTrust headers
   - Method 1: Parses JWT from `CF-Access-JWT-Assertion` header
   - Method 2: Reads from `CF-Access-Authenticated-User-Email` header
   - Method 3: Checks `request.cf.tlsClientAuth` properties
   - Returns `ZeroTrustAuthPayload | null`

2. **`handleAuthEndpoint(request)`** - HTTP handler for `/api/auth/me`
   - Returns 401 if not authenticated
   - Returns JSON payload with name and email

### `server/userService.ts`
**Purpose**: Server-side user service for D1 database operations  
**Key Functions**:

1. **`getUserByEmail(db, email)`** - Queries D1 database for user by email
   - SQL: `SELECT * FROM Users WHERE email = ?`
   - Returns `User | null`
   - Converts `DbUser` to `User`

2. **`getUserByUsername(db, username)`** - Queries D1 database for user by username
   - SQL: `SELECT * FROM Users WHERE user_name = ?`
   - Returns `User | null`

3. **`upsertUser(db, user)`** - Creates or updates user in D1
   - Checks if user exists by email
   - If exists: Updates user (UPDATE query)
   - If new: Inserts user (INSERT query)
   - Includes logging for write operations
   - Returns created/updated `User`

4. **`handleGetCurrentUser(request, env)`** - HTTP handler for `GET /api/users/me`
   - Validates email query parameter
   - Returns 400 if email missing
   - Returns 404 if user not found
   - Returns 500 on database error
   - Returns JSON user object on success

5. **`handleCreateUser(request, env)`** - HTTP handler for `POST /api/users`
   - Validates email in request body
   - Generates temporary username if needed (`user_${timestamp}`)
   - Checks username availability
   - Returns 409 if username taken by different user
   - Calls `upsertUser()` to save to database
   - Returns 201 with created user JSON

**Helper Functions**:
- `dbUserToUser(dbUser)` - Converts database schema to application schema
- `userToDbUser(user)` - Converts application schema to database schema

**Database Operations**:
- Uses parameterized queries (`.bind()`) to prevent SQL injection
- Logs SQL queries and parameters for debugging
- Checks `meta.changes` to verify writes succeeded

### `server/README.md`
**Purpose**: Documentation for server-side API endpoints  
**Contents**:
- API endpoint documentation
- Request/response examples
- Database schema requirements
- Configuration instructions

---

## Data Flow

### Authentication Flow
1. Browser calls `fetchAuthFromServer()` → `/api/auth/me`
2. Server extracts ZeroTrust headers → Returns auth payload
3. Client stores payload in localStorage
4. Client uses email to fetch user from database

### User Creation Flow
1. Browser calls `createUserInDatabase(user)` → `POST /api/users`
2. Server validates and checks username availability
3. Server writes to D1 database (INSERT/UPDATE)
4. Server returns created user
5. Client stores in localStorage as fallback

### User Fetch Flow
1. Browser calls `fetchUserFromDatabase(email)` → `GET /api/users/me?email=...`
2. Server queries D1 database
3. Server returns user JSON or 404
4. Client falls back to localStorage if API fails

---

## Key Design Patterns

1. **Dual Storage**: Client-side code uses D1 database as primary, localStorage as fallback
2. **Type Safety**: Shared types ensure consistency between client and server
3. **Error Handling**: All API calls have try/catch with fallback mechanisms
4. **Logging**: Server-side writes include detailed logging for debugging
5. **Parameterized Queries**: All database queries use `.bind()` to prevent SQL injection

