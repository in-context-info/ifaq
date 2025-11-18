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

export const apiRoutes = app;

