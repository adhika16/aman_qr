/**
 * Rate limiting service for AmanQR Security Proxy
 * Uses Cloudflare KV for distributed rate limiting
 * @module services/rate-limiter
 */

/**
 * Gets rate limit configuration from environment
 * @param {Object} env - Environment variables
 * @returns {{maxRequests: number, windowSeconds: number}} Rate limit config
 */
function getRateLimitConfig(env) {
	return {
		maxRequests: parseInt(env?.RATE_LIMIT_REQUESTS || '30', 10),
		windowSeconds: parseInt(env?.RATE_LIMIT_WINDOW || '60', 10),
	};
}

/**
 * Checks if a client IP is within rate limits
 * Uses sliding window algorithm with KV storage
 * @param {string} clientIP - Client IP address
 * @param {KVNamespace} kv - Cloudflare KV namespace
 * @param {Object} env - Environment variables
 * @returns {Promise<import('../types/index.js').RateLimitInfo>} Rate limit status
 */
export async function checkRateLimit(clientIP, kv, env) {
	const config = getRateLimitConfig(env);
	const windowStart = Math.floor(Date.now() / 1000 / config.windowSeconds) * config.windowSeconds;
	const key = `rate_limit:${clientIP}:${windowStart}`;

	try {
		// Get current count
		const currentCountStr = await kv.get(key);
		const currentCount = parseInt(currentCountStr || '0', 10);

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
			resetTime: Date.now() + config.windowSeconds * 1000,
		};
	}
}

/**
 * Creates a 429 Too Many Requests response
 * @param {number} resetTime - Unix timestamp when rate limit resets
 * @param {Object} env - Environment variables
 * @returns {Response} HTTP 429 Response
 */
export function createRateLimitResponse(resetTime, env) {
	const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
	const corsOrigin = env?.CORS_ORIGIN || '*';

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
				'Access-Control-Allow-Origin': corsOrigin,
			},
		}
	);
}
