/**
 * Security Proxy Service
 * Client-side service for communicating with the Cloudflare Worker proxy
 * Combines Google Safe Browsing and URLhaus checks with caching and rate limiting
 */

import { QRData, QRType, SafetyCheck, URLContent } from '../types/qr.types';
import { SECURITY_PROXY_CONFIG } from '../constants/config';

interface SecurityProxyResponse {
  safeBrowsing: {
    isThreat: boolean;
    threatType?: string;
    confidence: number;
    details: string;
    error?: string;
  };
  urlhaus: {
    isThreat: boolean;
    threatType?: string;
    confidence: number;
    details: string;
    error?: string;
  };
  isOffline: boolean;
  cacheHit: boolean;
  timestamp: number;
}

interface SecurityCheckResult {
  safeBrowsingCheck: SafetyCheck;
  urlhausCheck: SafetyCheck;
  isOffline: boolean;
  cacheHit: boolean;
}

/**
 * Check URL security via Cloudflare Worker proxy
 * Combines Google Safe Browsing and URLhaus checks
 */
export async function checkSecurityProxy(qrData: QRData): Promise<SecurityCheckResult> {
  // Only check URL type QR codes
  if (qrData.type !== QRType.URL) {
    return {
      safeBrowsingCheck: {
        source: 'google-safe-browsing',
        isThreat: false,
        confidence: 1,
        details: 'Not applicable - not a URL',
        timestamp: Date.now(),
      },
      urlhausCheck: {
        source: 'urlhaus',
        isThreat: false,
        confidence: 1,
        details: 'Not applicable - not a URL',
        timestamp: Date.now(),
      },
      isOffline: false,
      cacheHit: false,
    };
  }

  const content = qrData.parsedContent as URLContent;
  
  // If proxy endpoint is not configured, fall back to local-only mode
  if (!SECURITY_PROXY_CONFIG.endpoint) {
    console.warn('Security proxy endpoint not configured, using local-only mode');
    return createOfflineResult('Proxy not configured');
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SECURITY_PROXY_CONFIG.timeout);

    const response = await fetch(`${SECURITY_PROXY_CONFIG.endpoint}/api/security-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: content.originalUrl }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
      return createOfflineResult(`Rate limited - retry after ${retryAfter}s`);
    }

    if (!response.ok) {
      throw new Error(`Security proxy error: ${response.status}`);
    }

    const data: SecurityProxyResponse = await response.json();

    return {
      safeBrowsingCheck: {
        source: 'google-safe-browsing',
        isThreat: data.safeBrowsing.isThreat,
        threatType: data.safeBrowsing.threatType,
        confidence: data.safeBrowsing.confidence,
        details: data.safeBrowsing.details,
        timestamp: Date.now(),
      },
      urlhausCheck: {
        source: 'urlhaus',
        isThreat: data.urlhaus.isThreat,
        threatType: data.urlhaus.threatType,
        confidence: data.urlhaus.confidence,
        details: data.urlhaus.details,
        timestamp: Date.now(),
      },
      isOffline: data.isOffline,
      cacheHit: data.cacheHit,
    };
  } catch (error) {
    console.error('Security proxy check failed:', error);
    
    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return createOfflineResult('Request timeout');
    }

    return createOfflineResult(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Create offline mode result when proxy is unavailable
 */
function createOfflineResult(reason: string): SecurityCheckResult {
  return {
    safeBrowsingCheck: {
      source: 'google-safe-browsing',
      isThreat: false,
      confidence: 0,
      details: `Limited check - offline mode (${reason})`,
      timestamp: Date.now(),
    },
    urlhausCheck: {
      source: 'urlhaus',
      isThreat: false,
      confidence: 0,
      details: `Limited check - offline mode (${reason})`,
      timestamp: Date.now(),
    },
    isOffline: true,
    cacheHit: false,
  };
}

/**
 * Check if the proxy endpoint is configured and reachable
 */
export async function isProxyAvailable(): Promise<boolean> {
  if (!SECURITY_PROXY_CONFIG.endpoint) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${SECURITY_PROXY_CONFIG.endpoint}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    return response.ok;
  } catch {
    return false;
  }
}
