import { RateLimitInfo } from '../types';

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export async function checkRateLimit(
  clientIP: string,
  kv: KVNamespace
): Promise<RateLimitInfo> {
  const config = getRateLimitConfig();
  const windowStart = Math.floor(Date.now() / 1000 / config.windowSeconds) * config.windowSeconds;
  const key = `rate_limit:${clientIP}:${windowStart}`;
  
  try {
    // Get current count
    const currentCount = parseInt(await kv.get(key) || '0', 10);
    
    if (currentCount >= config.maxRequests) {
      const resetTime = (windowStart + config.windowSeconds) * 1000;
      return {
        allowed: false,
        remaining: 0,
        resetTime,
      };
    }
    
    // Increment counter
    await kv.put(key, (currentCount + 1).toString(), {
      expirationTtl: config.windowSeconds,
    });
    
    const resetTime = (windowStart + config.windowSeconds) * 1000;
    return {
      allowed: true,
      remaining: config.maxRequests - currentCount - 1,
      resetTime,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow request if KV fails
    return {
      allowed: true,
      remaining: 1,
      resetTime: Date.now() + (config.windowSeconds * 1000),
    };
  }
}

function getRateLimitConfig(): RateLimitConfig {
  return {
    maxRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '30', 10),
    windowSeconds: parseInt(process.env.RATE_LIMIT_WINDOW || '60', 10),
  };
}

export function createRateLimitResponse(resetTime: number): Response {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
  
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Try again after ${retryAfter} seconds.`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
