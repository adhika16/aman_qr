/**
 * URLhaus Service
 * Checks URLs against abuse.ch malware database via Cloudflare Worker proxy
 * 
 * NOTE: This service is now a wrapper around security-proxy service.
 * The actual API calls are made through the proxy for consistency and caching.
 */

import { QRData, QRType, SafetyCheck, URLContent } from '../types/qr.types';
import { checkSecurityProxy } from './security-proxy';

/**
 * Check URL against URLhaus malware database (via proxy)
 */
export async function checkURLhaus(qrData: QRData): Promise<SafetyCheck> {
  // Only check URL type QR codes
  if (qrData.type !== QRType.URL) {
    return {
      source: 'urlhaus',
      isThreat: false,
      confidence: 1,
      details: 'Not applicable - not a URL',
      timestamp: Date.now(),
    };
  }

  try {
    // Use the combined security proxy service
    const result = await checkSecurityProxy(qrData);
    
    return result.urlhausCheck;
  } catch (error) {
    console.error('URLhaus check failed:', error);
    
    return {
      source: 'urlhaus',
      isThreat: false,
      confidence: 0,
      details: 'Limited check - offline mode (service unavailable)',
      timestamp: Date.now(),
    };
  }
}
