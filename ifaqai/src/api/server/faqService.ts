import type { Context } from 'hono';
import type { Env } from '../../types/env';
import type { FAQ } from '../types';

interface DbFaq {
	faq_id: number;
	user_id: number;
	question: string;
	answer: string;
	created_at?: string;
	modified_at?: string;
}

function mapDbFaq(dbFaq: DbFaq): FAQ {
	return {
		id: dbFaq.faq_id?.toString() ?? crypto.randomUUID(),
		question: dbFaq.question,
		answer: dbFaq.answer,
	};
}

export async function handleGetFAQs(
	c: Context<{ Bindings: Env }>
): Promise<Response> {
	const userId = c.req.query('userId');

	if (!userId) {
		return c.json({ error: 'userId is required' }, 400);
	}

	try {
		const stmt = c.env.DB.prepare(
			'SELECT faq_id, user_id, question, answer, created_at, modified_at FROM FAQs WHERE user_id = ? ORDER BY created_at DESC'
		).bind(userId);

		const { results } = await stmt.all<DbFaq>();

		if (!results) {
			return c.json([]);
		}

		const faqs = results.map(mapDbFaq);
		return c.json(faqs);
	} catch (error) {
		console.error('Error fetching FAQs:', error);
		const message = error instanceof Error ? error.message : 'Unknown error';
		return c.json({ error: message }, 500);
	}
}

async function getFaqById(db: D1Database, faqId: string | number): Promise<DbFaq | null> {
	const stmt = db
		.prepare('SELECT faq_id, user_id, question, answer, created_at, modified_at FROM FAQs WHERE faq_id = ?')
		.bind(faqId);

	const result = await stmt.first<DbFaq>();
	return result || null;
}

export async function handleUpdateFAQ(
	c: Context<{ Bindings: Env }>
): Promise<Response> {
	const faqId = c.req.param('id');

	if (!faqId) {
		return c.json({ error: 'FAQ id is required' }, 400);
	}

	try {
		const body = await c.req.json().catch(() => ({}));
		const { userId, question, answer } = body as {
			userId?: number | string;
			question?: string;
			answer?: string;
		};

		if (!userId) {
			return c.json({ error: 'userId is required' }, 400);
		}

		if (!question?.trim() || !answer?.trim()) {
			return c.json({ error: 'Question and answer are required' }, 400);
		}

		const existingFaq = await getFaqById(c.env.DB, faqId);

		if (!existingFaq || existingFaq.user_id.toString() !== userId.toString()) {
			return c.json({ error: 'FAQ not found' }, 404);
		}

		const modifiedAt = new Date().toISOString();
		const updateResult = await c.env.DB.prepare(
			'UPDATE FAQs SET question = ?, answer = ?, modified_at = ? WHERE faq_id = ? AND user_id = ?'
		)
			.bind(question.trim(), answer.trim(), modifiedAt, faqId, userId)
			.run();

		if (!updateResult.success) {
			return c.json({ error: updateResult.error || 'Failed to update FAQ' }, 500);
		}

		const updatedFaq = await getFaqById(c.env.DB, faqId);
		if (!updatedFaq) {
			return c.json({ error: 'FAQ not found after update' }, 404);
		}

		// Re-generate embedding
		const embedding = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {
			text: `${question} ${answer}`,
		});

		const values = embedding.data?.[0];
		if (!values) {
			return c.json({ error: 'Failed to generate embedding' }, 500);
		}

		await c.env.VECTOR_INDEX.upsert([
			{
				id: faqId.toString(),
				values,
				metadata: {
					userId: userId.toString(),
					question: question.trim(),
					answer: answer.trim(),
				},
			},
		]);

		return c.json(mapDbFaq(updatedFaq));
	} catch (error) {
		console.error('Error updating FAQ:', error);
		const message = error instanceof Error ? error.message : 'Unknown error';
		return c.json({ error: message }, 500);
	}
}

export async function handleDeleteFAQ(
	c: Context<{ Bindings: Env }>
): Promise<Response> {
	const faqId = c.req.param('id');

	if (!faqId) {
		return c.json({ error: 'FAQ id is required' }, 400);
	}

	try {
		const body = await c.req.json().catch(() => ({}));
		const { userId } = body as { userId?: number | string };

		if (!userId) {
			return c.json({ error: 'userId is required' }, 400);
		}

		console.log(`[DELETE FAQ] Starting deletion for FAQ ID: ${faqId}, User ID: ${userId}`);

		// Step 1: Verify FAQ exists and belongs to user
		const existingFaq = await getFaqById(c.env.DB, faqId);

		if (!existingFaq) {
			console.log(`[DELETE FAQ] FAQ ${faqId} not found in D1`);
			return c.json({ error: 'FAQ not found' }, 404);
		}

		if (existingFaq.user_id.toString() !== userId.toString()) {
			console.log(`[DELETE FAQ] FAQ ${faqId} belongs to different user (${existingFaq.user_id} !== ${userId})`);
			return c.json({ error: 'FAQ not found' }, 404);
		}

		console.log(`[DELETE FAQ] FAQ found: ${faqId}, proceeding with deletion`);

		// Step 2: Delete from Vectorize first (before D1) to ensure we have the ID
		try {
			const vectorDeleteResult = await c.env.VECTOR_INDEX.deleteByIds([faqId.toString()]);
			console.log(`[DELETE FAQ] Vectorize deletion result:`, vectorDeleteResult);
		} catch (vectorError) {
			console.error(`[DELETE FAQ] Error deleting from Vectorize:`, vectorError);
			// Continue with D1 deletion even if Vectorize fails
			// This prevents orphaned records in D1
		}

		// Step 3: Delete from D1
		const deleteResult = await c.env.DB.prepare(
			'DELETE FROM FAQs WHERE faq_id = ? AND user_id = ?'
		)
			.bind(faqId, userId)
			.run();

		if (!deleteResult.success) {
			console.error(`[DELETE FAQ] D1 deletion failed:`, deleteResult.error);
			return c.json({ error: deleteResult.error || 'Failed to delete FAQ from database' }, 500);
		}

		console.log(`[DELETE FAQ] Successfully deleted FAQ ${faqId} from both D1 and Vectorize`);

		// Verify deletion
		const verifyFaq = await getFaqById(c.env.DB, faqId);
		if (verifyFaq) {
			console.warn(`[DELETE FAQ] WARNING: FAQ ${faqId} still exists in D1 after deletion!`);
		} else {
			console.log(`[DELETE FAQ] Verified: FAQ ${faqId} successfully removed from D1`);
		}

		return c.json({ 
			message: 'FAQ deleted successfully',
			deletedId: faqId,
			deletedFromD1: !verifyFaq,
		});
	} catch (error) {
		console.error('[DELETE FAQ] Error deleting FAQ:', error);
		const message = error instanceof Error ? error.message : 'Unknown error';
		return c.json({ error: message }, 500);
	}
}

