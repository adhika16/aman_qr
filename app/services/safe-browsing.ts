/**
 * Google Safe Browsing Service
 * Checks URLs against Google's threat database via Cloudflare Worker proxy
 * 
 * NOTE: This service is now a wrapper around security-proxy service.
 * The actual API calls are made through the proxy to keep API keys secure.
 */

import { QRData, QRType, SafetyCheck, URLContent } from '../types/qr.types';
import { checkSecurityProxy } from './security-proxy';

/**
 * Check URL against Google Safe Browsing API (via proxy)
 */
export async function checkGoogleSafeBrowsing(qrData: QRData): Promise<SafetyCheck> {
  // Only check URL type QR codes
  if (qrData.type !== QRType.URL) {
    return {
      source: 'google-safe-browsing',
      isThreat: false,
      confidence: 1,
      details: 'Not applicable - not a URL',
      timestamp: Date.now(),
    };
  }

  try {
    // Use the combined security proxy service
    const result = await checkSecurityProxy(qrData);
    
    return result.safeBrowsingCheck;
  } catch (error) {
    console.error('Safe Browsing check failed:', error);
    
    return {
      source: 'google-safe-browsing',
      isThreat: false,
      confidence: 0,
      details: 'Limited check - offline mode (service unavailable)',
      timestamp: Date.now(),
    };
  }
}
