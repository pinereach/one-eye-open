import { z } from 'zod';
import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, type Env } from '../../lib/db';
import { verifyPassword, createSession, setSessionCookie } from '../../lib/auth';
import { jsonResponse, errorResponse } from '../../middleware';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json();
    const validated = loginSchema.parse(body);

    const db = getDb(env);

    // Find user by email
    const user = await dbFirst<{
      id: string;
      email: string;
      password_hash: string;
      display_name: string;
      role: string;
      created_at: number;
    }>(
      db,
      'SELECT id, email, password_hash, display_name, role, created_at FROM users WHERE email = ?',
      [validated.email]
    );

    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    // Verify password
    const isValid = await verifyPassword(validated.password, user.password_hash);
    if (!isValid) {
      return errorResponse('Invalid email or password', 401);
    }

    // Create session
    const token = crypto.randomUUID();
    await createSession(db, user.id, token);

    // Return user (without password)
    const { password_hash, ...userWithoutPassword } = user;

    const response = jsonResponse({ user: userWithoutPassword });
    response.headers.set('Set-Cookie', setSessionCookie(token));

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.errors[0].message, 400);
    }
    console.error('Login error:', error);
    return errorResponse('Login failed', 500);
  }
};
