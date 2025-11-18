/**
 * Environment bindings for Cloudflare Worker
 * Matches the bindings defined in wrangler.jsonc
 */
export interface Env {
	DB: D1Database;
	AI: Ai;
	VECTOR_INDEX: Vectorize;
	FAQ_WORKFLOW: import("cloudflare:workflows").Workflow<import("../workflows/faqWorkflow").FAQWorkflowPayload>;
	ASSETS: {
		fetch: typeof fetch;
	};
}

