import { SecurityCheckResponse } from '../types';

const CACHE_NAMESPACE = 'amanqr-security-cache';
const DEFAULT_CACHE_TTL = 3600; // 1 hour in seconds

export async function getCachedResult(
  url: string,
  cache: Cache
): Promise<SecurityCheckResponse | null> {
  const cacheKey = generateCacheKey(url);
  
  try {
    const cachedResponse = await cache.match(cacheKey);
    
    if (cachedResponse) {
      const data = await cachedResponse.json() as SecurityCheckResponse;
      // Check if cache entry is still valid
      const cacheTtl = parseInt(process.env.CACHE_TTL || '3600', 10);
      const isExpired = (Date.now() - data.timestamp) > (cacheTtl * 1000);
      
      if (!isExpired) {
        return { ...data, cacheHit: true };
      }
    }
  } catch (error) {
    console.error('Cache retrieval error:', error);
  }
  
  return null;
}

export async function cacheResult(
  url: string,
  result: SecurityCheckResponse,
  cache: Cache
): Promise<void> {
  const cacheKey = generateCacheKey(url);
  const cacheTtl = parseInt(process.env.CACHE_TTL || '3600', 10);
  
  try {
    const response = new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `max-age=${cacheTtl}`,
      },
    });
    
    await cache.put(cacheKey, response);
  } catch (error) {
    console.error('Cache storage error:', error);
  }
}

function generateCacheKey(url: string): Request {
  // Create a cache key based on URL hash
  const encodedUrl = btoa(url);
  return new Request(`https://cache.amanqr.com/${CACHE_NAMESPACE}/${encodedUrl}`);
}

export function generateResponse(
  result: SecurityCheckResponse,
  statusCode: number = 200
): Response {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });

  if (result.cacheHit) {
    headers.set('X-Cache', 'HIT');
  } else {
    headers.set('X-Cache', 'MISS');
  }

  return new Response(JSON.stringify(result), {
    status: statusCode,
    headers,
  });
}
