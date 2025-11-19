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

		const existingFaq = await getFaqById(c.env.DB, faqId);

		if (!existingFaq || existingFaq.user_id.toString() !== userId.toString()) {
			return c.json({ error: 'FAQ not found' }, 404);
		}

		const deleteResult = await c.env.DB.prepare(
			'DELETE FROM FAQs WHERE faq_id = ? AND user_id = ?'
		)
			.bind(faqId, userId)
			.run();

		if (!deleteResult.success) {
			return c.json({ error: deleteResult.error || 'Failed to delete FAQ' }, 500);
		}

		await c.env.VECTOR_INDEX.delete([faqId.toString()]);

		return c.json({ message: 'FAQ deleted' });
	} catch (error) {
		console.error('Error deleting FAQ:', error);
		const message = error instanceof Error ? error.message : 'Unknown error';
		return c.json({ error: message }, 500);
	}
}

