/**
 * API Route: GET /api/auth/user
 * Returns Cloudflare Zero Trust Access user information
 */
export async function handleAuthUser(request: Request): Promise<Response> {
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
}
