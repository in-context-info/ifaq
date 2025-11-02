/**
 * API Router
 * Handles routing for all API endpoints
 */

import { handleMessage } from './routes/message';
import { handleRandom } from './routes/random';
import { handleAuthUser } from './routes/auth/user';
import { handleFetchUser } from './routes/users/fetch';

export type RouteHandler = (request: Request, env?: any, ctx?: any) => Promise<Response>;

interface Route {
	path: string;
	method?: string;
	handler: RouteHandler;
}

// Register all API routes
const routes: Route[] = [
	{ path: '/api/message', handler: handleMessage },
	{ path: '/api/random', handler: handleRandom },
	{ path: '/api/auth/user', handler: handleAuthUser },
	{ path: '/api/users/fetch', handler: handleFetchUser },
];

/**
 * Routes an API request to the appropriate handler
 */
export async function routeApiRequest(
	request: Request,
	env?: any,
	ctx?: any
): Promise<Response | null> {
	const url = new URL(request.url);
	const pathname = url.pathname;

	// Find matching route
	const route = routes.find((r) => {
		const pathMatch = pathname === r.path || pathname.startsWith(r.path + '/');
		const methodMatch = !r.method || request.method === r.method;
		return pathMatch && methodMatch;
	});

	if (route) {
		return route.handler(request, env, ctx);
	}

	// No route found
	return null;
}
