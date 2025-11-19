/**
 * Chatbot service using RAG (Retrieval-Augmented Generation)
 * Queries Vectorize to find relevant FAQs and uses them as context for LLM
 */

import type { Context } from 'hono';
import type { Env } from '../../types/env';
import { getUserByUsername } from './userService';

interface DbFaq {
	faq_id: number;
	user_id: number;
	question: string;
	answer: string;
	created_at?: string;
	modified_at?: string;
}

/**
 * Handle chatbot query using RAG
 * 1. Convert user query to embedding
 * 2. Query Vectorize to find similar FAQs (filtered by userId)
 * 3. Retrieve matching FAQs from D1
 * 4. Use FAQs as context in LLM prompt
 * 5. Return LLM response
 */
export async function handleChatbotQuery(
	c: Context<{ Bindings: Env }>
): Promise<Response> {
	try {
		const question = c.req.query('text') || c.req.query('question') || '';
		const userId = c.req.query('userId');
		const username = c.req.query('username');

		if (!question.trim()) {
			return c.json({ error: 'Question is required' }, 400);
		}

		// Get userId and user profile from username if provided
		let targetUserId: string | number | null = userId;
		let userProfile: { name?: string; username?: string; bio?: string } | null = null;
		
		if (!targetUserId && username) {
			// Fetch full user profile to get name, bio, etc. for personalization
			const user = await getUserByUsername(c.env.DB, username, { includeFaqs: false });
			if (!user) {
				return c.json({ error: 'User not found' }, 404);
			}
			targetUserId = user.userId;
			userProfile = {
				name: user.name,
				username: user.username,
				bio: user.bio,
			};
		} else if (targetUserId && !username) {
			// If userId is provided but no username, fetch user profile for personalization
			const userStmt = c.env.DB.prepare('SELECT user_name, first_name, last_name, user_bio FROM Users WHERE user_id = ?').bind(targetUserId);
			const user = await userStmt.first<{ user_name: string; first_name: string | null; last_name: string | null; user_bio: string | null }>();
			if (user) {
				userProfile = {
					name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.user_name,
					username: user.user_name,
					bio: user.user_bio || undefined,
				};
			}
		}

		if (!targetUserId) {
			return c.json({ error: 'userId or username is required' }, 400);
		}

		console.log('Chatbot query:', { question, userId: targetUserId, username: userProfile?.username });

		// Step 1: Convert query to embedding
		const embeddings = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {
			text: question,
		});
		const vectors = embeddings.data[0];

		if (!vectors) {
			return c.json({ error: 'Failed to generate embedding' }, 500);
		}

		// Step 2: Query Vectorize to find similar FAQs
		// Query with topK to get candidates, then filter by userId in metadata
		const vectorQuery = await c.env.VECTOR_INDEX.query(vectors, { topK: 10 });

		let matchingFaqIds: string[] = [];
		if (vectorQuery.matches && vectorQuery.matches.length > 0) {
			// Filter matches by userId in metadata to ensure we only get this user's FAQs
			matchingFaqIds = vectorQuery.matches
				.filter((match) => {
					const metadata = match.metadata as { userId?: string | number } | undefined;
					return metadata?.userId?.toString() === targetUserId?.toString();
				})
				.slice(0, 5) // Limit to top 5 after filtering
				.map((match) => match.id);
		}

		console.log('Found matching FAQ IDs:', matchingFaqIds);

		// Step 3: Retrieve matching FAQs from D1
		let faqs: DbFaq[] = [];
		if (matchingFaqIds.length > 0) {
			// Build query with IN clause for multiple IDs
			const placeholders = matchingFaqIds.map(() => '?').join(',');
			const query = `SELECT faq_id, user_id, question, answer, created_at, modified_at 
				FROM FAQs 
				WHERE faq_id IN (${placeholders}) AND user_id = ? 
				ORDER BY faq_id`;
			
			// Convert FAQ IDs to numbers for the query
			const faqIdNumbers = matchingFaqIds.map(id => parseInt(id, 10));
			const stmt = c.env.DB.prepare(query).bind(...faqIdNumbers, targetUserId);
			const { results } = await stmt.all<DbFaq>();
			
			if (results) {
				faqs = results;
			}
		}

		console.log('Retrieved FAQs:', faqs.length);

		// Step 4: Build context from FAQs
		const contextMessage = faqs.length
			? `Context from knowledge base:\n${faqs
					.map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`)
					.join('\n\n')}`
			: '';

		// Step 5: Build personalized system prompt
		const ownerName = userProfile?.name || 'the owner';
		const ownerBio = userProfile?.bio;
		const ownerContext = ownerBio ? `\n\nAbout ${ownerName}: ${ownerBio}` : '';
		
		const systemPrompt = faqs.length
			? `You are ${ownerName}'s AI assistant. You are trained to answer questions based on ${ownerName}'s knowledge base.${ownerContext}

Use the context provided from the knowledge base to answer the user's question. 
If the context contains relevant information, use it to provide a detailed and accurate answer in ${ownerName}'s voice and style.
If the context doesn't contain relevant information, politely let the user know that you don't have that information in ${ownerName}'s knowledge base, but you can try to help with general questions.`
			: `You are ${ownerName}'s AI assistant.${ownerContext}

The user is asking a question, but there is no relevant information in ${ownerName}'s knowledge base. 
Politely let the user know that you don't have specific information about that topic in ${ownerName}'s knowledge base, but you can try to help with general questions.`;

		// Step 6: Call LLM with RAG context
		const messages: Array<{ role: string; content: string }> = [
			{ role: 'system', content: systemPrompt },
		];

		if (contextMessage) {
			messages.push({ role: 'system', content: contextMessage });
		}

		messages.push({ role: 'user', content: question });

		console.log('Calling LLM with messages:', messages.length);

		const llmResponse = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
			messages,
		});

		const answer = llmResponse.response || llmResponse.text || 'I apologize, but I could not generate a response.';

		console.log('LLM response generated');

		return c.json({
			answer,
			contextUsed: faqs.length > 0,
			faqsUsed: faqs.length,
		});
	} catch (error) {
		console.error('Error in chatbot query:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		const errorStack = error instanceof Error ? error.stack : undefined;
		return c.json(
			{
				error: 'Failed to process chatbot query',
				details: errorMessage,
				...(errorStack && { stack: errorStack }),
			},
			500
		);
	}
}

