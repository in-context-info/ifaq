/**
 * Server-side API routes for Cloudflare Worker using Hono
 */

import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { handleAuthEndpoint } from './authHandler';
import { handleGetCurrentUser, handleCreateUser } from './userService';

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

app.post('/users', handleCreateUser);

// FAQ routes
app.post('/faqs', async (c) => {
	const { userId, question, answer } = await c.req.json();
	
	if (!question || !answer) {
		return c.text('Missing question or answer', 400);
	}
	
	if (!userId) {
		return c.text('Missing userId', 400);
	}
	
	try {
		await c.env.FAQ_WORKFLOW.create({
			params: {
				userId,
				question,
				answer,
			},
		});
		return c.text('Created FAQ', 201);
	} catch (error) {
		console.error('Error creating FAQ:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return c.json({ 
			error: 'Failed to create FAQ',
			details: errorMessage
		}, 500);
	}
});

export const apiRoutes = app;

