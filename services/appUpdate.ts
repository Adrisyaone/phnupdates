import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { APP_UPDATE_CONFIG } from '@/constants/config';

export interface AppUpdatePayload {
  latestVersion: string;
  minSupportedVersion?: string;
  forceUpdate?: boolean;
  storeUrl?: string;
}

export interface AppUpdateResult {
  updateAvailable: boolean;
  shouldForceUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  storeUrl: string;
}

const DEFAULT_VERSION = '0.0.0';

function normalizeVersionPart(part: string): number {
  const parsed = Number(part);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(normalizeVersionPart);
  const bParts = b.split('.').map(normalizeVersionPart);
  const maxLength = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLength; i++) {
    const left = aParts[i] ?? 0;
    const right = bParts[i] ?? 0;
    if (left > right) return 1;
    if (left < right) return -1;
  }

  return 0;
}

export function getCurrentAppVersion(): string {
  const version = Constants.expoConfig?.version;
  return version && version.trim().length > 0 ? version : DEFAULT_VERSION;
}

function resolvePlayStoreUrl(storeUrl?: string): string {
  if (storeUrl && storeUrl.trim().length > 0) return storeUrl;
  const packageName = APP_UPDATE_CONFIG.androidPackage;
  return `https://play.google.com/store/apps/details?id=${packageName}`;
}

export function getPlayStoreUrl(): string {
  return resolvePlayStoreUrl();
}

export function isRemoteUpdateCheckConfigured(): boolean {
  return APP_UPDATE_CONFIG.enabled && APP_UPDATE_CONFIG.checkUrl.trim().length > 0;
}

async function fetchUpdatePayload(): Promise<AppUpdatePayload | null> {
  if (!APP_UPDATE_CONFIG.enabled || !APP_UPDATE_CONFIG.checkUrl) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(APP_UPDATE_CONFIG.checkUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log('[AppUpdate] Update check failed. HTTP status:', response.status);
      return null;
    }

    const data = await response.json();
    const latestVersion = String(data?.latestVersion ?? '').trim();
    if (!latestVersion) return null;

    return {
      latestVersion,
      minSupportedVersion: data?.minSupportedVersion ? String(data.minSupportedVersion) : undefined,
      forceUpdate: Boolean(data?.forceUpdate),
      storeUrl: data?.storeUrl ? String(data.storeUrl) : undefined,
    };
  } catch (error) {
    console.log('[AppUpdate] Error checking app update:', error);
    return null;
  }
}

export async function checkForAppUpdate(): Promise<AppUpdateResult | null> {
  if (Platform.OS !== 'android') return null;

  const payload = await fetchUpdatePayload();
  if (!payload) return null;

  const currentVersion = getCurrentAppVersion();
  const updateAvailable = compareVersions(payload.latestVersion, currentVersion) > 0;
  if (!updateAvailable) return null;

  const minSupportedVersion = payload.minSupportedVersion;
  const belowMinimumSupported =
    typeof minSupportedVersion === 'string' && compareVersions(currentVersion, minSupportedVersion) < 0;

  return {
    updateAvailable: true,
    shouldForceUpdate: payload.forceUpdate === true || belowMinimumSupported,
    latestVersion: payload.latestVersion,
    currentVersion,
    storeUrl: resolvePlayStoreUrl(payload.storeUrl),
  };
}
