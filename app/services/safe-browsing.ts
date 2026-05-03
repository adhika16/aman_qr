/**
 * Google Safe Browsing Service
 * Checks URLs against Google's threat database
 */

import { QRData, QRType, SafetyCheck, URLContent } from '../types/qr.types';
import { SAFE_BROWSING_CONFIG } from '../constants/config';

/**
 * Check URL against Google Safe Browsing API
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
    const content = qrData.parsedContent as URLContent;
    
    // For POC, use mock implementation
    // In production, uncomment the actual API call
    const result = await mockSafeBrowsingCheck(content.originalUrl);
    // const result = await callSafeBrowsingAPI(content.originalUrl);

    return {
      source: 'google-safe-browsing',
      isThreat: result.isThreat,
      threatType: result.threatType,
      confidence: result.isThreat ? 0.95 : 0.8,
      details: result.isThreat
        ? `Threat detected: ${result.threatType}`
        : 'No threats found in Google Safe Browsing database',
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Safe Browsing check failed:', error);
    
    return {
      source: 'google-safe-browsing',
      isThreat: false,
      confidence: 0,
      details: 'Check failed - unable to query Safe Browsing database',
      timestamp: Date.now(),
    };
  }
}

/**
 * Mock Safe Browsing check for POC
 */
async function mockSafeBrowsingCheck(url: string): Promise<{ isThreat: boolean; threatType?: string }> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Check for known malicious patterns (mock data)
  const maliciousPatterns = [
    { pattern: 'malware', type: 'MALWARE' },
    { pattern: 'phishing', type: 'SOCIAL_ENGINEERING' },
    { pattern: 'unwanted', type: 'UNWANTED_SOFTWARE' },
  ];

  for (const { pattern, type } of maliciousPatterns) {
    if (url.toLowerCase().includes(pattern)) {
      return {
        isThreat: true,
        threatType: type,
      };
    }
  }

  return {
    isThreat: false,
  };
}

/**
 * Actual Google Safe Browsing API call (for production)
 */
async function callSafeBrowsingAPI(url: string): Promise<{ isThreat: boolean; threatType?: string }> {
  const apiUrl = `${SAFE_BROWSING_CONFIG.endpoint}?key=${SAFE_BROWSING_CONFIG.apiKey}`;

  const response = await fetch(apiUrl, {
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
        threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
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
    return {
      isThreat: true,
      threatType: data.matches[0].threatType,
    };
  }

  return {
    isThreat: false,
  };
}
