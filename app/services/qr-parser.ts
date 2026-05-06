/**
 * QR Parser Service
 * Detects QR code type and extracts structured data from various formats
 */

import {
  QRType,
  QRData,
  QRContent,
  URLContent,
  WiFiContent,
  ContactContent,
  UPIPaymentContent,
  EmailContent,
  PhoneContent,
  CryptoContent,
  PlainTextContent,
} from '../types/qr.types';
import { URL_SHORTENERS } from '../constants/config';

/**
 * Main function to parse QR code data
 */
export function parseQRData(rawContent: string): QRData {
  const type = detectQRType(rawContent);
  const parsedContent = parseContentByType(rawContent, type);

  return {
    id: generateId(),
    type,
    rawContent,
    parsedContent,
    timestamp: Date.now(),
  };
}

/**
 * Generate a unique ID for the QR data
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Detect the type of QR code based on content patterns
 */
export function detectQRType(data: string): QRType {
  const trimmed = data.trim().toUpperCase();
  const lower = data.trim().toLowerCase();

  // URL detection
  if (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('www.')
  ) {
    return QRType.URL;
  }

  // WiFi configuration
  if (trimmed.startsWith('WIFI:')) {
    return QRType.WIFI;
  }

  // UPI Payment (India)
  if (lower.startsWith('upi://')) {
    return QRType.UPI_PAYMENT;
  }

  // Contact card (vCard or MeCard)
  if (trimmed.includes('BEGIN:VCARD') || trimmed.startsWith('MECARD:')) {
    return QRType.CONTACT;
  }

  // Email
  if (lower.startsWith('mailto:') || trimmed.startsWith('MATMSG:')) {
    return QRType.EMAIL;
  }

  // Phone
  if (lower.startsWith('tel:') || trimmed.startsWith('TEL:')) {
    return QRType.PHONE;
  }

  // SMS
  if (lower.startsWith('smsto:') || lower.startsWith('sms:')) {
    return QRType.PHONE;
  }

  // Cryptocurrency
  if (
    lower.startsWith('bitcoin:') ||
    lower.startsWith('ethereum:') ||
    lower.startsWith('litecoin:') ||
    lower.startsWith('bitcoincash:') ||
    lower.startsWith('dogecoin:')
  ) {
    return QRType.CRYPTO;
  }

  // Geo location
  if (lower.startsWith('geo:')) {
    return QRType.PLAIN_TEXT;
  }

  // Calendar event
  if (trimmed.startsWith('BEGIN:VEVENT')) {
    return QRType.PLAIN_TEXT;
  }

  // Default to plain text
  return QRType.PLAIN_TEXT;
}

/**
 * Parse content based on detected type
 */
function parseContentByType(data: string, type: QRType): QRContent {
  switch (type) {
    case QRType.URL:
      return parseURL(data);
    case QRType.WIFI:
      return parseWiFi(data);
    case QRType.CONTACT:
      return parseContact(data);
    case QRType.UPI_PAYMENT:
      return parseUPIPayment(data);
    case QRType.EMAIL:
      return parseEmail(data);
    case QRType.PHONE:
      return parsePhone(data);
    case QRType.CRYPTO:
      return parseCrypto(data);
    case QRType.PLAIN_TEXT:
    default:
      return parsePlainText(data);
  }
}

/**
 * Parse URL content
 */
function parseURL(url: string): URLContent {
  let normalizedUrl = url.trim();

  // Add https if no protocol
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  try {
    const urlObj = new URL(normalizedUrl);
    const domain = urlObj.hostname.toLowerCase();

    // Check if shortened
    const isShortened = URL_SHORTENERS.some((shortener) =>
      domain.includes(shortener)
    );

    return {
      originalUrl: normalizedUrl,
      protocol: urlObj.protocol.replace(':', ''),
      domain: domain,
      path: urlObj.pathname,
      query: urlObj.search,
      isShortened,
      isHttps: urlObj.protocol === 'https:',
    };
  } catch {
    // Fallback for invalid URLs
    return {
      originalUrl: normalizedUrl,
      protocol: normalizedUrl.startsWith('https') ? 'https' : 'http',
      domain: normalizedUrl.replace(/^https?:\/\//, '').split('/')[0],
      path: '',
      query: '',
      isShortened: false,
      isHttps: normalizedUrl.startsWith('https'),
    };
  }
}

/**
 * Parse WiFi configuration
 */
function parseWiFi(data: string): WiFiContent {
  const params: Record<string, string> = {};
  const content = data.replace(/^WIFI:/i, '');

  // Parse semicolon-separated key-value pairs
  content.split(';').forEach((pair) => {
    const [key, value] = pair.split(':');
    if (key && value !== undefined) {
      params[key] = value;
    }
  });

  const encryption = params.T || 'nopass';

  return {
    ssid: params.S || '',
    password: params.P || '',
    encryption: encryption,
    isHidden: params.H === 'true',
  };
}

/**
 * Parse Contact card (vCard)
 */
function parseContact(data: string): ContactContent {
  const lines = data.split(/\r?\n/);
  let name = '';
  const phoneNumbers: string[] = [];
  const emails: string[] = [];
  let organization = '';
  let title = '';
  const addresses: string[] = [];

  for (const line of lines) {
    const upperLine = line.toUpperCase();

    if (upperLine.startsWith('FN:')) {
      name = line.substring(3);
    } else if (upperLine.startsWith('N:') && !name) {
      // N:LastName;FirstName;MiddleName;Prefix;Suffix
      const parts = line.substring(2).split(';');
      name = [parts[1], parts[2], parts[0]].filter(Boolean).join(' ');
    } else if (upperLine.startsWith('TEL')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > -1) {
        phoneNumbers.push(line.substring(colonIndex + 1));
      }
    } else if (upperLine.startsWith('EMAIL')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > -1) {
        emails.push(line.substring(colonIndex + 1));
      }
    } else if (upperLine.startsWith('ORG:')) {
      organization = line.substring(4);
    } else if (upperLine.startsWith('TITLE:')) {
      title = line.substring(6);
    } else if (upperLine.startsWith('ADR')) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > -1) {
        addresses.push(line.substring(colonIndex + 1).replace(/;/g, ', '));
      }
    }
  }

  return {
    name: name || 'Unknown',
    phoneNumbers,
    emails,
    organization: organization || undefined,
    title: title || undefined,
    addresses: addresses.length > 0 ? addresses : undefined,
    rawVCard: data,
  };
}

/**
 * Parse UPI Payment
 */
function parseUPIPayment(data: string): UPIPaymentContent {
  const url = new URL(data);
  const params = url.searchParams;

  return {
    payeeId: params.get('pa') || '',
    payeeName: params.get('pn') || undefined,
    amount: params.get('am') || undefined,
    currency: params.get('cu') || 'INR',
    description: params.get('tn') || undefined,
    merchantCode: params.get('mc') || undefined,
  };
}

/**
 * Parse Email
 */
function parseEmail(data: string): EmailContent {
  if (data.toLowerCase().startsWith('mailto:')) {
    const rest = data.substring(7);
    const [emailPart, queryString] = rest.split('?');
    const params = new URLSearchParams(queryString || '');

    return {
      address: emailPart,
      subject: params.get('subject') || undefined,
      body: params.get('body') || undefined,
    };
  }

  // MATMSG format
  if (data.toUpperCase().startsWith('MATMSG:')) {
    const to = data.match(/TO:([^;]+)/)?.[1] || '';
    const subject = data.match(/SUB:([^;]+)/)?.[1] || '';
    const body = data.match(/BODY:([^;]+)/)?.[1] || '';

    return {
      address: to,
      subject: subject || undefined,
      body: body || undefined,
    };
  }

  return { address: data };
}

/**
 * Parse Phone
 */
function parsePhone(data: string): PhoneContent {
  let number = data;

  if (data.toLowerCase().startsWith('tel:')) {
    number = data.substring(4);
  } else if (data.toLowerCase().startsWith('smsto:')) {
    number = data.substring(6);
  }

  // Remove any query parameters for SMS
  number = number.split('?')[0];

  return {
    number: number.trim(),
    isInternational: number.startsWith('+') || number.startsWith('00'),
  };
}

/**
 * Parse Cryptocurrency
 */
function parseCrypto(data: string): CryptoContent {
  const [protocol, rest] = data.split(':');
  const [address, queryString] = (rest || '').split('?');
  const params = new URLSearchParams(queryString || '');

  return {
    currency: protocol.toUpperCase(),
    address: address,
    amount: params.get('amount') || undefined,
    label: params.get('label') || undefined,
    message: params.get('message') || undefined,
  };
}

/**
 * Parse Plain Text
 */
function parsePlainText(data: string): PlainTextContent {
  return {
    text: data,
    length: data.length,
  };
}

/**
 * Extract domain from various QR types for threat checking
 */
export function extractDomainForCheck(qrData: QRData): string | null {
  switch (qrData.type) {
    case QRType.URL:
      return (qrData.parsedContent as URLContent).domain;
    case QRType.EMAIL:
      const email = qrData.parsedContent as EmailContent;
      return email.address.split('@')[1] || null;
    default:
      return null;
  }
}
