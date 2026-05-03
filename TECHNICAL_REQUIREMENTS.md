# AmanQR Technical & Requirements Document

**Version**: 1.0  
**Date**: May 2026  
**Status**: POC Phase

---

## 1. Project Overview

### 1.1 Purpose
AmanQR is a mobile safety application that scans QR codes and validates their safety before users proceed with transactions (e-wallet, e-banking, etc.).

### 1.2 Problem Statement
Fake QR codes are increasingly used to scam users, causing financial losses. Users lack tools to verify QR code safety before scanning with payment applications.

### 1.3 Solution
Real-time QR code analysis combining:
- Multi-type QR parsing (URL, WiFi, Contact, Payment, etc.)
- AI-powered safety analysis (Azure OpenAI)
- Threat intelligence validation (open-source APIs)
- Risk scoring system (1-10 scale)

---

## 2. Technical Architecture

### 2.1 Tech Stack
| Component | Technology |
|-----------|------------|
| Framework | Expo SDK ~54.0.33 |
| Runtime | React Native 0.81.5, React 19.1.0 |
| Routing | expo-router v6 (file-based) |
| Language | TypeScript (Strict mode) |
| QR Scanning | expo-camera / expo-barcode-scanner |
| AI Service | Azure OpenAI (GPT-4o-mini) |
| Threat Intel | Google Safe Browsing + URLhaus |
| Architecture | New Architecture Enabled |

### 2.2 System Flow

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                        │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │ Scan Screen  │───▶│ Result Screen│                  │
│  └──────────────┘    └──────────────┘                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  QR PROCESSING LAYER                     │
│  ┌─────────────┐    ┌─────────────┐    ┌──────────────┐│
│  │ QR Scanner  │───▶│ QR Parser   │───▶│ Risk Engine  ││
│  └─────────────┘    │ (Classifier)│    └──────┬───────┘│
│                     └─────────────┘             │       │
└─────────────────────────────────────────────────┼───────┘
                                                  │
                       ┌──────────────────────────┴──────────┐
                       ▼                                     ▼
┌─────────────────────────────────┐  ┌─────────────────────────────────┐
│    SAFETY ANALYSIS SERVICES      │  │   THREAT INTELLIGENCE SERVICES   │
│  ┌───────────────────────────┐  │  │  ┌─────────────────────────────┐ │
│  │ Azure OpenAI              │  │  │  │ Google Safe Browsing        │ │
│  │ - URL/domain analysis     │  │  │  │ - Domain reputation         │ │
│  │ - Heuristic reasoning     │  │  │  │ - Malware detection         │ │
│  │ - Suspicious pattern      │  │  │  │                               │ │
│  │   detection               │  │  │  │ URLhaus                     │ │
│  └───────────────────────────┘  │  │  │ - Known malicious URLs      │ │
└─────────────────────────────────┘  │  └─────────────────────────────┘ │
                                     └─────────────────────────────────┘
```

### 2.3 Data Flow

```typescript
Scan → Parse → Parallel Checks → Aggregate → Score → Display
  │       │            │              │        │        │
  │       │     ┌──────┴──────┐       │        │        │
  │       │     ▼             ▼       │        │        │
  │       │  [Azure]      [Safe Browsing]  [URLhaus]   │
  │       │     │             │         │        │      │
  │       │     └──────┬──────┘         └────────┘      │
  │       │            │                                │
  │       └────────────┼────────────────────────────────┘
  │                    ▼
  │            Risk Calculator (1-10)
  │                    │
  └────────────────────┘
                       ▼
              Result Display with Actions
```

---

## 3. QR Type Support

### 3.1 Supported Types

| Type | Format Example | Risk Factors Analyzed |
|------|---------------|----------------------|
| **URL** | `https://example.com` | Phishing, malware, HTTPS, domain age, typosquatting |
| **WiFi** | `WIFI:T:WPA;S:network;P:pass;;` | Open network, hidden SSID, weak encryption |
| **Contact** | `BEGIN:VCARD...` | Executable fields, suspicious data |
| **UPI/Payment** | `upi://pay?pa=...&am=...` | Unknown payee, amount manipulation |
| **Email** | `mailto:email@domain.com` | Phishing vectors, suspicious domains |
| **Phone** | `tel:+1234567890` | Premium numbers, scam indicators |
| **Crypto** | `bitcoin:1A1zP1...` | Address poisoning, clipboard attacks |
| **Plain Text** | Arbitrary text | Social engineering, credential exposure |

### 3.2 QR Classification Logic

```typescript
if (data.startsWith('http://') || data.startsWith('https://')) → URL
else if (data.startsWith('WIFI:')) → WiFi
else if (data.startsWith('upi://')) → UPI Payment
else if (data.includes('BEGIN:VCARD')) → Contact
else if (data.startsWith('mailto:')) → Email
else if (data.startsWith('tel:')) → Phone
else if (data.startsWith('bitcoin:') || data.startsWith('ethereum:')) → Crypto
else → Plain Text
```

---

## 4. Risk Scoring System

### 4.1 Score Calculation

**Base Score**: 5 (Neutral)

| Factor | Impact | Condition |
|--------|--------|-----------|
| HTTP (not HTTPS) | +2 | Protocol check |
| URL Shortener | +1 | Detect bit.ly, tinyurl, etc. |
| Threat Intel Flagged | +3 | Safe Browsing or URLhaus match |
| Suspicious Domain Pattern | +2 | Typosquatting, unusual TLDs |
| Known Malicious | +4 (→ 10) | Confirmed threat |
| Recently Created Domain | +1 | WHOIS data if available |
| LLM Flags Concerns | +1 to +3 | Based on severity |
| Well-Known Domain | -2 | Major trusted domains |
| HTTPS with Valid Cert | -1 | Secure connection |
| **Minimum Score** | 1 | Floor cap |
| **Maximum Score** | 10 | Ceiling cap |

### 4.2 Risk Levels

| Score | Level | Color | User Action |
|-------|-------|-------|-------------|
| 1-3 | Safe | 🟢 Green | Proceed freely |
| 4-6 | Caution | 🟡 Yellow | Verify before proceeding |
| 7-8 | High Risk | 🟠 Orange | Strong warning, reconsider |
| 9-10 | Dangerous | 🔴 Red | Likely malicious, block |

---

## 5. API Integration Specifications

### 5.1 Azure OpenAI

**Configuration** (Placeholders):
```typescript
AZURE_OPENAI_ENDPOINT="https://YOUR_RESOURCE.openai.azure.com"
AZURE_OPENAI_API_KEY="YOUR_API_KEY"
AZURE_OPENAI_DEPLOYMENT_NAME="YOUR_DEPLOYMENT"
AZURE_OPENAI_API_VERSION="2024-02-01"
```

**Model**: GPT-4o-mini (cost-effective for classification tasks)

**Prompt Template**:
```
Analyze this QR code content for safety concerns:

Type: {qr_type}
Content: {qr_content}

Evaluate based on:
1. For URLs: Domain reputation patterns, suspicious keywords, encoding tricks
2. For WiFi: Security settings, network visibility
3. For Payments: Payee legitimacy, amount manipulation risks
4. For Contacts: Suspicious field content
5. For Crypto: Address patterns, poisoning attempts

Respond in JSON format:
{
  "risk_level": "low|medium|high|critical",
  "confidence": 0-100,
  "reasoning": "Brief explanation",
  "red_flags": ["flag1", "flag2"],
  "recommendation": "safe|caution|block"
}
```

**Timeout**: 3 seconds max (fail-safe to neutral)

### 5.2 Google Safe Browsing

**Configuration**:
```typescript
GOOGLE_SAFE_BROWSING_API_KEY="YOUR_API_KEY"
```

**Endpoint**: `https://safebrowsing.googleapis.com/v4/threatMatches:find`

**Request Body**:
```json
{
  "client": {
    "clientId": "amanqr",
    "clientVersion": "1.0.0"
  },
  "threatInfo": {
    "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
    "platformTypes": ["ANY_PLATFORM"],
    "threatEntryTypes": ["URL"],
    "threatEntries": [{"url": "URL_TO_CHECK"}]
  }
}
```

**Rate Limit**: 10,000 requests/day (free tier)

### 5.3 URLhaus

**Configuration**: No API key required (public API)

**Endpoint**: `https://urlhaus-api.abuse.ch/v1/url/`

**Usage**: Check if URL is in known malware database

**Rate Limit**: Reasonable use (no hard limit documented)

---

## 6. Performance Requirements

### 6.1 Response Time Targets

| Stage | Target | Maximum |
|-------|--------|---------|
| QR Scan to Parse | <500ms | 1s |
| Parse to Risk Calculation | <2s | 3s |
| Total: Scan to Result | <2.5s | 3.5s |

### 6.2 Optimization Strategies

1. **Parallel API Calls**: All safety checks run concurrently
2. **Timeout Handling**: Each API has 3s timeout, fails gracefully
3. **Progressive Enhancement**: Show quick local checks first, update with AI analysis
4. **No Blocking Operations**: Async throughout, UI remains responsive

---

## 7. Privacy & Security

### 7.1 Data Handling (POC Phase)

- **No local storage**: Scanned data processed ephemerally
- **No history logging**: Scan history feature deferred to Phase 2
- **API-only processing**: No data persisted on device
- **HTTPS enforcement**: All API calls use TLS 1.2+

### 7.2 User Data

| Data | Handling | Storage |
|------|----------|---------|
| Scanned QR Content | Transient | Not stored |
| Risk Score | Transient | Not stored |
| API Keys | Environment | Not in source code |

---

## 8. User Interface Requirements

### 8.1 Scan Screen

**Elements**:
- Camera viewfinder with QR frame overlay
- Torch toggle button
- Manual input option (for testing)
- Loading indicator during scan

**Behavior**:
- Auto-detect QR codes in frame
- Vibrate on successful scan
- Navigate to result immediately

### 8.2 Result Screen

**Elements**:
- QR type indicator (icon + label)
- Content preview (truncated if long)
- Risk score display (large number with color)
- Risk level badge (Safe/Caution/High/Dangerous)
- Explanation section (why this score)
- Red flags list (if any)
- Action buttons:
  - "Open" (for URLs) - disabled if score > 8
  - "Copy" (copy content to clipboard)
  - "Close" (return to scanner)

**Safety Tips**:
- Context-aware warnings based on QR type
- Education about common QR scams

---

## 9. File Structure

```
app/
├── _layout.tsx                    # Root navigation
├── index.tsx                      # Main entry (redirects to scan)
├── scan/
│   ├── index.tsx                  # QR Scanner screen
│   └── _layout.tsx                # Scan stack config
├── result/
│   ├── index.tsx                  # Result display screen
│   └── [id].tsx                   # Future: Saved result view
├── types/
│   └── qr.types.ts                # QR type definitions
├── services/
│   ├── qr-parser.ts               # QR classification & parsing
│   ├── risk-calculator.ts         # Risk scoring logic
│   ├── azure-openai.ts            # Azure OpenAI integration
│   ├── safe-browsing.ts           # Google Safe Browsing API
│   └── urlhaus.ts                 # URLhaus integration
├── constants/
│   └── config.ts                  # API configs (placeholders)
└── utils/
    └── validators.ts              # Validation helpers

components/
├── qr-scanner/
│   ├── CameraView.tsx             # Camera component
│   └── ScanOverlay.tsx            # QR frame overlay
├── result/
│   ├── RiskScore.tsx              # Risk score display
│   ├── RiskBadge.tsx              # Risk level badge
│   └── ActionButtons.tsx          # Result action buttons
└── ui/                            # Shared UI primitives

assets/
└── images/                        # App icons, splash

.env.example                       # Environment variables template
```

---

## 10. Implementation Phases

### Phase 1: Core (Current POC)
- [x] QR scanning with camera
- [x] URL parsing and safety check
- [x] Azure OpenAI integration
- [x] Google Safe Browsing integration
- [x] Risk scoring (1-10)
- [x] Result display with actions

### Phase 2: Extended Support
- [ ] WiFi config analysis
- [ ] Contact card inspection
- [ ] UPI/Payment validation
- [ ] Crypto address detection
- [ ] Email/Phone analysis

### Phase 3: Polish & Offline
- [ ] Scan history with local storage
- [ ] Offline heuristics (basic checks without internet)
- [ ] Share safety reports
- [ ] Performance optimizations
- [ ] User preferences

---

## 11. API Keys & Configuration

### 11.1 Required Keys (Placeholders)

Create `.env` file:

```env
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-azure-api-key
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name
AZURE_OPENAI_API_VERSION=2024-02-01

# Google Safe Browsing
GOOGLE_SAFE_BROWSING_API_KEY=your-google-api-key

# URLhaus (no key required)
```

### 11.2 Obtaining API Keys

**Azure OpenAI**:
1. Azure Portal → Create OpenAI resource
2. Deploy a model (GPT-4o-mini recommended)
3. Copy endpoint and key from "Keys and Endpoint"

**Google Safe Browsing**:
1. Google Cloud Console → Enable Safe Browsing API
2. Create API credentials
3. Copy API key

**URLhaus**:
- No registration required, use public API endpoint

---

## 12. Testing Strategy

### 12.1 Test QR Codes

| Type | Content | Expected Score |
|------|---------|----------------|
| Safe URL | `https://google.com` | 1-3 |
| HTTP URL | `http://example.com` | 5-6 |
| Suspicious | `https://paypa1.com/login` | 7-8 |
| Known Bad | (Use URLhaus test URL) | 9-10 |

### 12.2 Performance Testing

- Scan 10 different QR codes, measure average response time
- Test with poor network (3G simulation)
- Verify timeout handling

---

## 13. Success Criteria

### 13.1 POC Success Metrics

- [ ] Successfully scans and parses QR codes
- [ ] Returns risk score within 3 seconds
- [ ] Correctly identifies safe vs. suspicious URLs
- [ ] UI is intuitive and clear
- [ ] All API integrations functional

### 13.2 Future Success Metrics

- [ ] < 1% false negative rate (missing real threats)
- [ ] < 10% false positive rate (flagging safe content)
- [ ] 95% of scans complete in <2 seconds

---

## 14. Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| API latency | Medium | Medium | Parallel calls, timeouts, progressive display |
| API rate limits | Low | High | Caching, queueing, user rate limiting |
| False negatives | Medium | High | Multiple threat sources, conservative scoring |
| AI costs | Low | Medium | Use GPT-4o-mini, optimize prompts |
| Device permissions | Medium | Medium | Clear permission explanations, fallback to manual |

---

## 15. References

- [Expo Camera Documentation](https://docs.expo.dev/versions/latest/sdk/camera/)
- [Azure OpenAI Service](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [Google Safe Browsing API](https://developers.google.com/safe-browsing/v4)
- [URLhaus API](https://urlhaus-api.abuse.ch/)
- [QR Code Standard (ISO/IEC 18004)](https://www.iso.org/standard/62021.html)

---

**Document Owner**: OpenCode Agent  
**Last Updated**: May 2026  
**Next Review**: Post-POC Completion
