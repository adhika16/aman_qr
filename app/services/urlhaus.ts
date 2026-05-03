/**
 * URLhaus Service
 * Checks URLs against abuse.ch malware database
 */

import { QRData, QRType, SafetyCheck, URLContent } from '../types/qr.types';
import { URLHAUS_CONFIG } from '../constants/config';

/**
 * Check URL against URLhaus malware database
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
    const content = qrData.parsedContent as URLContent;
    
    // For POC, use mock implementation
    // In production, uncomment the actual API call
    const result = await mockURLhausCheck(content.originalUrl);
    // const result = await callURLhausAPI(content.originalUrl);

    return {
      source: 'urlhaus',
      isThreat: result.isThreat,
      threatType: result.threatType,
      confidence: result.isThreat ? 0.98 : 0.85,
      details: result.isThreat
        ? `Malware URL detected: ${result.threatType}`
        : 'URL not found in URLhaus malware database',
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('URLhaus check failed:', error);
    
    return {
      source: 'urlhaus',
      isThreat: false,
      confidence: 0,
      details: 'Check failed - unable to query URLhaus database',
      timestamp: Date.now(),
    };
  }
}

/**
 * Mock URLhaus check for POC
 */
async function mockURLhausCheck(url: string): Promise<{ isThreat: boolean; threatType?: string }> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 400));

  // Check for known malware patterns (mock data)
  const malwarePatterns = [
    { pattern: 'malware', type: 'Malware distribution' },
    { pattern: 'virus', type: 'Virus distribution' },
    { pattern: 'trojan', type: 'Trojan malware' },
    { pattern: 'ransomware', type: 'Ransomware' },
  ];

  for (const { pattern, type } of malwarePatterns) {
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
 * Actual URLhaus API call (for production)
 */
async function callURLhausAPI(url: string): Promise<{ isThreat: boolean; threatType?: string }> {
  const response = await fetch(URLHAUS_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `url=${encodeURIComponent(url)}`,
  });

  if (!response.ok) {
    throw new Error(`URLhaus API error: ${response.status}`);
  }

  const data = await response.json();

  // URLhaus returns query_status: "no_results" if URL is not in database
  if (data.query_status === 'ok' && data.url_status) {
    return {
      isThreat: true,
      threatType: data.threat || 'Malware',
    };
  }

  return {
    isThreat: false,
  };
}
