# Database Initialization Scripts

## Local D1 Database Setup

The local D1 database is **automatically created** when you run `wrangler dev`. However, you need to create the tables manually.

### How Local D1 Database is Created

1. **Automatic Creation**: When you run `wrangler dev`, Wrangler (via Miniflare) automatically creates a local SQLite database file.

2. **Storage Location**: The database is stored in `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/` directory.

3. **Database File**: A SQLite file (`.sqlite`) is created automatically with a hash-based name.

4. **Tables**: Tables are NOT created automatically - you need to run SQL to create them.

### Initialize Local Database Schema

Run this command to create the Users table:

```bash
npm run db:init
```

Or manually:
```bash
wrangler d1 execute hippocampus --local --file=./scripts/init-d1-schema.sql
```

### Initialize Remote Database Schema

For production/remote database:

```bash
npm run db:init:remote
```

Or manually:
```bash
wrangler d1 execute hippocampus --file=./scripts/init-d1-schema.sql
```

### Query Local Database

```bash
# List all tables
npm run db:query "SELECT name FROM sqlite_master WHERE type='table';"

# View all users
npm run db:query "SELECT * FROM Users;"

# Count users
npm run db:query "SELECT COUNT(*) as count FROM Users;"
```

### Query Remote Database

```bash
# List all tables
npm run db:query:remote "SELECT name FROM sqlite_master WHERE type='table';"

# View all users
npm run db:query:remote "SELECT * FROM Users;"
```

### Database Schema

The `Users` table has the following structure:

```sql
CREATE TABLE Users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  user_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  user_bio TEXT,
  created_at TEXT DEFAULT (datetime('now')) NOT NULL,
  modified_at TEXT
);
```

### Reset Local Database

To reset the local database (delete all data):

1. Stop `wrangler dev` if running
2. Delete the `.wrangler` directory:
   ```bash
   rm -rf .wrangler
   ```
3. Start `wrangler dev` again (creates new empty database)
4. Run `npm run db:init` to create tables again

### Where is the Local Database?

- **Location**: `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/[hash].sqlite`
- **Type**: SQLite database file
- **Created**: Automatically when `wrangler dev` starts
- **Persisted**: Yes, data persists between `wrangler dev` restarts
- **Git ignored**: Yes, `.wrangler/` is in `.gitignore`

