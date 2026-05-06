# AmanQR Security Proxy

Cloudflare Worker proxy for AmanQR security checks. Combines Google Safe Browsing and URLhaus checks with caching and rate limiting.

## Features

- **Combined Security Check**: Single endpoint queries both Google Safe Browsing and URLhaus
- **Caching**: 1-hour cache to reduce API calls and improve response time
- **Rate Limiting**: 30 requests per minute per IP (configurable)
- **CORS Support**: Ready for cross-origin requests from mobile app
- **Offline Mode Detection**: Returns `isOffline` flag when both services fail

## Deployment

### Prerequisites

1. Cloudflare account
2. Wrangler CLI installed: `npm install -g wrangler`
3. Google Safe Browsing API key from [Google Cloud Console](https://console.cloud.google.com/)

### Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

3. **Create KV namespace**:
   ```bash
   wrangler kv:namespace create "AMANQR_RATE_LIMIT"
   ```
   Copy the namespace ID and update `wrangler.toml`.

4. **Set secrets**:
   ```bash
   wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY
   # Enter your API key when prompted
   ```

5. **Deploy**:
   ```bash
   npm run deploy
   ```

### Development

```bash
# Run locally
npm run dev

# Type check
npm run typecheck
```

## API Usage

### Endpoint

```
POST /api/security-check
```

### Request Body

```json
{
  "url": "https://example.com"
}
```

### Response

```json
{
  "safeBrowsing": {
    "isThreat": false,
    "confidence": 0.9,
    "details": "No threats found in Google Safe Browsing database"
  },
  "urlhaus": {
    "isThreat": false,
    "confidence": 0.85,
    "details": "URL not found in URLhaus malware database"
  },
  "isOffline": false,
  "cacheHit": false,
  "timestamp": 1234567890
}
```

### Headers

Response includes:
- `X-Cache`: HIT or MISS
- `X-RateLimit-Limit`: 30
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

### Rate Limiting

When rate limit is exceeded (429 response):

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Try again after 45 seconds.",
  "retryAfter": 45
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_SAFE_BROWSING_API_KEY` | Required | Google Safe Browsing API key |
| `RATE_LIMIT_REQUESTS` | 30 | Max requests per window per IP |
| `RATE_LIMIT_WINDOW` | 60 | Window size in seconds |
| `CACHE_TTL` | 3600 | Cache duration in seconds |

## Architecture

```
Client Request
    ↓
Rate Limit Check (KV)
    ↓
Cache Check (Cache API)
    ↓
Parallel API Calls
├── Google Safe Browsing
└── URLhaus
    ↓
Cache Result
    ↓
Response with Offline Status
```
