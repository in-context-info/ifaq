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

