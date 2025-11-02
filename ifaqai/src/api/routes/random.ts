/**
 * API Route: GET /api/random
 * Generates and returns a random UUID
 */
export async function handleRandom(): Promise<Response> {
	return new Response(crypto.randomUUID(), {
		headers: { 'Content-Type': 'text/plain' },
	});
}
