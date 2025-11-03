/**
 * Server-side API routes for Cloudflare Worker
 */

import { handleAuthEndpoint } from './authHandler';
import { handleGetCurrentUser, handleCreateUser } from './userService';

export interface RouteHandler {
  (request: Request, env: any, ctx: ExecutionContext): Promise<Response>;
}

export const apiRoutes: Record<string, RouteHandler> = {
  '/api/message': async (request: Request) => {
    return new Response('Hello from ifaqai!', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },

  '/api/random': async (request: Request) => {
    return new Response(crypto.randomUUID(), {
      headers: { 'Content-Type': 'text/plain' },
    });
  },

  '/api/auth/me': handleAuthEndpoint,

  '/api/users/me': (request: Request, env: any) => handleGetCurrentUser(request, env),
  
  '/api/users': (request: Request, env: any) => {
    if (request.method === 'POST') {
      return handleCreateUser(request, env);
    }
    return Promise.resolve(
      new Response('Method not allowed', { status: 405 })
    );
  },
};

export function handleApiRoute(
  pathname: string,
  request: Request,
  env: any,
  ctx: ExecutionContext
): Promise<Response> {
  // Support query parameters for routes like /api/users/me?email=...
  const url = new URL(request.url);
  const basePath = url.pathname;
  
  const handler = apiRoutes[basePath];
  
  if (handler) {
    return handler(request, env, ctx);
  }
  
  return Promise.resolve(
    new Response('Not Found', { status: 404 })
  );
}

