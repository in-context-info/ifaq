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

export const apiRoutes = app;

