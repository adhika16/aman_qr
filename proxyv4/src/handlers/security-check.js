/**
 * Security check handler for AmanQR Security Proxy
 * Handles URL security checks with rate limiting, caching, and dual threat detection
 * @module handlers/security-check
 */

import { checkGoogleSafeBrowsing } from '../services/safe-browsing.js';
import { checkURLhaus } from '../services/urlhaus.js';
import { getCachedResult, cacheResult, generateResponse, getCorsHeaders } from '../services/cache.js';
import { checkRateLimit, createRateLimitResponse } from '../services/rate-limiter.js';

/**
 * Handles security check requests
 * @param {Request} request - The incoming HTTP request
 * @param {Object} env - Environment variables and bindings
 * @param {string} env.GOOGLE_SAFE_BROWSING_API_KEY - Google Safe Browsing API key
 * @param {Cache} env.AMANQR_CACHE - Cloudflare Cache binding
 * @param {KVNamespace} env.AMANQR_RATE_LIMIT - KV namespace for rate limiting
 * @returns {Promise<Response>} HTTP response
 */
export async function handleSecurityCheck(request, env) {
	// Handle CORS preflight
	if (request.method === 'OPTIONS') {
		const corsHeaders = getCorsHeaders(env);
		return new Response(null, {
			status: 204,
			headers: corsHeaders,
		});
	}

	// Only accept POST requests
	if (request.method !== 'POST') {
		const corsOrigin = env?.CORS_ORIGIN || '*';
		return new Response(JSON.stringify({ error: 'Method not allowed' }), {
			status: 405,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': corsOrigin,
			},
		});
	}

	try {
		// Parse request body
		/** @type {import('../types/index.js').SecurityCheckRequest} */
		const body = await request.json();
		const { url } = body;

		if (!url || typeof url !== 'string') {
			const corsOrigin = env?.CORS_ORIGIN || '*';
			return new Response(JSON.stringify({ error: 'URL is required' }), {
				status: 400,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': corsOrigin,
				},
			});
		}

		// Get client IP for rate limiting
		const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

		// Check rate limit
		const rateLimitInfo = await checkRateLimit(clientIP, env.AMANQR_RATE_LIMIT, env);
		if (!rateLimitInfo.allowed) {
			return createRateLimitResponse(rateLimitInfo.resetTime, env);
		}

		// Check cache first
		const cachedResult = await getCachedResult(url, env.AMANQR_CACHE, env);
		if (cachedResult) {
			const response = generateResponse(cachedResult, 200, env);
			// Add rate limit headers
			response.headers.set('X-RateLimit-Limit', env?.RATE_LIMIT_REQUESTS || '30');
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

		/** @type {import('../types/index.js').SecurityCheckResponse} */
		const result = {
			safeBrowsing: safeBrowsingResult,
			urlhaus: urlhausResult,
			isOffline,
			cacheHit: false,
			timestamp: Date.now(),
		};

		// Cache the result
		await cacheResult(url, result, env.AMANQR_CACHE, env);

		// Generate response
		const response = generateResponse(result, 200, env);

		// Add rate limit headers
		response.headers.set('X-RateLimit-Limit', env?.RATE_LIMIT_REQUESTS || '30');
		response.headers.set('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
		response.headers.set('X-RateLimit-Reset', Math.floor(rateLimitInfo.resetTime / 1000).toString());

		return response;
	} catch (error) {
		console.error('Security check handler error:', error);

		const corsOrigin = env?.CORS_ORIGIN || '*';
		return new Response(
			JSON.stringify({
				error: 'Internal server error',
				message: error instanceof Error ? error.message : 'Unknown error',
			}),
			{
				status: 500,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': corsOrigin,
				},
			}
		);
	}
}
