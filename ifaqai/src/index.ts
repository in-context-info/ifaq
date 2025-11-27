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

	// Check for common static file extensions
	const staticFileExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.json', '.map'];
	const hasStaticExtension = staticFileExtensions.some(ext => pathname.toLowerCase().endsWith(ext));
	
	// If it's a static file, try to serve it directly from ASSETS
	if (hasStaticExtension) {
		try {
			const assetResponse = await c.env.ASSETS.fetch(c.req.raw);
			if (assetResponse && assetResponse.status !== 404) {
				return assetResponse;
			}
		} catch (error) {
			console.error('Error fetching static asset:', error);
		}
	}

	// For all client-side routes (including /{username} like /anh, /home, /, etc.), serve index.html
	// This allows React to handle the routing on the client side
	// Routes like /anh will be handled by React's client-side routing in App.tsx
	const indexUrl = new URL('/index.html', c.req.url);
	const indexRequest = new Request(indexUrl.toString(), c.req.raw);
	
	try {
		const indexResponse = await c.env.ASSETS.fetch(indexRequest);
		if (indexResponse && indexResponse.status === 200) {
			return indexResponse;
		}
	} catch (error) {
		console.error('Error fetching index.html for route:', pathname, error);
		return c.text('Not Found - Unable to serve index.html', 404);
	}

	// If index.html fetch failed, return 404
	return c.text('Not Found', 404);
});

export default app;

// Export workflows required by Wrangler
export { FAQWorkflow } from './workflows/faqWorkflow';
