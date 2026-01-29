import { z } from 'zod';
import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbRun, type Env } from '../../lib/db';
import { hashPassword, createToken, setSessionCookie } from '../../lib/auth';
import { jsonResponse, errorResponse } from '../../middleware';

const registerSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').max(100, 'Username too long'),
  password: z.string().trim().min(1, 'Password is required'),
});

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);

    const db = getDb(env);

    // Check if username already exists (case-insensitive)
    const existing = await dbFirst(
      db,
      'SELECT id FROM users WHERE LOWER(username) = LOWER(?)',
      [validated.username]
    );

    if (existing) {
      return errorResponse('Username already taken', 409);
    }

    // Hash password (plain text for unserious projects)
    const passwordHash = await hashPassword(validated.password);

    // Create user (try with flag columns first; fallback if migrations not run)
    let lastId: number | undefined;
    try {
      const result = await dbRun(
        db,
        `INSERT INTO users (username, password, view_scores, view_market_maker, view_market_creation, admin)
         VALUES (?, ?, 0, 0, 0, 0)`,
        [validated.username, passwordHash]
      );
      lastId = result.meta?.last_row_id as number | undefined;
    } catch (err: any) {
      if (err?.message?.includes('no such column')) {
        const result = await dbRun(
          db,
          `INSERT INTO users (username, password) VALUES (?, ?)`,
          [validated.username, passwordHash]
        );
        lastId = result.meta?.last_row_id as number | undefined;
      } else {
        throw err;
      }
    }

    console.log('Registration result:', { username: validated.username, lastId });

    if (lastId == null) {
      return errorResponse('Failed to create user', 500);
    }

    // Get created user (try with flag columns; fallback if migrations not run)
    let row: { id: number; username: string; view_scores?: number; view_market_maker?: number; view_market_creation?: number; admin?: number } | null = null;

    try {
      row = await dbFirst<{ id: number; username: string; view_scores: number; view_market_maker: number; view_market_creation: number; admin: number }>(
        db,
        'SELECT id, username, view_scores, view_market_maker, view_market_creation, admin FROM users WHERE id = ?',
        [lastId]
      );
    } catch {
      row = await dbFirst<{ id: number; username: string }>(
        db,
        'SELECT id, username FROM users WHERE id = ?',
        [lastId]
      );
    }

    if (!row) {
      return errorResponse('Failed to retrieve created user', 500);
    }

    const user = {
      id: row.id,
      username: row.username,
      view_scores: Boolean(row.view_scores ?? 0),
      view_market_maker: Boolean(row.view_market_maker ?? 0),
      view_market_creation: Boolean(row.view_market_creation ?? 0),
      admin: Boolean(row.admin ?? 0),
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
