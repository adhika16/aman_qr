import { URLhausResult } from '../types';

const URLHAUS_ENDPOINT = 'https://urlhaus-api.abuse.ch/v1/url/';

export async function checkURLhaus(url: string): Promise<URLhausResult> {
  try {
    const response = await fetch(URLHAUS_ENDPOINT, {
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

    // URLhaus returns query_status: "ok" if URL is found in database
    if (data.query_status === 'ok' && data.url_status) {
      return {
        isThreat: true,
        threatType: data.threat || 'Malware',
        confidence: 0.98,
        details: `Malware URL detected: ${data.threat || 'Malware'}`,
      };
    }

    // query_status: "no_results" means URL is not in database
    return {
      isThreat: false,
      confidence: 0.85,
      details: 'URL not found in URLhaus malware database',
    };
  } catch (error) {
    console.error('URLhaus check failed:', error);
    return {
      isThreat: false,
      confidence: 0,
      details: 'Check failed - unable to query URLhaus database',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
