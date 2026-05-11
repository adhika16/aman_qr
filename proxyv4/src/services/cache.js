/**
 * Cache service for AmanQR Security Proxy
 * Handles caching of security check results using Cloudflare Cache API
 * @module services/cache
 */

/** @type {string} */
const CACHE_NAMESPACE = 'amanqr-security-cache';

/** @type {number} */
const DEFAULT_CACHE_TTL = 3600; // 1 hour in seconds

/**
 * Gets CORS headers based on environment configuration
 * @param {Object} env - Environment variables
 * @param {string} [env.CORS_ORIGIN] - CORS origin (default: *)
 * @returns {Object} CORS headers object
 */
export function getCorsHeaders(env) {
	const origin = env?.CORS_ORIGIN || '*';
	return {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Methods': 'POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
	};
}

/**
 * Generates a cache key for a URL
 * @param {string} url - The URL to generate a key for
 * @returns {Request} Cache key as a Request object
 */
function generateCacheKey(url) {
	// Create a cache key based on URL hash using btoa
	const encodedUrl = btoa(url);
	return new Request(`https://cache.amanqr.com/${CACHE_NAMESPACE}/${encodedUrl}`);
}

/**
 * Retrieves cached security check result
 * @param {string} url - The URL to look up
 * @param {Cache} cache - Cloudflare Cache instance
 * @param {Object} env - Environment variables
 * @returns {Promise<import('../types/index.js').SecurityCheckResponse|null>} Cached result or null
 */
export async function getCachedResult(url, cache, env) {
	const cacheKey = generateCacheKey(url);

	try {
		const cachedResponse = await cache.match(cacheKey);

		if (cachedResponse) {
			/** @type {import('../types/index.js').SecurityCheckResponse} */
			const data = await cachedResponse.json();

			// Check if cache entry is still valid
			const cacheTtl = parseInt(env?.CACHE_TTL || '3600', 10);
			const isExpired = Date.now() - data.timestamp > cacheTtl * 1000;

			if (!isExpired) {
				return { ...data, cacheHit: true };
			}
		}
	} catch (error) {
		console.error('Cache retrieval error:', error);
	}

	return null;
}

/**
 * Stores security check result in cache
 * @param {string} url - The URL that was checked
 * @param {import('../types/index.js').SecurityCheckResponse} result - The check result
 * @param {Cache} cache - Cloudflare Cache instance
 * @param {Object} env - Environment variables
 * @returns {Promise<void>}
 */
export async function cacheResult(url, result, cache, env) {
	const cacheKey = generateCacheKey(url);
	const cacheTtl = parseInt(env?.CACHE_TTL || '3600', 10);

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

/**
 * Generates a Response object with security check results
 * @param {import('../types/index.js').SecurityCheckResponse} result - The check result
 * @param {number} [statusCode=200] - HTTP status code
 * @param {Object} env - Environment variables
 * @returns {Response} HTTP Response object
 */
export function generateResponse(result, statusCode = 200, env) {
	const corsHeaders = getCorsHeaders(env);
	const headers = new Headers({
		'Content-Type': 'application/json',
		...corsHeaders,
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
