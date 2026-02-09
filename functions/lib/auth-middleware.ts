import { getUserFromToken, getCookieValue, type User } from './auth';
import { getDb, type Env } from './db';
import { errorResponse } from './response';

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
    return { error: errorResponse('Unauthorized', 401) };
  }

  const db = getDb(env);
  const user = await getUserFromToken(db, token, env);

  if (!user) {
    return { error: errorResponse('Invalid session', 401) };
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
    return { error: errorResponse('Forbidden', 403) };
  }
  return { user: authResult.user };
}
