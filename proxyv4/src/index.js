/**
 * AmanQR Security Proxy Worker
 * Cloudflare Worker for URL security checks with Google Safe Browsing and URLhaus
 * @module index
 */

import { handleSecurityCheck } from './handlers/security-check.js';

/**
 * Main worker entry point
 * @type {Object}
 */
export default {
	/**
	 * Handles incoming fetch requests
	 * @param {Request} request - The incoming HTTP request
	 * @param {Object} env - Environment variables and Cloudflare bindings
	 * @param {ExecutionContext} ctx - Execution context for async operations
	 * @returns {Promise<Response>} HTTP response
	 */
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		// Route: /api/security-check - Main security check endpoint
		if (url.pathname === '/api/security-check') {
			return handleSecurityCheck(request, env);
		}

		// Route: /health - Health check endpoint
		if (url.pathname === '/health') {
			const corsOrigin = env?.CORS_ORIGIN || '*';
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
						'Access-Control-Allow-Origin': corsOrigin,
					},
				}
			);
		}

		// 404 for unknown routes
		const corsOrigin = env?.CORS_ORIGIN || '*';
		return new Response(JSON.stringify({ error: 'Not found' }), {
			status: 404,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': corsOrigin,
			},
		});
	},
};
