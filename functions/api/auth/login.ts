import { z } from 'zod';
import type { OnRequest } from '@cloudflare/pages';
import { getDb, dbFirst, type Env } from '../../lib/db';
import { verifyPassword, createToken, setSessionCookie } from '../../lib/auth';
import { jsonResponse, errorResponse } from '../../middleware';

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const onRequestPost: OnRequest<Env> = async (context) => {
  const { request, env } = context;

  try {
    const body = await request.json();
    const validated = loginSchema.parse(body);

    const db = getDb(env);

    // Find user by username (try with flag columns first; fallback if migrations not run)
    let user: {
      id: number;
      username: string;
      password: string;
      view_scores?: number;
      view_market_maker?: number;
      view_market_creation?: number;
      admin?: number;
    } | null = null;

    try {
      user = await dbFirst<{
        id: number;
        username: string;
        password: string;
        view_scores: number;
        view_market_maker: number;
        view_market_creation: number;
        admin: number;
      }>(
        db,
        'SELECT id, username, password, view_scores, view_market_maker, view_market_creation, admin FROM users WHERE LOWER(username) = LOWER(?)',
        [validated.username]
      );
    } catch {
      user = await dbFirst<{ id: number; username: string; password: string }>(
        db,
        'SELECT id, username, password FROM users WHERE LOWER(username) = LOWER(?)',
        [validated.username]
      );
    }

    // Validate user exists
    if (!user) {
      return errorResponse('Invalid username or password', 401);
    }

    // Validate password matches database
    const isValid = await verifyPassword(validated.password, user.password);
    if (!isValid) {
      return errorResponse('Invalid username or password', 401);
    }

    // Create authentication token
    const userForToken = {
      id: user.id,
      username: user.username,
    };
    const token = await createToken(userForToken, env);

    // Return user (without password, with boolean flags; default flags to false if columns missing)
    const userWithoutPassword = {
      id: user.id,
      username: user.username,
      view_scores: Boolean(user.view_scores ?? 0),
      view_market_maker: Boolean(user.view_market_maker ?? 0),
      view_market_creation: Boolean(user.view_market_creation ?? 0),
      admin: Boolean(user.admin ?? 0),
    };

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
