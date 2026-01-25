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

    if (!result.meta.last_row_id) {
      return errorResponse('Failed to create user', 500);
    }

    // Get created user
    const user = await dbFirst<{ id: number; username: string }>(
      db,
      'SELECT id, username FROM users WHERE id = ?',
      [result.meta.last_row_id]
    );

    if (!user) {
      return errorResponse('Failed to retrieve created user', 500);
    }

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
