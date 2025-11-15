# Maintaining Postman Collection During Development

## Current State

The `postman-collection.json` file is **manually maintained**. It needs to be updated whenever:
- New API endpoints are added
- Existing endpoints change (URL, method, parameters, body structure)
- Response formats change
- New error cases are added

## Update Workflow

### When Adding a New Endpoint

1. **Add the route** in `src/api/server/routes.ts`
2. **Update Postman collection**:
   - Open Postman
   - Import or open `scripts/postman-collection.json`
   - Add new request with:
     - Method (GET, POST, PUT, DELETE, etc.)
     - URL path
     - Headers
     - Body (if applicable)
     - Description
   - Save the collection
   - Export updated collection back to `scripts/postman-collection.json`

### When Modifying an Existing Endpoint

1. **Update the code** in `src/api/server/routes.ts` or handler files
2. **Update Postman collection**:
   - Open the request in Postman
   - Update URL, method, headers, or body as needed
   - Update description if behavior changed
   - Save and export

### When Response Format Changes

1. **Update the handler** to return new format
2. **Update Postman collection**:
   - Update request description
   - Add example response in the request's "Examples" section
   - Save and export

## Best Practices

### 1. Keep Collection in Sync with Code

**Before committing API changes:**
- ✅ Update Postman collection
- ✅ Test new/modified endpoints in Postman
- ✅ Commit collection changes with code changes

### 2. Use Version Control

The collection is in Git, so:
- Track changes in commits
- Review collection changes in PRs
- Use commit messages like: "Add FAQ endpoints to Postman collection"

### 3. Document Changes

When updating the collection:
- Add descriptions to requests
- Include example responses
- Document error cases
- Note any special requirements (auth headers, etc.)

### 4. Test Regularly

- Run collection tests after API changes
- Verify all endpoints still work
- Update test scripts if needed

## Automation Options

### Option 1: OpenAPI/Swagger Generation (Recommended)

Generate OpenAPI spec from code, then convert to Postman:

1. **Add OpenAPI generation**:
   ```bash
   npm install --save-dev @hono/zod-openapi
   ```

2. **Generate OpenAPI spec** from routes
3. **Convert to Postman** using tools like:
   - `openapi-to-postman` CLI
   - Postman's OpenAPI import

### Option 2: Script-Based Generation

Create a script that reads `routes.ts` and generates Postman collection:

```javascript
// scripts/generate-postman-collection.js
// Reads routes.ts and generates postman-collection.json
```

### Option 3: Postman API

Use Postman API to programmatically update collection:
- Store collection in Postman workspace
- Use Postman API to sync changes
- Export periodically to file

## Manual Update Checklist

When updating the collection manually:

- [ ] New endpoint added to collection
- [ ] URL matches route definition
- [ ] Method (GET/POST/etc.) is correct
- [ ] Headers are set correctly
- [ ] Body structure matches TypeScript types
- [ ] Query parameters are included
- [ ] Description explains what endpoint does
- [ ] Example response added (optional but helpful)
- [ ] Error cases documented
- [ ] Collection exported to `scripts/postman-collection.json`
- [ ] Changes committed to Git

## Quick Reference: Current Endpoints

Based on `src/api/server/routes.ts`:

| Method | Path | Handler | Collection Name |
|--------|------|----------|----------------|
| GET | `/api/auth/me` | `handleAuthEndpoint` | Get Auth Info |
| GET | `/api/users/me` | `handleGetCurrentUser` | Get User by Email |
| POST | `/api/users` | `handleCreateUser` | Create User |

**To add new endpoint:**
1. Add route in `routes.ts`
2. Add request in Postman collection
3. Test and export

## Sync Script

See `scripts/sync-postman-collection.js` for a helper script that:
- Validates collection matches routes
- Lists missing endpoints
- Suggests updates

Run with: `node scripts/sync-postman-collection.js`

