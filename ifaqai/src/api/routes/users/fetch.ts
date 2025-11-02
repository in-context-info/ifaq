/**
 * API Route: GET /api/users/fetch
 * Fetches user information from D1 database (Users table)
 * 
 * Query Parameters:
 * - email: User email address
 * - username: User username (alternative to email)
 * 
 * Response: User object from database or 404 if not found
 */

interface Env {
	DB: D1Database;
}

export async function handleFetchUser(request: Request, env?: Env): Promise<Response> {
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

	// Check if DB binding is available
	if (!env?.DB) {
		return new Response(JSON.stringify({
			error: 'Database not available',
		}), {
			status: 500,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}

	try {
		const url = new URL(request.url);
		const email = url.searchParams.get('email');
		const username = url.searchParams.get('username');

		// Validate input - need either email or username
		if (!email && !username) {
			return new Response(JSON.stringify({
				error: 'Missing required parameter: email or username',
			}), {
				status: 400,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}

		// Query the Users table
		let query;
		let params: string[];

		if (email) {
			query = 'SELECT * FROM Users WHERE email = ? LIMIT 1';
			params = [email];
		} else {
			query = 'SELECT * FROM Users WHERE user_name = ? LIMIT 1';
			params = [username!];
		}

		// Execute query
		const result = await env.DB.prepare(query).bind(...params).first();

		if (!result) {
			return new Response(JSON.stringify({
				error: 'User not found',
			}), {
				status: 404,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}

		// Return user data
		return new Response(JSON.stringify({
			success: true,
			user: result,
		}), {
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'GET, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type',
			},
		});
	} catch (error) {
		console.error('Error fetching user from D1:', error);
		return new Response(JSON.stringify({
			error: 'Internal server error',
			message: error instanceof Error ? error.message : 'Unknown error',
		}), {
			status: 500,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}
}
