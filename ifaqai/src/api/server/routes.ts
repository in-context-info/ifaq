/**
 * Server-side API routes for Cloudflare Worker using Hono
 */

import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { handleAuthEndpoint } from './authHandler';
import { handleGetCurrentUser, handleGetUserByUsername, handleCreateUser } from './userService';
import { handleGetFAQs, handleUpdateFAQ, handleDeleteFAQ } from './faqService';
import { handleChatbotQuery } from './chatbotService';

const app = new Hono<{ Bindings: Env }>();

// Simple test routes
app.get('/message', (c) => {
	return c.text('Hello from ifaqai!');
});

app.get('/random', (c) => {
	return c.text(crypto.randomUUID());
});

// Auth routes
app.get('/auth/me', async (c) => {
	return handleAuthEndpoint(c.req.raw);
});

// User routes
app.get('/users/me', handleGetCurrentUser);
app.get('/users/:username', handleGetUserByUsername);

app.post('/users', handleCreateUser);

// FAQ routes
app.get('/faqs', handleGetFAQs);

app.get('/faqs/:workflowId', async (c) => {
	const workflowId = c.req.param('workflowId');
	try {
		const instance = await c.env.FAQ_WORKFLOW.get(workflowId);
		const status = await instance.status();
		return c.json(status);
	} catch (error) {
		return c.json({ error: 'Workflow not found' }, 404);
	}
});

app.post('/faqs', async (c) => {
	try {
		const { userId, question, answer } = await c.req.json();
		
		console.log('FAQ creation request:', { userId, question, answer });
		
		if (!question || !answer) {
			return c.text('Missing question or answer', 400);
		}
		
		if (!userId) {
			return c.text('Missing userId', 400);
		}
		
		console.log('Creating workflow instance...');
		const workflowInstance = await c.env.FAQ_WORKFLOW.create({
			params: {
				userId,
				question,
				answer,
			},
		});
		
		console.log('Workflow instance created:', workflowInstance.id);
		
		// Wait for workflow to complete (optional - workflows run asynchronously)
		// You can also return immediately and check status later
		return c.json({ 
			message: 'FAQ creation started',
			workflowId: workflowInstance.id,
			status: 'pending'
		}, 201);
	} catch (error) {
		console.error('Error creating FAQ:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		const errorStack = error instanceof Error ? error.stack : undefined;
		return c.json({ 
			error: 'Failed to create FAQ',
			details: errorMessage,
			...(errorStack && { stack: errorStack })
		}, 500);
	}
});

app.put('/faqs/:id', handleUpdateFAQ);
app.delete('/faqs/:id', handleDeleteFAQ);

// Chatbot route - RAG-based query using Vectorize and LLM
app.get('/chatbot', handleChatbotQuery);

// Admin/Utility routes
app.post('/admin/clear-vectorize', async (c) => {
	try {
		// Get all FAQ IDs from D1
		const stmt = c.env.DB.prepare('SELECT faq_id FROM FAQs');
		const { results } = await stmt.all<{ faq_id: number }>();

		if (!results || results.length === 0) {
			return c.json({ 
				message: 'No FAQs found in D1 database',
				deletedCount: 0 
			});
		}

		const faqIds = results.map(row => row.faq_id.toString());
		console.log(`[CLEAR VECTORIZE] Found ${faqIds.length} FAQs in D1, deleting from Vectorize...`);

		// Delete all vectors from Vectorize in batches (Vectorize may have limits)
		const batchSize = 100; // Delete in batches of 100
		let deletedCount = 0;
		let errors: string[] = [];

		for (let i = 0; i < faqIds.length; i += batchSize) {
			const batch = faqIds.slice(i, i + batchSize);
			try {
				const result = await c.env.VECTOR_INDEX.deleteByIds(batch);
				console.log(`[CLEAR VECTORIZE] Deleted batch ${Math.floor(i / batchSize) + 1}:`, result);
				deletedCount += batch.length;
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : 'Unknown error';
				console.error(`[CLEAR VECTORIZE] Error deleting batch:`, errorMsg);
				errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${errorMsg}`);
			}
		}

		return c.json({
			message: 'Vectorize database cleared',
			totalFAQs: faqIds.length,
			deletedCount,
			errors: errors.length > 0 ? errors : undefined,
		});
	} catch (error) {
		console.error('[CLEAR VECTORIZE] Error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return c.json({ 
			error: 'Failed to clear Vectorize database',
			details: errorMessage 
		}, 500);
	}
});

// Clear Vectorize for a specific user
app.post('/admin/clear-vectorize/:userId', async (c) => {
	try {
		const userId = c.req.param('userId');

		if (!userId) {
			return c.json({ error: 'userId is required' }, 400);
		}

		// Get all FAQ IDs for this user from D1
		const stmt = c.env.DB.prepare('SELECT faq_id FROM FAQs WHERE user_id = ?').bind(userId);
		const { results } = await stmt.all<{ faq_id: number }>();

		if (!results || results.length === 0) {
			return c.json({ 
				message: `No FAQs found for user ${userId}`,
				deletedCount: 0 
			});
		}

		const faqIds = results.map(row => row.faq_id.toString());
		console.log(`[CLEAR VECTORIZE] Found ${faqIds.length} FAQs for user ${userId}, deleting from Vectorize...`);

		// Delete all vectors from Vectorize in batches
		const batchSize = 100;
		let deletedCount = 0;
		let errors: string[] = [];

		for (let i = 0; i < faqIds.length; i += batchSize) {
			const batch = faqIds.slice(i, i + batchSize);
			try {
				const result = await c.env.VECTOR_INDEX.deleteByIds(batch);
				console.log(`[CLEAR VECTORIZE] Deleted batch ${Math.floor(i / batchSize) + 1} for user ${userId}:`, result);
				deletedCount += batch.length;
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : 'Unknown error';
				console.error(`[CLEAR VECTORIZE] Error deleting batch for user ${userId}:`, errorMsg);
				errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${errorMsg}`);
			}
		}

		return c.json({
			message: `Vectorize database cleared for user ${userId}`,
			userId,
			totalFAQs: faqIds.length,
			deletedCount,
			errors: errors.length > 0 ? errors : undefined,
		});
	} catch (error) {
		console.error(`[CLEAR VECTORIZE] Error for user ${c.req.param('userId')}:`, error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return c.json({ 
			error: 'Failed to clear Vectorize database',
			details: errorMessage 
		}, 500);
	}
});

// Retrain embeddings for all FAQs (all users)
app.post('/admin/retrain-embeddings', async (c) => {
	try {
		// Get all FAQs from D1
		const stmt = c.env.DB.prepare('SELECT faq_id, user_id, question, answer FROM FAQs ORDER BY faq_id');
		const { results } = await stmt.all<{ faq_id: number; user_id: number; question: string; answer: string }>();

		if (!results || results.length === 0) {
			return c.json({ 
				message: 'No FAQs found in D1 database',
				retrainedCount: 0 
			});
		}

		console.log(`[RETRAIN EMBEDDINGS] Found ${results.length} FAQs, regenerating embeddings...`);

		let retrainedCount = 0;
		let errors: Array<{ faqId: number; error: string }> = [];

		// Process FAQs one by one to avoid overwhelming the AI service
		for (const faq of results) {
			try {
				// Generate embedding from question and answer
				const text = `${faq.question} ${faq.answer}`;
				const embeddings = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {
					text: text,
				});

				// Check if it's an async response
				if ('request_id' in embeddings) {
					throw new Error('Async embedding not supported');
				}

				// Type guard: check if it has data property
				let vectors: number[] | null = null;
				if ('data' in embeddings && embeddings.data) {
					vectors = embeddings.data[0] || null;
				}

				if (!vectors) {
					throw new Error('Embedding generation returned no data');
				}

				// Upsert to Vectorize
				await c.env.VECTOR_INDEX.upsert([
					{
						id: faq.faq_id.toString(),
						values: vectors,
						metadata: {
							userId: faq.user_id.toString(),
							question: faq.question,
							answer: faq.answer,
						},
					},
				]);

				retrainedCount++;
				console.log(`[RETRAIN EMBEDDINGS] Retrained FAQ ${faq.faq_id} (${retrainedCount}/${results.length})`);
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : 'Unknown error';
				console.error(`[RETRAIN EMBEDDINGS] Error retraining FAQ ${faq.faq_id}:`, errorMsg);
				errors.push({ faqId: faq.faq_id, error: errorMsg });
			}
		}

		return c.json({
			message: 'Embedding retraining completed',
			totalFAQs: results.length,
			retrainedCount,
			failedCount: errors.length,
			errors: errors.length > 0 ? errors : undefined,
		});
	} catch (error) {
		console.error('[RETRAIN EMBEDDINGS] Error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return c.json({ 
			error: 'Failed to retrain embeddings',
			details: errorMessage 
		}, 500);
	}
});

// Retrain embeddings for a specific user
app.post('/admin/retrain-embeddings/:userId', async (c) => {
	try {
		const userId = c.req.param('userId');

		if (!userId) {
			return c.json({ error: 'userId is required' }, 400);
		}

		// Get all FAQs for this user from D1
		const stmt = c.env.DB.prepare('SELECT faq_id, user_id, question, answer FROM FAQs WHERE user_id = ? ORDER BY faq_id').bind(userId);
		const { results } = await stmt.all<{ faq_id: number; user_id: number; question: string; answer: string }>();

		if (!results || results.length === 0) {
			return c.json({ 
				message: `No FAQs found for user ${userId}`,
				retrainedCount: 0 
			});
		}

		console.log(`[RETRAIN EMBEDDINGS] Found ${results.length} FAQs for user ${userId}, regenerating embeddings...`);

		let retrainedCount = 0;
		let errors: Array<{ faqId: number; error: string }> = [];

		// Process FAQs one by one
		for (const faq of results) {
			try {
				// Generate embedding from question and answer
				const text = `${faq.question} ${faq.answer}`;
				const embeddings = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {
					text: text,
				});

				// Check if it's an async response
				if ('request_id' in embeddings) {
					throw new Error('Async embedding not supported');
				}

				// Type guard: check if it has data property
				let vectors: number[] | null = null;
				if ('data' in embeddings && embeddings.data) {
					vectors = embeddings.data[0] || null;
				}

				if (!vectors) {
					throw new Error('Embedding generation returned no data');
				}

				// Upsert to Vectorize
				await c.env.VECTOR_INDEX.upsert([
					{
						id: faq.faq_id.toString(),
						values: vectors,
						metadata: {
							userId: faq.user_id.toString(),
							question: faq.question,
							answer: faq.answer,
						},
					},
				]);

				retrainedCount++;
				console.log(`[RETRAIN EMBEDDINGS] Retrained FAQ ${faq.faq_id} for user ${userId} (${retrainedCount}/${results.length})`);
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : 'Unknown error';
				console.error(`[RETRAIN EMBEDDINGS] Error retraining FAQ ${faq.faq_id} for user ${userId}:`, errorMsg);
				errors.push({ faqId: faq.faq_id, error: errorMsg });
			}
		}

		return c.json({
			message: `Embedding retraining completed for user ${userId}`,
			userId,
			totalFAQs: results.length,
			retrainedCount,
			failedCount: errors.length,
			errors: errors.length > 0 ? errors : undefined,
		});
	} catch (error) {
		console.error(`[RETRAIN EMBEDDINGS] Error for user ${c.req.param('userId')}:`, error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return c.json({ 
			error: 'Failed to retrain embeddings',
			details: errorMessage 
		}, 500);
	}
});

export const apiRoutes = app;

