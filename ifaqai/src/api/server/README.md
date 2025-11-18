# Server-Side API Documentation

## Database API

### GET /api/users/me

Fetch user data from the D1 Database Users table by email.

#### Query Parameters

- `email` (required): User email address to query

#### Response

**Success (200):**
```json
{
  "email": "user@example.com",
  "username": "username",
  "name": "User Name",
  "bio": "User bio",
  "faqs": [
    {
      "id": "123",
      "question": "What is this?",
      "answer": "This is an answer"
    }
  ]
}
```

**Error Responses:**

- `400 Bad Request`: Email parameter is missing
- `404 Not Found`: User not found in database
- `500 Internal Server Error`: Database binding not configured or database error

#### Example Usage

```bash
curl "https://your-worker.workers.dev/api/users/me?email=user@example.com"
```

#### Database Binding Configuration

To use this endpoint, you need to configure a D1 database binding in `wrangler.jsonc`:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "your-database-name",
      "database_id": "your-database-id"
    }
  ]
}
```

#### Expected Database Schema

The `Users` table should have the following columns:

- `user_id` (INTEGER PRIMARY KEY or TEXT PRIMARY KEY) - Unique user identifier
- `email` (TEXT, UNIQUE) - User email address (used for filtering)
- `user_name` (TEXT) - Username
- `first_name` (TEXT) - User's first name
- `last_name` (TEXT) - User's last name
- `created_at` (TEXT/DATETIME) - ISO timestamp of account creation

#### Example SQL Schema

```sql
CREATE TABLE IF NOT EXISTS Users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  user_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  user_bio TEXT,
  created_at TEXT DEFAULT (datetime('now')) NOT NULL,
  modified_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_email ON Users(email);
CREATE INDEX IF NOT EXISTS idx_user_name ON Users(user_name);
```

**Note:** A complete migration file is available at `migrations/001_create_users_table.sql`

**Note:** The API combines `first_name` and `last_name` into a single `name` field in responses for backward compatibility with the frontend.

## FAQ Workflow API

The FAQ workflow creates a record in D1 and generates an embedding that is stored in Vectorize.

### POST /api/faqs

Creates a FAQ entry and starts the workflow that writes to D1 and Vectorize.

**Request Body**

```json
{
  "userId": 1,
  "question": "How do I reset my password?",
  "answer": "Go to Settings → Security and click Reset Password."
}
```

**Response (201)**

```json
{
  "message": "FAQ creation started",
  "workflowId": "d8df0f0e-b876-4cb3-8bc2-911a7a91ccf8",
  "status": "pending"
}
```

Use the returned `workflowId` to poll the workflow status.

### GET /api/faqs/:workflowId

Fetch the current workflow status (pending, completed, failed, etc.).

```bash
curl "$BASE_URL/api/faqs/d8df0f0e-b876-4cb3-8bc2-911a7a91ccf8"
```

## Postman Documentation

You can exercise the Worker APIs using Postman. A ready-to-import collection lives at `docs/postman/ifaqai.postman_collection.json`. Suggested setup:

1. **Create a collection** called `ifaqai Worker`.
2. **Add a collection variable** `baseUrl` set to your Worker URL  
   (for example `https://ifaqai.example.workers.dev` or `http://127.0.0.1:8787` when using `wrangler dev`).
3. **Requests to add**:

| Name | Method & URL | Body / Query | Notes |
|------|--------------|--------------|-------|
| `Get Current User` | `GET {{baseUrl}}/api/users/me?email={{email}}` | Query param `email` | Returns the user stored in D1. |
| `Create / Update User` | `POST {{baseUrl}}/api/users` | JSON body (user payload) | Upserts a user into D1. |
| `Create FAQ` | `POST {{baseUrl}}/api/faqs` | JSON body (`userId`, `question`, `answer`) | Starts the FAQ workflow. |
| `Workflow Status` | `GET {{baseUrl}}/api/faqs/{{workflowId}}` | Path param `workflowId` | Check if the FAQ workflow finished. |

4. **Example Body Templates**

```jsonc
// POST /api/users
{
  "email": "user@example.com",
  "username": "user_name",
  "name": "User Name",
  "bio": "Short bio"
}
```

```jsonc
// POST /api/faqs
{
  "userId": 1,
  "question": "How do I reset my password?",
  "answer": "Go to Settings → Security and click Reset Password."
}
```

5. **Environment variables** (optional):
   - `email` – reused in the GET request
   - `workflowId` – set after calling `POST /api/faqs` to quickly query status

6. **Authentication**: If you have Cloudflare Zero Trust enabled, make sure the Postman requests include the required headers or that Zero Trust allows your IP/session.

This checklist doubles as Postman documentation—any teammate can import the collection, set `baseUrl`, `email`, and immediately exercise the APIs.

