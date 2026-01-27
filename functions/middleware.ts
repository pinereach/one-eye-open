import { getUserFromToken, getCookieValue, type User } from './lib/auth';
import { getDb, type Env } from './lib/db';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Feature flag: disable auth in development
export function isAuthRequired(env: Env, request: Request): boolean {
  // Check if we're in production
  // In Cloudflare Pages, ENVIRONMENT is set to 'production' in production
  // For local dev, we can check the hostname or use an env var
  const isProduction = env.ENVIRONMENT === 'production' || 
                      (!request.url.includes('localhost') && 
                       !request.url.includes('127.0.0.1') && 
                       !request.url.includes(':8788') &&
                       !request.url.includes(':3000'));
  
  // Disable auth in development (when not in production)
  return isProduction;
}

export async function requireAuth(
  request: Request,
  env: Env
): Promise<{ user: User; error?: never } | { user?: never; error: Response }> {
  // Skip auth in development
  if (!isAuthRequired(env, request)) {
    // Return a mock user for development
    return {
      user: {
        id: 1,
        username: 'dev-user',
      },
    };
  }

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

// requireAdmin removed - users no longer have roles
// If admin functionality is needed, it can be added back with a separate admin_users table or similar

export function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status: number = 400): Response {
  return jsonResponse({ error: message }, status);
}
