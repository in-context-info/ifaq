/**
 * Cloudflare Worker for ifaqai
 * 
 * This worker serves the React frontend application and handles API routes.
 * Static assets are automatically served from the public directory as configured in wrangler.jsonc.
 */

import { Hono } from 'hono';
import { Env } from './types/env';
import { apiRoutes } from './api/server/routes';

const app = new Hono<{ Bindings: Env }>();

// Mount API routes (must be before wildcard route)
app.route('/api', apiRoutes);

// Handle static assets and client-side routing
app.get('*', async (c) => {
	const url = new URL(c.req.url);
	const pathname = url.pathname;

	// Skip API routes (already handled above)
	if (pathname.startsWith('/api/')) {
		return c.notFound();
	}

	// If it's a static file (has extension), try to serve it
	if (pathname.includes('.')) {
		try {
			const assetResponse = await c.env.ASSETS.fetch(c.req.raw);
			if (assetResponse.status !== 404) {
				return assetResponse;
			}
		} catch (error) {
			console.error('Error fetching asset:', error);
		}
	}

	// For all other routes, serve index.html for client-side routing
	// This handles React client-side routing like /username
	try {
		const indexRequest = new Request(new URL('/index.html', c.req.url));
		const indexResponse = await c.env.ASSETS.fetch(indexRequest);
		return indexResponse;
	} catch (error) {
		console.error('Error fetching index.html:', error);
		return c.text('Not Found', 404);
	}
});

export default app;
