import type { OnRequest } from '@cloudflare/pages';

export const onRequest: OnRequest = async (context) => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Handle CORS for API routes
  if (url.pathname.startsWith('/api/')) {
    const response = await next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204 });
    }

    return response;
  }

  return next();
};
