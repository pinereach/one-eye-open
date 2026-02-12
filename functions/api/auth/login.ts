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

    const usernameTrimmed = validated.username.trim();

    // Find user by username (case-insensitive, so "John" and "john" both work)
    const user = await dbFirst<{
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
      [usernameTrimmed]
    );

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

    // Return user (without password, with boolean flags)
    const { password, ...rest } = user;
    const userWithoutPassword = {
      id: rest.id,
      username: rest.username,
      view_scores: Boolean(rest.view_scores),
      view_market_maker: Boolean(rest.view_market_maker),
      view_market_creation: Boolean(rest.view_market_creation),
      admin: Boolean(rest.admin),
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
