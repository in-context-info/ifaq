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
		const chatbotOwnerUserId = c.req.query('userId');
		const chatbotOwnerUsername = c.req.query('username'); // Username from URL /<username>

		if (!question.trim()) {
			return c.json({ error: 'Question is required' }, 400);
		}

		// Get chatbot owner's userId and profile from username if provided
		// The chatbot owner is the user whose chatbot is being accessed via /<username> URL
		let chatbotOwnerId: string | number | null = chatbotOwnerUserId || null;
		let chatbotOwnerProfile: { name?: string; username?: string; bio?: string } | null = null;
		
		if (!chatbotOwnerId && chatbotOwnerUsername) {
			// Fetch full chatbot owner profile to get name, bio, etc. for personalization
			const chatbotOwner = await getUserByUsername(c.env.DB, chatbotOwnerUsername, { includeFaqs: false });
			if (!chatbotOwner) {
				return c.json({ error: 'Chatbot owner not found' }, 404);
			}
			chatbotOwnerId = chatbotOwner.userId || null;
			chatbotOwnerProfile = {
				name: chatbotOwner.name,
				username: chatbotOwner.username,
				bio: chatbotOwner.bio,
			};
		} else if (chatbotOwnerId && !chatbotOwnerUsername) {
			// If userId is provided but no username, fetch chatbot owner profile for personalization
			const userStmt = c.env.DB.prepare('SELECT user_name, first_name, last_name, user_bio FROM Users WHERE user_id = ?').bind(chatbotOwnerId);
			const chatbotOwner = await userStmt.first<{ user_name: string; first_name: string | null; last_name: string | null; user_bio: string | null }>();
			if (chatbotOwner) {
				chatbotOwnerProfile = {
					name: [chatbotOwner.first_name, chatbotOwner.last_name].filter(Boolean).join(' ') || chatbotOwner.user_name,
					username: chatbotOwner.user_name,
					bio: chatbotOwner.user_bio || undefined,
				};
			}
		}

		if (!chatbotOwnerId) {
			return c.json({ error: 'userId or username is required' }, 400);
		}

		console.log('[STEP 0] Chatbot query initiated:', { 
			question, 
			chatbotOwnerId, 
			chatbotOwnerUsername: chatbotOwnerProfile?.username 
		});

		// Step 1: Convert query to embedding
		console.log('[STEP 1] Generating embedding for query...');
		let vectors: number[] | null = null;
		try {
			const embeddings = await c.env.AI.run('@cf/baai/bge-base-en-v1.5', {
				text: question,
			});
			
			// Check if it's an async response
			if ('request_id' in embeddings) {
				console.error('[STEP 1] FAILED: Embedding generation returned async response (not supported)');
				return c.json({ 
					error: 'Failed to generate embedding',
					step: 'embedding_generation',
					details: 'Async embedding not supported'
				}, 500);
			}
			
			// Type guard: check if it has data property (not AsyncResponse)
			if ('data' in embeddings && embeddings.data) {
				vectors = embeddings.data[0] || null;
			} else {
				vectors = null;
			}
			
			if (!vectors) {
				console.error('[STEP 1] FAILED: Embedding generation returned no data');
				return c.json({ 
					error: 'Failed to generate embedding',
					step: 'embedding_generation',
					details: 'Embedding API returned empty data'
				}, 500);
			}
			console.log('[STEP 1] SUCCESS: Embedding generated, vector length:', vectors.length);
		} catch (error) {
			console.error('[STEP 1] FAILED: Error generating embedding:', error);
			return c.json({ 
				error: 'Failed to generate embedding',
				step: 'embedding_generation',
				details: error instanceof Error ? error.message : 'Unknown error'
			}, 500);
		}

		// Step 2: Query Vectorize to find similar FAQs
		// Query with topK to get candidates, then filter by userId in metadata
		// IMPORTANT: returnMetadata must be true to filter by userId
		console.log('[STEP 2] Querying Vectorize index...');
		let vectorQuery: any = null;
		try {
			vectorQuery = await c.env.VECTOR_INDEX.query(vectors, { 
				topK: 10,
				returnMetadata: true 
			});

			console.log('[STEP 2] Vectorize query results:', {
				matchesCount: vectorQuery.matches?.length || 0,
				matches: vectorQuery.matches?.map((m: any) => ({
					id: m.id,
					score: m.score,
					metadata: m.metadata
				}))
			});
			
			if (!vectorQuery.matches || vectorQuery.matches.length === 0) {
				console.log('[STEP 2] WARNING: Vectorize returned no matches');
			} else {
				console.log(`[STEP 2] SUCCESS: Vectorize returned ${vectorQuery.matches.length} matches`);
			}
		} catch (error) {
			console.error('[STEP 2] FAILED: Error querying Vectorize:', error);
			// Continue to fallback instead of failing completely
			vectorQuery = { matches: [] };
		}

		// Step 2.5: Filter matches by userId
		console.log('[STEP 2.5] Filtering matches by userId...');
		let matchingFaqIds: string[] = [];
		if (vectorQuery.matches && vectorQuery.matches.length > 0) {
			// Filter matches by userId in metadata to ensure we only get the chatbot owner's FAQs
			const beforeFilterCount = vectorQuery.matches.length;
			matchingFaqIds = vectorQuery.matches
				.filter((match: any) => {
					const metadata = match.metadata as { userId?: string | number } | undefined;
					const matchUserId = metadata?.userId?.toString();
					const ownerId = chatbotOwnerId?.toString();
					const matches = matchUserId === ownerId;
					
					if (!matches) {
						console.log(`[STEP 2.5] Filtered out FAQ ${match.id}: userId mismatch (${matchUserId} !== ${ownerId})`);
					}
					return matches;
				})
				.slice(0, 5) // Limit to top 5 after filtering
				.map((match: any) => match.id);
			
			console.log(`[STEP 2.5] Filtered ${beforeFilterCount} matches to ${matchingFaqIds.length} matching FAQs`);
		} else {
			console.log('[STEP 2.5] No matches to filter');
		}

		// Step 3: Retrieve matching FAQs from D1 (only chatbot owner's FAQs)
		console.log('[STEP 3] Retrieving FAQs from D1...');
		let faqs: DbFaq[] = [];
		if (matchingFaqIds.length > 0) {
			try {
				// Build query with IN clause for multiple IDs
				const placeholders = matchingFaqIds.map(() => '?').join(',');
				const query = `SELECT faq_id, user_id, question, answer, created_at, modified_at 
					FROM FAQs 
					WHERE faq_id IN (${placeholders}) AND user_id = ? 
					ORDER BY faq_id`;
				
				// Convert FAQ IDs to numbers for the query
				const faqIdNumbers = matchingFaqIds.map(id => parseInt(id, 10));
				console.log(`[STEP 3] Querying D1 with FAQ IDs:`, faqIdNumbers, `for userId:`, chatbotOwnerId);
				
				const stmt = c.env.DB.prepare(query).bind(...faqIdNumbers, chatbotOwnerId);
				const { results } = await stmt.all<DbFaq>();
				
				if (results) {
					faqs = results;
					console.log(`[STEP 3] SUCCESS: Retrieved ${faqs.length} FAQs from D1`);
				} else {
					console.log('[STEP 3] WARNING: D1 query returned no results');
				}
			} catch (error) {
				console.error('[STEP 3] FAILED: Error querying D1:', error);
				// Continue to fallback
			}
		} else {
			// Fallback: If Vectorize returns no matches, try to get all FAQs for the user
			// This handles cases where Vectorize might be empty or the query doesn't match
			console.log('[STEP 3] FALLBACK: No Vectorize matches found, querying all FAQs for user from D1...');
			try {
				const fallbackStmt = c.env.DB.prepare(
					'SELECT faq_id, user_id, question, answer, created_at, modified_at FROM FAQs WHERE user_id = ? ORDER BY created_at DESC LIMIT 5'
				).bind(chatbotOwnerId);
				const { results: fallbackResults } = await fallbackStmt.all<DbFaq>();
				
				if (fallbackResults && fallbackResults.length > 0) {
					console.log(`[STEP 3] FALLBACK SUCCESS: Found ${fallbackResults.length} FAQs from D1`);
					faqs = fallbackResults;
				} else {
					console.log('[STEP 3] FALLBACK: No FAQs found in D1 for user');
				}
			} catch (error) {
				console.error('[STEP 3] FALLBACK FAILED: Error querying D1 fallback:', error);
			}
		}

		console.log(`[STEP 3] FINAL: Total FAQs retrieved: ${faqs.length}`);

		// Step 4: Build context from FAQs
		console.log('[STEP 4] Building context from FAQs...');
		const contextMessage = faqs.length
			? `Context from knowledge base:\n${faqs
					.map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`)
					.join('\n\n')}`
			: '';
		console.log(`[STEP 4] Context message length: ${contextMessage.length} characters`);

		// Step 5: Build personalized system prompt
		console.log('[STEP 5] Building system prompt...');
		// chatbotOwnerProfile is the user whose chatbot is being accessed (from URL /<username>)
		const chatbotOwnerName = chatbotOwnerProfile?.name || 'the owner';
		const chatbotOwnerBio = chatbotOwnerProfile?.bio;
		const chatbotOwnerContext = chatbotOwnerBio ? `\n\nAbout ${chatbotOwnerName}: ${chatbotOwnerBio}` : '';
		
		const systemPrompt = faqs.length
			? `You are ${chatbotOwnerName}'s AI assistant. You are trained to answer questions based on ${chatbotOwnerName}'s knowledge base.${chatbotOwnerContext}

Use the context provided from the knowledge base to answer the user's question. 
If the context contains relevant information, use it to provide a detailed and accurate answer in ${chatbotOwnerName}'s voice and style.
If the context doesn't contain relevant information, politely let the user know that you don't have that information in ${chatbotOwnerName}'s knowledge base, but you can try to help with general questions.`
			: `You are ${chatbotOwnerName}'s AI assistant.${chatbotOwnerContext}

The user is asking a question, but there is no relevant information in ${chatbotOwnerName}'s knowledge base. 
Politely let the user know that you don't have specific information about that topic in ${chatbotOwnerName}'s knowledge base, but you can try to help with general questions.`;
		console.log(`[STEP 5] System prompt built (${systemPrompt.length} characters)`);

		// Step 6: Call LLM with RAG context
		console.log('[STEP 6] Calling LLM...');
		const messages: Array<{ role: string; content: string }> = [
			{ role: 'system', content: systemPrompt },
		];

		if (contextMessage) {
			messages.push({ role: 'system', content: contextMessage });
		}

		messages.push({ role: 'user', content: question });

		console.log(`[STEP 6] Sending ${messages.length} messages to LLM`);

		let answer: string;
		try {
			const llmResponse = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
				messages,
			});

			answer = llmResponse.response || 'I apologize, but I could not generate a response.';
			console.log('[STEP 6] SUCCESS: LLM response generated');
		} catch (error) {
			console.error('[STEP 6] FAILED: Error calling LLM:', error);
			answer = "I'm sorry, I encountered an error while processing your question. Please try again later.";
		}

		// Check if debug mode is enabled
		const debug = c.req.query('debug') === 'true';

		const response: any = {
			answer,
			contextUsed: faqs.length > 0,
			faqsUsed: faqs.length,
		};

		// Include debug information if requested
		if (debug) {
			response.debug = {
				steps: {
					step0: 'Chatbot query initiated',
					step1: 'Embedding generation',
					step2: 'Vectorize query',
					step2_5: 'UserId filtering',
					step3: 'D1 retrieval',
					step4: 'Context building',
					step5: 'Prompt building',
					step6: 'LLM generation'
				},
				vectorizeMatches: vectorQuery?.matches?.length || 0,
				matchingFaqIds: matchingFaqIds,
				faqsRetrieved: faqs.length,
				chatbotOwnerId: chatbotOwnerId?.toString(),
				chatbotOwnerUsername: chatbotOwnerProfile?.username
			};
		}

		return c.json(response);
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

