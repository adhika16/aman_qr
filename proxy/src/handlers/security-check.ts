import { SecurityCheckRequest, SecurityCheckResponse } from '../types';
import { checkGoogleSafeBrowsing } from '../services/safe-browsing';
import { checkURLhaus } from '../services/urlhaus';
import { getCachedResult, cacheResult, generateResponse } from '../services/cache';
import { checkRateLimit, createRateLimitResponse } from '../services/rate-limiter';

export async function handleSecurityCheck(
  request: Request,
  env: {
    GOOGLE_SAFE_BROWSING_API_KEY: string;
    AMANQR_CACHE: Cache;
    AMANQR_RATE_LIMIT: KVNamespace;
  }
): Promise<Response> {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  // Only accept POST requests
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  try {
    // Parse request body
    const body = await request.json() as SecurityCheckRequest;
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // Get client IP for rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

    // Check rate limit
    const rateLimitInfo = await checkRateLimit(clientIP, env.AMANQR_RATE_LIMIT);
    if (!rateLimitInfo.allowed) {
      return createRateLimitResponse(rateLimitInfo.resetTime);
    }

    // Check cache first
    const cachedResult = await getCachedResult(url, env.AMANQR_CACHE);
    if (cachedResult) {
      const response = generateResponse(cachedResult);
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', process.env.RATE_LIMIT_REQUESTS || '30');
      response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
      response.headers.set('X-RateLimit-Reset', Math.floor(rateLimitInfo.resetTime / 1000).toString());
      return response;
    }

    // Run both checks in parallel
    const [safeBrowsingResult, urlhausResult] = await Promise.all([
      checkGoogleSafeBrowsing(url, env.GOOGLE_SAFE_BROWSING_API_KEY),
      checkURLhaus(url),
    ]);

    // Determine if we're in offline mode (both services failed)
    const isOffline = !!safeBrowsingResult.error && !!urlhausResult.error;

    const result: SecurityCheckResponse = {
      safeBrowsing: safeBrowsingResult,
      urlhaus: urlhausResult,
      isOffline,
      cacheHit: false,
      timestamp: Date.now(),
    };

    // Cache the result
    await cacheResult(url, result, env.AMANQR_CACHE);

    // Generate response
    const response = generateResponse(result);
    
    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', process.env.RATE_LIMIT_REQUESTS || '30');
    response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.floor(rateLimitInfo.resetTime / 1000).toString());

    return response;
  } catch (error) {
    console.error('Security check handler error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
