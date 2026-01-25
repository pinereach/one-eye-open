import { getSessionByToken, getCookieValue, type User } from './lib/auth.ts';
import { getDb, type Env } from './lib/db.ts';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function requireAuth(
  request: Request,
  env: Env
): Promise<{ user: User; error?: never } | { user?: never; error: Response }> {
  const cookieHeader = request.headers.get('Cookie');
  const token = getCookieValue(cookieHeader, 'session');

  if (!token) {
    return {
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  const db = getDb(env);
  const sessionData = await getSessionByToken(db, token);

  if (!sessionData) {
    return {
      error: new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  return { user: sessionData.user };
}

export async function requireAdmin(
  request: Request,
  env: Env
): Promise<{ user: User; error?: never } | { user?: never; error: Response }> {
  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult;
  }

  if (authResult.user.role !== 'admin') {
    return {
      error: new Response(JSON.stringify({ error: 'Forbidden: Admin only' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  return authResult;
}

export function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status: number = 400): Response {
  return jsonResponse({ error: message }, status);
}
