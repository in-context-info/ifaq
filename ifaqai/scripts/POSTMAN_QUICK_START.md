# Postman Quick Start Guide

## 🚀 5-Minute Setup

### 1. Import Collection
- Open Postman → **Import** → Select `scripts/postman-collection.json`

### 2. Start Worker
```bash
npm run dev
```
Worker runs on `http://localhost:8787`

### 3. Initialize Database (First Time Only)
```bash
npm run db:init
```

### 4. Test Create User

**Request**: `POST http://localhost:8787/api/users`

**Body** (JSON):
```json
{
  "email": "test@example.com",
  "username": "testuser",
  "name": "Test User",
  "firstName": "Test",
  "lastName": "User",
  "bio": "Test user"
}
```

**Expected**: `201 Created` with user data

### 5. Test Get User

**Request**: `GET http://localhost:8787/api/users/me?email=test@example.com`

**Expected**: `200 OK` with user data

### 6. Verify Database

```bash
npm run db:query "SELECT * FROM Users WHERE email = 'test@example.com';"
```

## 📋 Common Requests

### Create User
```
POST /api/users
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "name": "Full Name",
  "firstName": "First",
  "lastName": "Last",
  "bio": "Bio text",
  "faqs": []
}
```

### Get User
```
GET /api/users/me?email=user@example.com
```

### Update User (Same Email)
```
POST /api/users
Content-Type: application/json

{
  "email": "user@example.com",  // Same email = update
  "username": "newusername",
  "name": "Updated Name",
  ...
}
```

## ✅ Success Indicators

- ✅ POST returns `201 Created`
- ✅ GET returns `200 OK` with user data
- ✅ Database query shows the user record
- ✅ Data persists after worker restart

## ❌ Troubleshooting

| Issue | Solution |
|-------|----------|
| Connection refused | Start worker: `npm run dev` |
| 404 Not Found | Check URL: `/api/users` not `/users` |
| Table doesn't exist | Run: `npm run db:init` |
| 409 Conflict | Username taken, use different username |
| 400 Bad Request | Check JSON format and required fields |

## 🔗 Full Documentation

See `POSTMAN_GUIDE.md` for detailed instructions.

