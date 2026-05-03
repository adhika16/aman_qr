/**
 * Azure OpenAI Service
 * AI-powered safety analysis for QR code content
 */

import {
  QRData,
  QRType,
  AzureOpenAIResponse,
  SafetyCheck,
  URLContent,
  WiFiContent,
  ContactContent,
  UPIPaymentContent,
  EmailContent,
  PhoneContent,
  CryptoContent,
  PlainTextContent,
  RiskLevel,
} from '../types/qr.types';
import { AZURE_OPENAI_CONFIG } from '../constants/config';

/**
 * Analyze QR content safety using Azure OpenAI
 */
export async function analyzeWithAzureOpenAI(qrData: QRData): Promise<SafetyCheck> {
  try {
    // Build analysis prompt
    const prompt = buildAnalysisPrompt(qrData);

    // For POC, simulate API call with timeout
    // In production, uncomment the actual API call below
    const response = await mockAzureOpenAICall(prompt);
    // const response = await callAzureOpenAIAPI(prompt);

    const isThreat = response.risk_level !== 'low';
    const confidence = response.confidence / 100;

    return {
      source: 'azure-openai',
      isThreat,
      threatType: isThreat ? response.red_flags.join(', ') : undefined,
      confidence,
      details: response.reasoning,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('Azure OpenAI analysis failed:', error);

    return {
      source: 'azure-openai',
      isThreat: false,
      confidence: 0,
      details: 'Analysis failed or timed out',
      timestamp: Date.now(),
    };
  }
}

/**
 * Build analysis prompt based on QR type
 */
function buildAnalysisPrompt(qrData: QRData): string {
  const typeLabel = getTypeLabel(qrData.type);
  const content = formatContentForAnalysis(qrData);

  return `Analyze this QR code content for safety concerns:

Type: ${typeLabel}
Content: ${content}

Evaluate based on:
1. For URLs: Domain reputation patterns, suspicious keywords, typosquatting, URL encoding tricks, unusual TLDs
2. For WiFi: Security settings, open networks, hidden SSIDs
3. For Payments: Payee legitimacy, amount manipulation risks, suspicious identifiers
4. For Contacts: Suspicious field content, unusual data patterns
5. For Crypto: Address patterns, clipboard attack risks, poisoning attempts
6. For Email/Phone: Phishing indicators, spam vectors, premium rate scams

Consider:
- Is this a well-known legitimate service?
- Are there signs of typosquatting (e.g., paypa1.com vs paypal.com)?
- Is it using suspicious URL shorteners?
- Does it request sensitive information?
- Are there suspicious patterns in the content?

Respond ONLY in this JSON format:
{
  "risk_level": "low|medium|high|critical",
  "confidence": 0-100,
  "reasoning": "Brief 1-2 sentence explanation",
  "red_flags": ["specific concern 1", "specific concern 2"],
  "recommendation": "safe|caution|block"
}`;
}

/**
 * Format QR content for analysis based on type
 */
function formatContentForAnalysis(qrData: QRData): string {
  switch (qrData.type) {
    case QRType.URL: {
      const content = qrData.parsedContent as URLContent;
      return `URL: ${content.originalUrl}
Domain: ${content.domain}
Protocol: ${content.protocol}
Shortened: ${content.isShortened ? 'Yes' : 'No'}`;
    }

    case QRType.WIFI: {
      const content = qrData.parsedContent as WiFiContent;
      return `SSID: ${content.ssid}
Encryption: ${content.encryption}
Hidden: ${content.isHidden ? 'Yes' : 'No'}
Open Network: ${content.encryption === 'nopass' ? 'Yes' : 'No'}`;
    }

    case QRType.UPI_PAYMENT: {
      const content = qrData.parsedContent as UPIPaymentContent;
      return `Payee ID: ${content.payeeId}
Payee Name: ${content.payeeName || 'Not specified'}
Amount: ${content.amount || 'Not specified'}
Currency: ${content.currency}`;
    }

    case QRType.CONTACT: {
      const content = qrData.parsedContent as ContactContent;
      return `Name: ${content.name}
Phone: ${content.phoneNumbers[0] || 'Not provided'}
Email: ${content.emails[0] || 'Not provided'}
Organization: ${content.organization || 'Not provided'}`;
    }

    case QRType.EMAIL: {
      const content = qrData.parsedContent as EmailContent;
      return `To: ${content.address}
Subject: ${content.subject || 'Not specified'}
Body Preview: ${content.body ? content.body.substring(0, 100) : 'Not specified'}`;
    }

    case QRType.PHONE: {
      const content = qrData.parsedContent as PhoneContent;
      return `Number: ${content.number}
International: ${content.isInternational ? 'Yes' : 'No'}`;
    }

    case QRType.CRYPTO: {
      const content = qrData.parsedContent as CryptoContent;
      return `Currency: ${content.currency}
Address: ${content.address}
Amount: ${content.amount || 'Not specified'}`;
    }

    case QRType.PLAIN_TEXT: {
      const content = qrData.parsedContent as PlainTextContent;
      return `Text Content:\n${content.text.substring(0, 500)}`;
    }

    default:
      return qrData.rawContent;
  }
}

/**
 * Map risk level to RiskLevel enum
 */
function mapRiskLevelToEnum(riskLevel: string): RiskLevel {
  switch (riskLevel) {
    case 'low':
      return RiskLevel.SAFE;
    case 'medium':
      return RiskLevel.CAUTION;
    case 'high':
      return RiskLevel.HIGH_RISK;
    case 'critical':
      return RiskLevel.DANGEROUS;
    default:
      return RiskLevel.SAFE;
  }
}

/**
 * Get human-readable type label
 */
function getTypeLabel(type: QRType): string {
  const labels: Record<QRType, string> = {
    [QRType.URL]: 'Website URL',
    [QRType.WIFI]: 'WiFi Network',
    [QRType.CONTACT]: 'Contact Card',
    [QRType.UPI_PAYMENT]: 'Payment Request',
    [QRType.EMAIL]: 'Email',
    [QRType.PHONE]: 'Phone Number',
    [QRType.CRYPTO]: 'Cryptocurrency',
    [QRType.PLAIN_TEXT]: 'Plain Text',
    [QRType.UNKNOWN]: 'Unknown',
  };
  return labels[type] || 'Unknown';
}

/**
 * Mock Azure OpenAI API call for POC
 * In production, replace with actual API call
 */
async function mockAzureOpenAICall(prompt: string): Promise<AzureOpenAIResponse> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Extract URL from prompt if present
  const urlMatch = prompt.match(/URL:\s*(.+)/);
  const url = urlMatch ? urlMatch[1].trim() : '';

  // Simple heuristic-based mock responses for POC
  if (url) {
    // Known safe domains
    const safeDomains = ['google.com', 'microsoft.com', 'apple.com', 'github.com'];
    if (safeDomains.some((domain) => url.includes(domain))) {
      return {
        risk_level: 'low',
        confidence: 95,
        reasoning: 'Well-known legitimate domain with good reputation',
        red_flags: [],
        recommendation: 'safe',
      };
    }

    // Suspicious patterns
    if (url.includes('paypa1') || url.includes('amaz0n') || url.includes('g00gle')) {
      return {
        risk_level: 'critical',
        confidence: 90,
        reasoning: 'Typosquatting attempt detected - domain mimics legitimate service',
        red_flags: ['Typosquatting detected', 'Potential phishing attempt'],
        recommendation: 'block',
      };
    }

    // HTTP sites
    if (url.startsWith('http://') && !url.includes('localhost')) {
      return {
        risk_level: 'medium',
        confidence: 70,
        reasoning: 'Unencrypted HTTP connection - data may be intercepted',
        red_flags: ['No HTTPS encryption'],
        recommendation: 'caution',
      };
    }

    // URL shorteners
    if (url.includes('bit.ly') || url.includes('tinyurl') || url.includes('t.co')) {
      return {
        risk_level: 'medium',
        confidence: 65,
        reasoning: 'URL shortener obscures final destination',
        red_flags: ['URL shortener used', 'Destination cannot be verified'],
        recommendation: 'caution',
      };
    }
  }

  // Default safe response
  return {
    risk_level: 'low',
    confidence: 60,
    reasoning: 'No obvious red flags detected in the content',
    red_flags: [],
    recommendation: 'safe',
  };
}

/**
 * Actual Azure OpenAI API call (for production use)
 * Uncomment and configure when ready for production
 */
async function callAzureOpenAIAPI(prompt: string): Promise<AzureOpenAIResponse> {
  const url = `${AZURE_OPENAI_CONFIG.endpoint}/openai/deployments/${AZURE_OPENAI_CONFIG.deploymentName}/chat/completions?api-version=${AZURE_OPENAI_CONFIG.apiVersion}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': AZURE_OPENAI_CONFIG.apiKey,
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: 'You are a cybersecurity expert analyzing QR code content for safety threats.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`Azure OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('Empty response from Azure OpenAI');
  }

  // Parse JSON response
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as AzureOpenAIResponse;
    }
    throw new Error('No JSON found in response');
  } catch (error) {
    console.error('Failed to parse Azure OpenAI response:', error);
    throw new Error('Invalid response format from Azure OpenAI');
  }
}
