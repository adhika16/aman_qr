/**
 * Google Safe Browsing API service for AmanQR Security Proxy
 * Checks URLs against Google's threat database
 * @module services/safe-browsing
 */

/** @type {string} */
const GOOGLE_SAFE_BROWSING_ENDPOINT = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';

/**
 * Checks a URL against Google Safe Browsing API
 * @param {string} url - The URL to check
 * @param {string} apiKey - Google Safe Browsing API key
 * @returns {Promise<import('../types/index.js').SafeBrowsingResult>} Safe Browsing check result
 */
export async function checkGoogleSafeBrowsing(url, apiKey) {
	try {
		const response = await fetch(`${GOOGLE_SAFE_BROWSING_ENDPOINT}?key=${apiKey}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				client: {
					clientId: 'amanqr',
					clientVersion: '1.0.0',
				},
				threatInfo: {
					threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
					platformTypes: ['ANY_PLATFORM'],
					threatEntryTypes: ['URL'],
					threatEntries: [{ url }],
				},
			}),
		});

		if (!response.ok) {
			throw new Error(`Safe Browsing API error: ${response.status}`);
		}

		const data = await response.json();

		if (data.matches && data.matches.length > 0) {
			const match = data.matches[0];
			return {
				isThreat: true,
				threatType: match.threatType,
				confidence: 0.95,
				details: `Threat detected: ${match.threatType}`,
			};
		}

		return {
			isThreat: false,
			confidence: 0.9,
			details: 'No threats found in Google Safe Browsing database',
		};
	} catch (error) {
		console.error('Google Safe Browsing check failed:', error);
		return {
			isThreat: false,
			confidence: 0,
			details: 'Check failed - unable to query Safe Browsing database',
			error: error instanceof Error ? error.message : 'Unknown error',
		};
	}
}
