import { z } from 'zod';
import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, dbRun, type Env } from '../../lib/db.ts';
import { hashPassword, createSession, setSessionCookie } from '../../lib/auth.ts';
import { jsonResponse, errorResponse } from '../../middleware.ts';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100),
});

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);

    const db = getDb(env);

    // Check if email already exists
    const existing = await dbFirst(
      db,
      'SELECT id FROM users WHERE email = ?',
      [validated.email]
    );

    if (existing) {
      return errorResponse('Email already registered', 409);
    }

    // Hash password
    const passwordHash = await hashPassword(validated.password);

    // Create user
    const userId = crypto.randomUUID();
    await dbRun(
      db,
      `INSERT INTO users (id, email, password_hash, display_name, role, created_at)
       VALUES (?, ?, ?, ?, 'user', ?)`,
      [userId, validated.email, passwordHash, validated.displayName, Math.floor(Date.now() / 1000)]
    );

    // Create session
    const token = crypto.randomUUID();
    await createSession(db, userId, token);

    // Return user (without password)
    const user = await dbFirst(
      db,
      'SELECT id, email, display_name, role, created_at FROM users WHERE id = ?',
      [userId]
    );

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
