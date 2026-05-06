/**
 * Risk Calculator Service
 * Aggregates safety checks and calculates final risk score (1-10)
 */

import { QRData, QRType, SafetyCheck, SafetyAnalysis, RiskLevel, URLContent } from '../types/qr.types';
import { RISK_SCORING, RISK_THRESHOLDS, TRUSTED_DOMAINS, SUSPICIOUS_TLDS } from '../constants/config';
import { checkSecurityProxy } from './security-proxy';

/**
 * Security check result with offline status
 */
export interface SecurityCheckResult {
  checks: SafetyCheck[];
  isOffline: boolean;
  cacheHit: boolean;
}

/**
 * Perform comprehensive safety analysis on QR data
 * Runs all safety checks in parallel for performance
 */
export async function analyzeQRSafety(qrData: QRData): Promise<SafetyAnalysis> {
  const startTime = Date.now();

  // Perform local heuristic checks first (instant)
  const localCheck = performEnhancedLocalHeuristicCheck(qrData);
  
  // Run external security checks via proxy
  const proxyResult = await checkSecurityProxy(qrData);
  
  const checks = [localCheck, proxyResult.safeBrowsingCheck, proxyResult.urlhausCheck];

  // Calculate aggregated risk score
  const riskScore = calculateRiskScore(checks, qrData);

  // Determine risk level
  const riskLevel = determineRiskLevel(riskScore);

  // Generate explanation
  const explanations = generateExplanations(checks, riskScore, qrData);

  // Generate recommendations
  const recommendations = generateRecommendations(riskLevel, checks, qrData, proxyResult.isOffline);

  // Collect all red flags
  const redFlags = checks.flatMap((check) => check.threatType ? [check.threatType] : []);

  // Calculate overall confidence
  const overallConfidence = checks.reduce((sum, check) => sum + check.confidence, 0) / checks.length;

  return {
    checks,
    riskScore,
    riskLevel,
    overallConfidence,
    redFlags: [...new Set(redFlags)], // Remove duplicates
    recommendations,
    explanations,
  };
}

/**
 * Check if external security services are in offline mode
 */
export async function isSecurityOffline(qrData: QRData): Promise<boolean> {
  if (qrData.type !== QRType.URL) {
    return false;
  }
  
  const result = await checkSecurityProxy(qrData);
  return result.isOffline;
}

/**
 * Perform enhanced local heuristic checks (fast, no API calls)
 * Includes: HTTP check, URL shorteners, typosquatting, suspicious patterns, IP detection
 */
function performEnhancedLocalHeuristicCheck(qrData: QRData): SafetyCheck {
  const concerns: string[] = [];
  let isThreat = false;
  let confidence = 0.7;

  // URL-specific checks
  if (qrData.type === QRType.URL) {
    const content = qrData.parsedContent as URLContent;

    // Check for HTTP (not HTTPS)
    if (!content.isHttps) {
      concerns.push('Unencrypted HTTP connection');
      isThreat = true;
    }

    // Check for URL shorteners
    if (content.isShortened) {
      concerns.push('URL shortener obscures destination');
      isThreat = true;
    }

    // Check for suspicious TLDs
    const hasSuspiciousTLD = SUSPICIOUS_TLDS.some((tld) =>
      content.domain.toLowerCase().endsWith(tld)
    );

    if (hasSuspiciousTLD) {
      concerns.push('Suspicious top-level domain');
      isThreat = true;
    }

    // Check for typosquatting
    const typosquattingResult = detectTyposquatting(content.domain);
    if (typosquattingResult) {
      concerns.push('Potential typosquatting detected');
      isThreat = true;
      confidence = 0.85;
    }

    // Check for suspicious URL patterns
    const suspiciousPatterns = checkSuspiciousPatterns(content.originalUrl);
    concerns.push(...suspiciousPatterns);
    if (suspiciousPatterns.length > 0) {
      isThreat = true;
    }

    // Check for IP address
    if (containsIPAddress(content.originalUrl)) {
      concerns.push('Raw IP address instead of domain name');
      isThreat = true;
    }

    // Check for encoding abuse
    const encodingIssues = detectEncodingAbuse(content.originalUrl);
    if (encodingIssues.length > 0) {
      concerns.push(...encodingIssues);
      isThreat = true;
    }

    // Check for excessive subdomains
    const subdomainCount = content.domain.split('.').length;
    if (subdomainCount > 4) {
      concerns.push('Excessive number of subdomains');
      isThreat = true;
    }

    // Check for numeric domain
    if (/^\d+\./.test(content.domain)) {
      concerns.push('Numeric domain name');
      isThreat = true;
    }

    // Check for URL length
    if (content.originalUrl.length > 200) {
      concerns.push('Unusually long URL');
      isThreat = true;
    }
  }

  return {
    source: 'local-heuristics',
    isThreat,
    threatType: concerns.length > 0 ? concerns.join(', ') : undefined,
    confidence,
    details: concerns.length > 0
      ? `Local checks found ${concerns.length} concern(s)`
      : 'Local checks passed',
    timestamp: Date.now(),
  };
}

/**
 * Detect typosquatting using pattern matching
 * Looks for character substitutions in known brand names
 */
function detectTyposquatting(domain: string): boolean {
  const lowerDomain = domain.toLowerCase();
  
  // Common typosquatting patterns
  const suspiciousPatterns = [
    /paypa[l1]/i,      // paypa1, paypaL
    /g00gle/i,         // g00gle
    /amaz0n/i,         // amaz0n
    /micr0soft/i,      // micr0soft
    /faceb00k/i,       // faceb00k
    /twltter/i,        // twltter (l instead of i)
    /instagra m/i,     // space in domain
    /netfl1x/i,        // netfl1x
    /apple-?id/i,      // apple-id
    /goo-gle/i,        // hyphenated
    /secure-?paypal/i, // securepaypal variants
    /login-?microsoft/i, // loginmicrosoft
    /verify-?amazon/i, // verifyamazon
    /account-?google/i, // accountgoogle
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(lowerDomain)) {
      return true;
    }
  }
  
  // Check for repeated characters (e.g., gooogle, paypall)
  if (/([a-z])\1{2,}/i.test(lowerDomain)) {
    return true;
  }
  
  return false;
}

/**
 * Check for suspicious URL patterns
 */
function checkSuspiciousPatterns(url: string): string[] {
  const flags: string[] = [];
  const lowerUrl = url.toLowerCase();
  
  // Suspicious path patterns
  const suspiciousPaths = [
    /\/[^/]*(login|signin|verify|confirm|secure|account|update|password|credential|auth)[^/]*$/i,
    /\/[^/]*(wp-admin|admin|panel|dashboard)[^/]*$/i,
    /\/[^/]*(banking|payment|checkout|billing)[^/]*$/i,
  ];
  
  for (const pattern of suspiciousPaths) {
    if (pattern.test(lowerUrl)) {
      flags.push('Suspicious path pattern detected');
      break;
    }
  }
  
  // Check for multiple @ symbols (credential stuffing)
  const atCount = (url.match(/@/g) || []).length;
  if (atCount > 0) {
    flags.push('URL contains @ symbol (credential stuffing risk)');
  }
  
  // Check for data URI
  if (lowerUrl.startsWith('data:')) {
    flags.push('Data URI detected');
  }
  
  return flags;
}

/**
 * Detect if URL contains raw IP address
 */
function containsIPAddress(url: string): boolean {
  const ipPattern = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
  return ipPattern.test(url);
}

/**
 * Detect URL encoding abuse and obfuscation
 */
function detectEncodingAbuse(url: string): string[] {
  const flags: string[] = [];
  
  // Count URL-encoded characters
  const encodedCount = (url.match(/%[0-9a-fA-F]{2}/g) || []).length;
  const totalLength = url.length;
  
  // If more than 15% of URL is encoded, flag it
  if (encodedCount > 0 && (encodedCount * 3 / totalLength) > 0.15) {
    flags.push('Heavy URL encoding (possible obfuscation)');
  }
  
  // Check for suspicious encoding patterns
  if (/%00/.test(url)) {
    flags.push('Null byte encoding detected');
  }
  
  // Check for double encoding
  if (/%25[0-9a-fA-F]{2}/.test(url)) {
    flags.push('Double URL encoding detected');
  }
  
  return flags;
}

/**
 * Calculate overall risk score from all checks
 */
function calculateRiskScore(checks: SafetyCheck[], qrData: QRData): number {
  // Start with base score
  let score = RISK_SCORING.baseScore;

  // Apply adjustments from each check
  for (const check of checks) {
    if (check.isThreat) {
      // Weight by confidence
      score += (3 * check.confidence);
    } else {
      // Trusted results reduce score slightly
      score -= (0.5 * check.confidence);
    }
  }

  // URL-specific adjustments
  if (qrData.type === QRType.URL) {
    const content = qrData.parsedContent as URLContent;

    // HTTP penalty
    if (!content.isHttps) {
      score += RISK_SCORING.factors.httpNotHttps;
    }

    // HTTPS bonus
    if (content.isHttps) {
      score += RISK_SCORING.factors.httpsValid;
    }

    // URL shortener penalty
    if (content.isShortened) {
      score += RISK_SCORING.factors.urlShortener;
    }

    // Trusted domain bonus
    const isTrustedDomain = TRUSTED_DOMAINS.some((domain) =>
      content.domain === domain || content.domain.endsWith('.' + domain)
    );

    if (isTrustedDomain) {
      score += RISK_SCORING.factors.wellKnownDomain;
    }

    // Suspicious TLD penalty
    const hasSuspiciousTLD = SUSPICIOUS_TLDS.some((tld) =>
      content.domain.toLowerCase().endsWith(tld)
    );

    if (hasSuspiciousTLD) {
      score += RISK_SCORING.factors.suspiciousDomain;
    }
  }

  // Cap within bounds
  return Math.max(RISK_SCORING.minScore, Math.min(RISK_SCORING.maxScore, Math.round(score)));
}

/**
 * Determine risk level from score
 */
function determineRiskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.dangerous.min) {
    return RiskLevel.DANGEROUS;
  } else if (score >= RISK_THRESHOLDS.highRisk.min) {
    return RiskLevel.HIGH_RISK;
  } else if (score >= RISK_THRESHOLDS.caution.min) {
    return RiskLevel.CAUTION;
  }
  return RiskLevel.SAFE;
}

/**
 * Generate explanations object
 */
function generateExplanations(checks: SafetyCheck[], score: number, qrData: QRData): { summary: string; details: string[] } {
  const riskLevel = determineRiskLevel(score);
  const threatChecks = checks.filter((check) => check.isThreat);
  const safeChecks = checks.filter((check) => !check.isThreat);

  let summary = '';
  const details: string[] = [];

  switch (riskLevel) {
    case RiskLevel.SAFE:
      summary = 'This QR code appears safe. No security concerns were detected across multiple safety checks.';
      break;

    case RiskLevel.CAUTION:
      summary = 'This QR code shows some minor concerns. While not immediately dangerous, please verify the content before proceeding.';
      break;

    case RiskLevel.HIGH_RISK:
      summary = 'This QR code has significant security concerns. Multiple checks flagged potential risks. We strongly recommend reconsidering before proceeding.';
      break;

    case RiskLevel.DANGEROUS:
      summary = '⚠️ This QR code appears to be malicious or dangerous. It has been flagged by security databases. Do not proceed unless you are absolutely certain of the source.';
      break;
  }

  // Add details from checks
  checks.forEach((check) => {
    if (check.details) {
      details.push(`${check.source}: ${check.details}`);
    }
  });

  return { summary, details };
}

/**
 * Generate actionable recommendations
 */
function generateRecommendations(
  riskLevel: RiskLevel, 
  checks: SafetyCheck[], 
  qrData: QRData,
  isOffline: boolean
): string[] {
  const recommendations: string[] = [];

  // Add offline mode warning if applicable
  if (isOffline) {
    recommendations.push('⚠️ Limited check - offline mode (external security services unavailable)');
    recommendations.push('Only local heuristics were performed. Use extra caution.');
  }

  switch (riskLevel) {
    case RiskLevel.SAFE:
      recommendations.push('This QR appears safe to use');
      if (qrData.type === QRType.URL) {
        recommendations.push('Always verify the URL matches what you expect');
      }
      break;

    case RiskLevel.CAUTION:
      recommendations.push('Verify the content before proceeding');
      recommendations.push('Check if the source is trustworthy');
      if (qrData.type === QRType.URL) {
        const httpCheck = checks.find((c) => c.source === 'local-heuristics');
        if (httpCheck?.details?.includes('HTTP')) {
          recommendations.push('Consider accessing via HTTPS if available');
        }
      }
      break;

    case RiskLevel.HIGH_RISK:
      recommendations.push('Think twice before proceeding');
      recommendations.push('Verify with the source through a different channel');
      recommendations.push('Do not enter sensitive information');
      if (qrData.type === QRType.UPI_PAYMENT) {
        recommendations.push('Double-check the payee details');
      }
      break;

    case RiskLevel.DANGEROUS:
      recommendations.push('Do not proceed with this QR code');
      recommendations.push('It has been flagged as potentially malicious');
      recommendations.push('Report this to the relevant authorities if appropriate');
      break;
  }

  // Add QR-type specific advice
  switch (qrData.type) {
    case QRType.WIFI:
      recommendations.push('Ensure you trust the network provider before connecting');
      break;
    case QRType.UPI_PAYMENT:
      recommendations.push('Verify the payee name matches who you intend to pay');
      break;
    case QRType.CRYPTO:
      recommendations.push('Always double-check cryptocurrency addresses');
      break;
  }

  return recommendations;
}
