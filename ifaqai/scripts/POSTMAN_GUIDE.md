# Postman Guide for Testing D1 Database API

This guide explains how to use Postman to test if the API is writing to the D1 database.

## Prerequisites

1. **Install Postman**: Download from [postman.com](https://www.postman.com/downloads/)
2. **Start the Worker**: Run `npm run dev` in your terminal
3. **Initialize Database** (if not done): Run `npm run db:init`

## Quick Start

### Option 1: Import Collection (Recommended)

1. **Import the Collection**:
   - Open Postman
   - Click **Import** button
   - Select `scripts/postman-collection.json`
   - The collection will be imported with all endpoints pre-configured

2. **Set Environment Variables**:
   - Click on the collection name
   - Go to **Variables** tab
   - Update variables as needed:
     - `base_url`: `http://localhost:8787` (default)
     - `test_email`: Your test email
     - `test_username`: Your test username
     - `test_name`: Test user name

3. **Start Testing**:
   - Run requests in order:
     1. **Create User** - Creates a test user
     2. **Get User by Email** - Fetches the created user
     3. **Update User** - Updates the user
     4. **Get User by Email** again - Verifies the update

### Option 2: Manual Setup

Follow the steps below to create requests manually.

## Environment Setup

### Create a Postman Environment

1. Click **Environments** in the left sidebar
2. Click **+** to create a new environment
3. Name it "Local Development"
4. Add these variables:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| `base_url` | `http://localhost:8787` | `http://localhost:8787` |
| `test_email` | `test@example.com` | `test@example.com` |
| `test_username` | `testuser` | `testuser` |
| `test_name` | `Test User` | `Test User` |

5. Click **Save**
6. Select this environment from the dropdown in the top right

## API Endpoints

### 1. Create User (POST)

**Endpoint**: `POST {{base_url}}/api/users`

**Headers**:
```
Content-Type: application/json
```

**Body** (raw JSON):
```json
{
  "email": "{{test_email}}",
  "username": "{{test_username}}",
  "name": "{{test_name}}",
  "firstName": "Test",
  "lastName": "User",
  "bio": "Test user created via Postman",
  "faqs": []
}
```

**Expected Response** (201 Created):
```json
{
  "userId": 1,
  "email": "test@example.com",
  "username": "testuser",
  "name": "Test User",
  "firstName": "Test",
  "lastName": "User",
  "bio": "Test user created via Postman",
  "faqs": [],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Steps in Postman**:
1. Create new request
2. Set method to **POST**
3. Enter URL: `{{base_url}}/api/users`
4. Go to **Headers** tab, add `Content-Type: application/json`
5. Go to **Body** tab, select **raw** and **JSON**
6. Paste the JSON body above
7. Click **Send**

### 2. Get User by Email (GET)

**Endpoint**: `GET {{base_url}}/api/users/me?email={{test_email}}`

**Expected Response** (200 OK):
```json
{
  "userId": 1,
  "email": "test@example.com",
  "username": "testuser",
  "name": "Test User",
  "firstName": "Test",
  "lastName": "User",
  "bio": "Test user created via Postman",
  "faqs": [],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Steps in Postman**:
1. Create new request
2. Set method to **GET**
3. Enter URL: `{{base_url}}/api/users/me`
4. Go to **Params** tab
5. Add parameter:
   - Key: `email`
   - Value: `{{test_email}}`
6. Click **Send**

### 3. Update User (POST - Same Email)

**Endpoint**: `POST {{base_url}}/api/users`

**Body** (raw JSON):
```json
{
  "email": "{{test_email}}",
  "username": "{{test_username}}_updated",
  "name": "{{test_name}} Updated",
  "firstName": "Test",
  "lastName": "User Updated",
  "bio": "Updated bio via Postman"
}
```

**Expected Response** (200 OK or 201 Created):
```json
{
  "userId": 1,
  "email": "test@example.com",
  "username": "testuser_updated",
  "name": "Test User Updated",
  ...
}
```

## Testing Workflow

### Step-by-Step Test Flow

1. **Create User**:
   - Send POST `/api/users` with test data
   - Verify response is `201 Created`
   - Copy the `email` from response

2. **Verify User Exists**:
   - Send GET `/api/users/me?email=<email>`
   - Verify response is `200 OK`
   - Verify data matches what you sent

3. **Update User**:
   - Send POST `/api/users` with same email but different data
   - Verify response is `200 OK` or `201 Created`
   - Verify `modifiedAt` field is updated

4. **Verify Update**:
   - Send GET `/api/users/me?email=<email>` again
   - Verify updated data is returned

5. **Test Error Cases**:
   - **Missing email**: GET `/api/users/me` (no email param) → Should return `400`
   - **Duplicate username**: POST with different email but same username → Should return `409`
   - **Non-existent user**: GET with non-existent email → Should return `404`

## Verifying Database Writes

### Method 1: Using Postman Tests

Add test scripts to verify responses:

**For Create User request**, add this in **Tests** tab:
```javascript
// Verify status code
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

// Verify response has user data
pm.test("Response has user data", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('email');
    pm.expect(jsonData).to.have.property('username');
    pm.expect(jsonData).to.have.property('userId');
});

// Save email for next request
pm.environment.set("created_user_email", pm.response.json().email);
```

**For Get User request**, add this in **Tests** tab:
```javascript
// Verify status code
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Verify user data
pm.test("User data matches", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.email).to.eql(pm.environment.get("test_email"));
});
```

### Method 2: Query Database Directly

After making API calls, verify data in database:

```bash
# In terminal (while worker is running)
npm run db:query "SELECT * FROM Users WHERE email = 'test@example.com';"
```

### Method 3: Use Postman Collection Runner

1. Click on collection name
2. Click **Run** button
3. Select requests to run
4. Click **Run Collection**
5. View results to see all test results

## Common Issues

### Issue: "Cannot GET /api/users/me"
**Solution**: Make sure worker is running (`npm run dev`)

### Issue: "Database table does not exist"
**Solution**: Run `npm run db:init` to create tables

### Issue: "User not found" after creating
**Possible causes**:
- Database write failed
- Email mismatch
- Database not initialized

**Debug**:
1. Check worker terminal logs
2. Query database: `npm run db:query "SELECT * FROM Users;"`
3. Verify email in request matches query

### Issue: "Username already taken" (409)
**Solution**: Use a different username or update existing user with same email

## Advanced: Using Pre-request Scripts

### Generate Dynamic Test Data

In **Pre-request Script** tab, add:
```javascript
// Generate unique email and username
const timestamp = Date.now();
pm.environment.set("test_email", `test-${timestamp}@example.com`);
pm.environment.set("test_username", `testuser_${timestamp}`);
```

This ensures each test run uses unique data.

### Chain Requests

Use Postman's **Tests** tab to chain requests:
```javascript
// After creating user, automatically fetch it
if (pm.response.code === 201) {
    const email = pm.response.json().email;
    pm.sendRequest({
        url: pm.environment.get("base_url") + "/api/users/me?email=" + email,
        method: 'GET'
    }, function (err, res) {
        console.log("Fetched user:", res.json());
    });
}
```

## Tips

1. **Use Variables**: Always use `{{variable}}` syntax for reusable values
2. **Save Responses**: Click **Save Response** to save example responses
3. **Use Folders**: Organize requests in folders (Users, Auth, etc.)
4. **Add Descriptions**: Document each request in the Description field
5. **Export Collection**: Share your collection with team members

## Next Steps

- Test with remote database: Change `base_url` to your deployed worker URL
- Add more test cases for edge cases
- Set up automated tests using Postman CLI (Newman)
- Monitor API performance using Postman's monitoring features

