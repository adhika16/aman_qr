/**
 * Application Configuration
 * API keys and configuration values
 */

// Security Proxy Configuration (Cloudflare Worker)
// This proxy combines Google Safe Browsing and URLhaus checks
// API keys are kept secure on the server-side
export const SECURITY_PROXY_CONFIG = {
  endpoint: process.env.EXPO_PUBLIC_SECURITY_PROXY_ENDPOINT || '',
  timeout: 5000, // 5 seconds
  maxRetries: 2,
};

// URLhaus Configuration (for reference - now handled by proxy)
export const URLHAUS_CONFIG = {
  endpoint: 'https://urlhaus-api.abuse.ch/v1/url/',
  timeout: 3000,
  maxRetries: 1,
};

// Risk Scoring Configuration
export const RISK_SCORING = {
  baseScore: 5,
  minScore: 1,
  maxScore: 10,
  factors: {
    httpNotHttps: 2,
    urlShortener: 1,
    threatIntelFlagged: 3,
    suspiciousDomain: 2,
    knownMalicious: 4,
    recentlyCreated: 1,
    llmConcernLow: 1,
    llmConcernMedium: 2,
    llmConcernHigh: 3,
    wellKnownDomain: -2,
    httpsValid: -1,
  },
};

// Risk Level Thresholds
export const RISK_THRESHOLDS = {
  safe: { min: 1, max: 3 },
  caution: { min: 4, max: 6 },
  highRisk: { min: 7, max: 8 },
  dangerous: { min: 9, max: 10 },
};

// URL Shorteners List
export const URL_SHORTENERS = [
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'short.link',
  'is.gd',
  'buff.ly',
  'adf.ly',
  'bitly.com',
  'shorturl.at',
  'rebrand.ly',
  'cutt.ly',
  'short.io',
];

// Well-Known Safe Domains
export const TRUSTED_DOMAINS = [
  'google.com',
  'microsoft.com',
  'apple.com',
  'amazon.com',
  'facebook.com',
  'twitter.com',
  'linkedin.com',
  'github.com',
  'youtube.com',
  'instagram.com',
  'whatsapp.com',
  'spotify.com',
  'netflix.com',
  'paypal.com',
  'stripe.com',
  'githubusercontent.com',
  'googleapis.com',
  'cloudflare.com',
];

// Suspicious TLDs
export const SUSPICIOUS_TLDS = [
  '.tk',
  '.ml',
  '.ga',
  '.cf',
  '.gq',
  '.xyz',
  '.top',
  '.work',
  '.date',
  '.party',
  '.link',
  '.click',
  '.download',
];

// App Configuration
export const APP_CONFIG = {
  name: 'AmanQR',
  version: '1.0.0',
  maxQRContentLength: 5000,
  scanCooldown: 1000, // ms between scans
  defaultTimeout: 3000,
};

// UI Configuration
export const UI_CONFIG = {
  colors: {
    safe: '#22C55E',
    caution: '#EAB308',
    highRisk: '#F97316',
    dangerous: '#EF4444',
    neutral: '#6B7280',
    primary: '#3B82F6',
    background: '#FFFFFF',
    text: '#1F2937',
  },
  animations: {
    scanLineDuration: 2000,
    resultTransition: 300,
  },
};
