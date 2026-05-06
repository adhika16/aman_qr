import { handleSecurityCheck } from './handlers/security-check';

export interface Env {
  GOOGLE_SAFE_BROWSING_API_KEY: string;
  RATE_LIMIT_REQUESTS?: string;
  RATE_LIMIT_WINDOW?: string;
  CACHE_TTL?: string;
  AMANQR_CACHE: Cache;
  AMANQR_RATE_LIMIT: KVNamespace;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    
    // Route: /api/security-check
    if (url.pathname === '/api/security-check') {
      return handleSecurityCheck(request, env);
    }
    
    // Route: /health - Health check endpoint
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          timestamp: Date.now(),
          version: '1.0.0',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
    
    // 404 for unknown routes
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  },
};
