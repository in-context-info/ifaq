/**
 * API Route: GET /api/message
 * Returns a simple greeting message
 */
export async function handleMessage(): Promise<Response> {
	return new Response('Hello from ifaqai!', {
		headers: { 'Content-Type': 'text/plain' },
	});
}
