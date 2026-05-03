/**
 * Risk Calculator Service
 * Aggregates safety checks and calculates final risk score (1-10)
 */

import { QRData, QRType, SafetyCheck, SafetyAnalysis, RiskLevel, URLContent } from '../types/qr.types';
import { RISK_SCORING, RISK_THRESHOLDS, TRUSTED_DOMAINS, SUSPICIOUS_TLDS } from '../constants/config';
import { analyzeWithAzureOpenAI } from './azure-openai';
import { checkGoogleSafeBrowsing } from './safe-browsing';
import { checkURLhaus } from './urlhaus';

/**
 * Perform comprehensive safety analysis on QR data
 * Runs all checks in parallel for performance
 */
export async function analyzeQRSafety(qrData: QRData): Promise<SafetyAnalysis> {
  const startTime = Date.now();

  // Run all safety checks in parallel
  const [azureCheck, safeBrowsingCheck, urlhausCheck] = await Promise.all([
    analyzeWithAzureOpenAI(qrData),
    checkGoogleSafeBrowsing(qrData),
    checkURLhaus(qrData),
  ]);

  const checks = [azureCheck, safeBrowsingCheck, urlhausCheck];

  // Add local heuristic checks for URLs
  if (qrData.type === QRType.URL) {
    const localCheck = performLocalHeuristicCheck(qrData);
    checks.push(localCheck);
  }

  // Calculate aggregated risk score
  const riskScore = calculateRiskScore(checks, qrData);

  // Determine risk level
  const riskLevel = determineRiskLevel(riskScore);

  // Generate explanation
  const explanations = generateExplanations(checks, riskScore, qrData);

  // Generate recommendations
  const recommendations = generateRecommendations(riskLevel, checks, qrData);

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
 * Perform local heuristic checks (fast, no API calls)
 */
function performLocalHeuristicCheck(qrData: QRData): SafetyCheck {
  const content = qrData.parsedContent as URLContent;
  const concerns: string[] = [];
  let isThreat = false;

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

  // Check for well-known safe domains
  const isTrustedDomain = TRUSTED_DOMAINS.some((domain) =>
    content.domain === domain || content.domain.endsWith('.' + domain)
  );

  // Check for suspicious TLDs
  const hasSuspiciousTLD = SUSPICIOUS_TLDS.some((tld) =>
    content.domain.toLowerCase().endsWith(tld)
  );

  if (hasSuspiciousTLD) {
    concerns.push('Suspicious top-level domain');
    isThreat = true;
  }

  return {
    source: 'local-heuristics',
    isThreat,
    threatType: concerns.length > 0 ? concerns.join(', ') : undefined,
    confidence: 0.7,
    details: concerns.length > 0
      ? `Local checks found ${concerns.length} concern(s)`
      : 'Local checks passed',
    timestamp: Date.now(),
  };
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
function generateRecommendations(riskLevel: RiskLevel, checks: SafetyCheck[], qrData: QRData): string[] {
  const recommendations: string[] = [];

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
