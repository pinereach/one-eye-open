import type { OnRequest } from '@cloudflare/pages';

export const onRequest: OnRequest = async (context) => {
  const { request, next } = context;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    const requestId = crypto.randomUUID().slice(0, 8);
    const start = Date.now();
    const response = await next();
    const durationMs = Date.now() - start;
    console.log(JSON.stringify({ requestId, method: request.method, path: url.pathname, durationMs }));
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (request.method === 'OPTIONS') {
      const opt = new Response(null, { status: 204 });
      opt.headers.set('Access-Control-Allow-Origin', '*');
      opt.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      opt.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return opt;
    }

    return response;
  }

  return next();
};
