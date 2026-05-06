export interface SecurityCheckRequest {
  url: string;
}

export interface SecurityCheckResponse {
  safeBrowsing: SafeBrowsingResult;
  urlhaus: URLhausResult;
  isOffline: boolean;
  cacheHit: boolean;
  timestamp: number;
}

export interface SafeBrowsingResult {
  isThreat: boolean;
  threatType?: string;
  confidence: number;
  details: string;
  error?: string;
}

export interface URLhausResult {
  isThreat: boolean;
  threatType?: string;
  confidence: number;
  details: string;
  error?: string;
}

export interface RateLimitInfo {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export interface CacheEntry {
  url: string;
  result: SecurityCheckResponse;
  timestamp: number;
}
