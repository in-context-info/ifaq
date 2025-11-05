/**
 * Server-side API routes for Cloudflare Worker using Hono
 */

import { Hono } from 'hono';
import type { Env } from '../../types/env';
import { handleAuthEndpoint } from './authHandler';
import { handleGetCurrentUser, handleCreateUser } from './userService';

const app = new Hono<{ Bindings: Env }>();

// Auth routes
app.get('/auth/me', async (c) => {
	return handleAuthEndpoint(c.req.raw);
});

// User routes
app.get('/users/me', async (c) => {
	return handleGetCurrentUser(c.req.raw, { DB: c.env.DB });
});

app.post('/users', async (c) => {
	return handleCreateUser(c.req.raw, { DB: c.env.DB });
});

export const apiRoutes = app;