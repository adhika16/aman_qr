// QR Code Type Definitions for AmanQR

/**
 * QR Code Types supported by the application
 */
export enum QRType {
  URL = 'url',
  WIFI = 'wifi',
  CONTACT = 'contact',
  UPI_PAYMENT = 'upi_payment',
  EMAIL = 'email',
  PHONE = 'phone',
  CRYPTO = 'crypto',
  PLAIN_TEXT = 'plain_text',
  UNKNOWN = 'unknown',
}

/**
 * Risk Level classifications
 */
export enum RiskLevel {
  SAFE = 'safe',
  CAUTION = 'caution',
  HIGH_RISK = 'high_risk',
  DANGEROUS = 'dangerous',
}

/**
 * Risk Level Configuration for UI display
 */
export interface RiskLevelConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}

export const RISK_LEVEL_CONFIG: Record<RiskLevel, RiskLevelConfig> = {
  [RiskLevel.SAFE]: {
    label: 'Safe',
    color: '#22C55E', // Green
    bgColor: 'rgba(34, 197, 94, 0.1)',
    icon: 'checkmark.shield.fill',
    description: 'This QR code appears safe to use',
  },
  [RiskLevel.CAUTION]: {
    label: 'Caution',
    color: '#EAB308', // Yellow
    bgColor: 'rgba(234, 179, 8, 0.1)',
    icon: 'exclamationmark.triangle.fill',
    description: 'Exercise caution before proceeding',
  },
  [RiskLevel.HIGH_RISK]: {
    label: 'High Risk',
    color: '#F97316', // Orange
    bgColor: 'rgba(249, 115, 22, 0.1)',
    icon: 'exclamationmark.octagon.fill',
    description: 'This QR code shows suspicious characteristics',
  },
  [RiskLevel.DANGEROUS]: {
    label: 'Dangerous',
    color: '#EF4444', // Red
    bgColor: 'rgba(239, 68, 68, 0.1)',
    icon: 'xmark.shield.fill',
    description: 'This QR code is likely malicious - do not proceed',
  },
};

/**
 * QR Type display labels
 */
export const QR_TYPE_LABELS: Record<QRType, string> = {
  [QRType.URL]: 'Website URL',
  [QRType.WIFI]: 'WiFi Network',
  [QRType.CONTACT]: 'Contact Card',
  [QRType.UPI_PAYMENT]: 'Payment',
  [QRType.EMAIL]: 'Email',
  [QRType.PHONE]: 'Phone Number',
  [QRType.CRYPTO]: 'Cryptocurrency',
  [QRType.PLAIN_TEXT]: 'Text',
  [QRType.UNKNOWN]: 'Unknown',
};

/**
 * QR Type icons
 */
export const QR_TYPE_ICONS: Record<QRType, string> = {
  [QRType.URL]: 'safari.fill',
  [QRType.WIFI]: 'wifi',
  [QRType.CONTACT]: 'person.crop.circle.fill',
  [QRType.UPI_PAYMENT]: 'indianrupeesign.circle.fill',
  [QRType.EMAIL]: 'envelope.fill',
  [QRType.PHONE]: 'phone.fill',
  [QRType.CRYPTO]: 'bitcoinsign.circle.fill',
  [QRType.PLAIN_TEXT]: 'doc.text.fill',
  [QRType.UNKNOWN]: 'questionmark.circle.fill',
};

// ============================================
// Content Interfaces for each QR Type
// ============================================

/**
 * URL QR Code Content
 */
export interface URLContent {
  originalUrl: string;
  protocol: string;
  domain: string;
  path: string;
  query: string;
  isHttps: boolean;
  isShortened: boolean;
  shortenerService?: string;
}

/**
 * WiFi QR Code Content
 */
export interface WiFiContent {
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass' | string;
  isHidden: boolean;
}

/**
 * Contact Card (vCard) Content
 */
export interface ContactContent {
  name: string;
  phoneNumbers: string[];
  emails: string[];
  organization?: string;
  title?: string;
  addresses?: string[];
  rawVCard: string;
}

/**
 * UPI Payment QR Code Content
 */
export interface UPIPaymentContent {
  payeeId: string;
  payeeName?: string;
  amount?: string;
  currency: string;
  description?: string;
  merchantCode?: string;
  transactionRef?: string;
}

/**
 * Email QR Code Content
 */
export interface EmailContent {
  address: string;
  subject?: string;
  body?: string;
}

/**
 * Phone Number QR Code Content
 */
export interface PhoneContent {
  number: string;
  isInternational: boolean;
}

/**
 * Cryptocurrency QR Code Content
 */
export interface CryptoContent {
  currency: string;
  address: string;
  amount?: string;
  label?: string;
  message?: string;
}

/**
 * Plain Text QR Code Content
 */
export interface PlainTextContent {
  text: string;
  length: number;
}

/**
 * Union type for all QR content types
 */
export type QRContent =
  | URLContent
  | WiFiContent
  | ContactContent
  | UPIPaymentContent
  | EmailContent
  | PhoneContent
  | CryptoContent
  | PlainTextContent
  | null;

// ============================================
// Core Data Structures
// ============================================

/**
 * Main QR Data structure containing parsed information
 */
export interface QRData {
  id: string;
  type: QRType;
  rawContent: string;
  parsedContent: QRContent;
  timestamp: number;
}

/**
 * Individual safety check result
 */
export interface SafetyCheck {
  source: 'google-safe-browsing' | 'urlhaus' | 'local-heuristics';
  isThreat: boolean;
  threatType?: string;
  confidence: number; // 0-100
  details?: string;
  timestamp: number;
}

/**
 * Complete safety analysis result
 */
export interface SafetyAnalysis {
  checks: SafetyCheck[];
  riskScore: number; // 1-10
  riskLevel: RiskLevel;
  overallConfidence: number; // 0-100
  redFlags: string[];
  recommendations: string[];
  explanations: {
    summary: string;
    details: string[];
  };
}

/**
 * Analysis Result combining QR data and safety analysis
 */
export interface QRAnalysisResult {
  qrData: QRData;
  safetyAnalysis: SafetyAnalysis;
}

// ============================================
// API Response Types
// ============================================

/**
 * Google Safe Browsing API Response
 */
export interface SafeBrowsingResponse {
  matches?: Array<{
    threatType: string;
    platformType: string;
    threat: {
      url: string;
    };
  }>;
}

/**
 * URLhaus API Response
 */
export interface URLhausResponse {
  query_status: string;
  id?: string;
  urlhaus_reference?: string;
  threat?: string;
  url?: string;
  tags?: string[];
  url_status?: string;
  date_added?: string;
}

/**
 * URL Check Result (aggregated)
 */
export interface URLCheckResult {
  isThreat: boolean;
  threatType?: string;
  source: 'google-safe-browsing' | 'urlhaus';
  details?: string;
}

// ============================================
// Legacy Types (for backward compatibility)
// ============================================

export interface ParsedQRContent {
  type: QRType;
  data: string;
  metadata?: {
    url?: string;
    domain?: string;
    protocol?: string;
  };
}

// ============================================
// UI Component Props Types
// ============================================

export interface RiskScoreProps {
  score: number;
  level: RiskLevel;
  size?: 'small' | 'medium' | 'large';
}

export interface RiskBadgeProps {
  level: RiskLevel;
  showIcon?: boolean;
}

export interface QRTypeIndicatorProps {
  type: QRType;
  showLabel?: boolean;
}

export interface ActionButtonsProps {
  qrData: QRData;
  riskLevel: RiskLevel;
  onCopy: () => void;
  onOpen?: () => void;
  onClose: () => void;
}
