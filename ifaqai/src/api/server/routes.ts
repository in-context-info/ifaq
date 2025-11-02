/**
 * Server-side API routes for Cloudflare Worker
 */

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
};

export function handleApiRoute(
  pathname: string,
  request: Request,
  env: any,
  ctx: ExecutionContext
): Promise<Response> {
  const handler = apiRoutes[pathname];
  
  if (handler) {
    return handler(request, env, ctx);
  }
  
  return Promise.resolve(
    new Response('Not Found', { status: 404 })
  );
}

