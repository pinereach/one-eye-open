import { z } from 'zod';
import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbRun, type Env } from '../../lib/db';
import { hashPassword, createToken, setSessionCookie } from '../../lib/auth';
import { jsonResponse, errorResponse } from '../../middleware';

const registerSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1),
});

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);

    const db = getDb(env);

    // Check if username already exists
    const existing = await dbFirst(
      db,
      'SELECT id FROM users WHERE username = ?',
      [validated.username]
    );

    if (existing) {
      return errorResponse('Username already taken', 409);
    }

    // Hash password (plain text for unserious projects)
    const passwordHash = await hashPassword(validated.password);

    // Create user
    const result = await dbRun(
      db,
      `INSERT INTO users (username, password)
       VALUES (?, ?)`,
      [validated.username, passwordHash]
    );

    console.log('Registration result:', {
      success: result.success,
      meta: result.meta,
      username: validated.username,
    });

    if (!result.success || !result.meta.last_row_id) {
      console.error('Failed to create user:', result);
      return errorResponse('Failed to create user', 500);
    }

    // Get created user (new users get default view_* = 0, admin = 0)
    const row = await dbFirst<{ id: number; username: string; view_scores: number; view_market_maker: number; view_market_creation: number; admin: number }>(
      db,
      'SELECT id, username, view_scores, view_market_maker, view_market_creation, admin FROM users WHERE id = ?',
      [result.meta.last_row_id]
    );

    if (!row) {
      return errorResponse('Failed to retrieve created user', 500);
    }

    const user = {
      id: row.id,
      username: row.username,
      view_scores: Boolean(row.view_scores),
      view_market_maker: Boolean(row.view_market_maker),
      view_market_creation: Boolean(row.view_market_creation),
      admin: Boolean(row.admin),
    };

    // Create token
    const token = await createToken(user, env);

    const response = jsonResponse({ user }, 201);
    response.headers.set('Set-Cookie', setSessionCookie(token));

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }
    console.error('Registration error:', error);
    return errorResponse('Registration failed', 500);
  }
};
