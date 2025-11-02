# Functions Directory

This directory contains Cloudflare Pages Functions.

## How It Works

Files in this directory automatically become API endpoints:

- `functions/api/test.ts` → `/api/test` endpoint
- `functions/auth.ts` → `/auth` endpoint
- `functions/api/users.ts` → `/api/users` endpoint

## Function Structure

Each function file exports handlers like:
- `onRequest` - Handles all HTTP methods
- `onRequestGet` - Only GET requests
- `onRequestPost` - Only POST requests
- etc.

## Example Function

See `functions/api/test.ts` for a working example that:
- Responds to requests
- Accesses Cloudflare bindings (AI, Vectorize, D1)
- Returns JSON responses

## Accessing Bindings

In your functions, bindings are available via `env`:

```typescript
export async function onRequest(context: { env: any }) {
  const { env } = context;
  
  // Access AI binding
  const aiResponse = await env.AI.run(...);
  
  // Access Vectorize
  const vectorResults = await env.VECTOR_INDEX.query(...);
  
  // Access D1 database
  const result = await env.DB.prepare('SELECT * FROM users').all();
  
  return new Response(JSON.stringify(result));
}
```

## Testing Locally

Run `npm run preview:worker` and test endpoints:
- http://localhost:8788/api/test

## Documentation

- [Pages Functions Docs](https://developers.cloudflare.com/pages/platform/functions/)
- [Bindings Reference](https://developers.cloudflare.com/pages/platform/functions/bindings/)

