import { getUserFromToken, getCookieValue, type User } from './lib/auth';
import { getDb, type Env } from './lib/db';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Dev bypass only when ENVIRONMENT is not production and request URL is clearly local.
export function isAuthRequired(env: Env, request: Request): boolean {
  const url = request.url;
  const isLocal =
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.includes(':8788') ||
    url.includes(':3000');
  return env.ENVIRONMENT === 'production' || !isLocal;
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
  const user = await getUserFromToken(db, token, env);

  if (!user) {
    return {
      error: new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  return { user };
}

export async function requireAdmin(
  request: Request,
  env: Env
): Promise<{ user: User; error?: never } | { user?: never; error: Response }> {
  const authResult = await requireAuth(request, env);
  if ('error' in authResult) {
    return authResult;
  }
  if (!authResult.user.admin) {
    return {
      error: new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }
  return { user: authResult.user };
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
