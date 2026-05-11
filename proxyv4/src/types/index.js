/**
 * Type definitions for AmanQR Security Proxy
 * @module types
 */

/**
 * Security check request payload
 * @typedef {Object} SecurityCheckRequest
 * @property {string} url - The URL to check for threats
 */

/**
 * Result from Google Safe Browsing check
 * @typedef {Object} SafeBrowsingResult
 * @property {boolean} isThreat - Whether a threat was detected
 * @property {string} [threatType] - Type of threat (e.g., MALWARE, SOCIAL_ENGINEERING)
 * @property {number} confidence - Confidence level (0-1)
 * @property {string} details - Human-readable details
 * @property {string} [error] - Error message if check failed
 */

/**
 * Result from URLhaus check
 * @typedef {Object} URLhausResult
 * @property {boolean} isThreat - Whether a threat was detected
 * @property {string} [threatType] - Type of threat (e.g., Malware)
 * @property {number} confidence - Confidence level (0-1)
 * @property {string} details - Human-readable details
 * @property {string} [error] - Error message if check failed
 */

/**
 * Complete security check response
 * @typedef {Object} SecurityCheckResponse
 * @property {SafeBrowsingResult} safeBrowsing - Google Safe Browsing results
 * @property {URLhausResult} urlhaus - URLhaus results
 * @property {boolean} isOffline - True if both services failed
 * @property {boolean} cacheHit - True if result was retrieved from cache
 * @property {number} timestamp - Unix timestamp of the check
 */

/**
 * Rate limit information for a client
 * @typedef {Object} RateLimitInfo
 * @property {boolean} allowed - Whether the request is allowed
 * @property {number} remaining - Number of remaining requests in window
 * @property {number} resetTime - Unix timestamp when the window resets
 */

/**
 * Cache entry structure
 * @typedef {Object} CacheEntry
 * @property {string} url - The URL that was checked
 * @property {SecurityCheckResponse} result - The check results
 * @property {number} timestamp - When the entry was created
 */

/**
 * Environment variables expected by the worker
 * @typedef {Object} Env
 * @property {string} GOOGLE_SAFE_BROWSING_API_KEY - Google Safe Browsing API key
 * @property {string} [RATE_LIMIT_REQUESTS] - Max requests per window (default: 30)
 * @property {string} [RATE_LIMIT_WINDOW] - Rate limit window in seconds (default: 60)
 * @property {string} [CACHE_TTL] - Cache TTL in seconds (default: 3600)
 * @property {string} [CORS_ORIGIN] - CORS origin (default: *)
 * @property {Cache} AMANQR_CACHE - Cloudflare Cache binding
 * @property {KVNamespace} AMANQR_RATE_LIMIT - KV namespace for rate limiting
 */

// Export empty object since this is for JSDoc types only
export default {};
