/**
 * Cloudflare Worker for ifaqai
 * 
 * This worker serves the React frontend application and handles API routes.
 * Static assets are automatically served from the public directory as configured in wrangler.jsonc.
 */

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);
		const pathname = url.pathname;

		// API routes
		if (pathname.startsWith('/api/')) {
			switch (pathname) {
				case '/api/message':
					return new Response('Hello from ifaqai!', {
						headers: { 'Content-Type': 'text/plain' },
					});
				case '/api/random':
					return new Response(crypto.randomUUID(), {
						headers: { 'Content-Type': 'text/plain' },
					});
				case '/api/auth/user':
					// Handle CORS preflight
					if (request.method === 'OPTIONS') {
						return new Response(null, {
							headers: {
								'Access-Control-Allow-Origin': '*',
								'Access-Control-Allow-Methods': 'GET, OPTIONS',
								'Access-Control-Allow-Headers': 'Content-Type',
							},
						});
					}
					
					// Extract Cloudflare Zero Trust Access user information
					const email = request.headers.get('CF-Access-Authenticated-User-Email');
					const identity = request.headers.get('CF-Access-Authenticated-User-Identity');
					const jwt = request.headers.get('CF-Access-Jwt-Assertion');
					
					if (email || identity) {
						// User is authenticated via Cloudflare Zero Trust Access
						return new Response(JSON.stringify({
							authenticated: true,
							email: email || identity,
							identity: identity || email,
							jwt: jwt,
						}), {
							headers: { 
								'Content-Type': 'application/json',
								'Access-Control-Allow-Origin': '*',
								'Access-Control-Allow-Methods': 'GET, OPTIONS',
								'Access-Control-Allow-Headers': 'Content-Type',
							},
						});
					} else {
						// User is not authenticated
						return new Response(JSON.stringify({
							authenticated: false,
						}), {
							status: 401,
							headers: { 
								'Content-Type': 'application/json',
								'Access-Control-Allow-Origin': '*',
								'Access-Control-Allow-Methods': 'GET, OPTIONS',
								'Access-Control-Allow-Headers': 'Content-Type',
							},
						});
					}
				default:
					return new Response('Not Found', { status: 404 });
			}
		}

		// For all other routes, let Wrangler handle static assets
		// If it's not a static file (has extension) or API route, serve index.html for client-side routing
		// This handles React client-side routing like /username
		if (!pathname.includes('.') && env.ASSETS) {
			try {
				// Check if it's a static asset
				const assetResponse = await env.ASSETS.fetch(request);
				
				// If asset found, return it
				if (assetResponse.status !== 404) {
					return assetResponse;
				}
				
				// If not found and no file extension, serve index.html for client-side routing
				const indexRequest = new Request(new URL('/index.html', request.url));
				const indexResponse = await env.ASSETS.fetch(indexRequest);
				return indexResponse;
			} catch (error) {
				// Fallback: try to serve index.html
				try {
					const indexRequest = new Request(new URL('/index.html', request.url));
					return await env.ASSETS.fetch(indexRequest);
				} catch {
					return new Response('Not Found', { status: 404 });
				}
			}
		}

		// If no ASSETS binding, just return not found
		// (This shouldn't happen if wrangler.jsonc is configured correctly)
		return new Response('Not Found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;
