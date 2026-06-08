import * as Crypto from 'expo-crypto';

const API_KEYS = {
  GOOGLE_API: atob('QUl6YVN5RFY4T2QzeVItNU1MNVprWUkwWG9YOHo4YzI5ZndSMmxr'),
};

export function getGoogleApiKey(): string {
  return API_KEYS.GOOGLE_API;
}

export async function hashPin(pin: string): Promise<string> {
  try {
    const salt = 'healthme_pin_salt_v1';
    const salted = salt + pin + salt;
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      salted
    );
    return hash;
  } catch {
    console.log('[Security] Crypto hash failed, using fallback');
    return fallbackHash(pin);
  }
}

export function legacyHashPin(pin: string): string {
  return fallbackHash(pin);
}

function fallbackHash(pin: string): string {
  const salt = 'healthme_pin_salt_v1';
  const str = salt + pin + salt;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const hash2 = hash.toString(16);
  let extended = '';
  for (let i = 0; i < 4; i++) {
    let h = 0;
    const part = salt + pin + i.toString();
    for (let j = 0; j < part.length; j++) {
      h = ((h << 5) - h) + part.charCodeAt(j);
      h = h & h;
    }
    extended += Math.abs(h).toString(16);
  }
  return hash2 + extended;
}

export const BRUTE_FORCE_CONFIG = {
  MAX_ATTEMPTS: 5,
  LOCKOUT_DURATION_MS: 30 * 1000,
  EXTENDED_LOCKOUT_MS: 5 * 60 * 1000,
  EXTENDED_LOCKOUT_THRESHOLD: 10,
} as const;

export function sanitizeForLog(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return data;
  if (typeof data !== 'object') return data;

  const sensitiveKeys = ['pinCode', 'pin', 'password', 'secret', 'token', 'apiKey', 'key'];
  const result: Record<string, any> = {};

  for (const key of Object.keys(data)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = data[key];
    }
  }
  return result;
}

export function validateImportData(data: any, expectedType: string): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid data format' };
  }

  if (Array.isArray(data)) {
    if (data.length > 50000) {
      return { valid: false, error: 'Data exceeds maximum allowed entries (50,000)' };
    }
  }

  const jsonStr = JSON.stringify(data);
  if (jsonStr.length > 50 * 1024 * 1024) {
    return { valid: false, error: 'Data exceeds maximum allowed size (50MB)' };
  }

  const dangerousPatterns = [
    /<script[\s>]/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:text\/html/i,
  ];

  const checkString = (str: string): boolean => {
    return dangerousPatterns.some(pattern => pattern.test(str));
  };

  const checkValue = (val: any): boolean => {
    if (typeof val === 'string') return checkString(val);
    if (Array.isArray(val)) return val.some(checkValue);
    if (val && typeof val === 'object') return Object.values(val).some(checkValue);
    return false;
  };

  if (checkValue(data)) {
    return { valid: false, error: 'Data contains potentially unsafe content' };
  }

  return { valid: true };
}

export function sanitizeString(input: string): string {
  return input
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}
