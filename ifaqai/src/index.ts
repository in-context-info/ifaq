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
	
	// Check if ASSETS binding is available
	if (!c.env.ASSETS || !c.env.ASSETS.fetch) {
		console.error('ASSETS binding is not available');
		return c.text('Server configuration error - ASSETS binding not available', 500);
	}
	
	// First, try to let ASSETS handle the original request
	// In some configurations, ASSETS might automatically serve index.html for non-existent routes
	try {
		const originalResponse = await c.env.ASSETS.fetch(c.req.raw);
		if (originalResponse && originalResponse.status !== 404) {
			return originalResponse;
		}
	} catch (error) {
		console.error('Error fetching original request from ASSETS:', error);
	}
	
	// If that didn't work, explicitly fetch index.html
	const indexUrl = new URL('/index.html', c.req.url);
	
	try {
		// Try with a simple request
		const indexRequest = new Request(indexUrl.toString());
		const indexResponse = await c.env.ASSETS.fetch(indexRequest);
		
		if (indexResponse && indexResponse.status === 200) {
			return indexResponse;
		}
		
		// Log what we got
		if (indexResponse) {
			console.error(`index.html fetch returned status ${indexResponse.status} for route: ${pathname}`);
		}
	} catch (error) {
		console.error('Error fetching index.html:', error);
		if (error instanceof Error) {
			console.error('Error details:', error.name, error.message);
		}
	}

	// If all else fails, return 404
	return c.text(`Not Found - Route: ${pathname}`, 404);
});

export default app;

// Export workflows required by Wrangler
export { FAQWorkflow } from './workflows/faqWorkflow';
