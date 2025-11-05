/**
 * Environment bindings for Cloudflare Worker
 * Matches the bindings defined in wrangler.jsonc
 */
export interface Env {
	DB: D1Database;
	AI: Ai;
	VECTOR_INDEX: Vectorize;
	ASSETS: {
		fetch: typeof fetch;
	};
}

