import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const NGOS_CACHE_KEY = 'ngos_cache_v1';
const STORAGE_NGOS_GAS_URL_KEY = 'ngos_gas_url_v1';

export interface Ngo {
  id: string;
  timestamp: string;
  name: string;
  logo: string;
  ngoType: string;
  sector: string;
  website: string;
  headquarters: string;
  officeLocation: string;
  establishedYear: string;
  description: string;
  keyPrograms: string;
  contactEmail: string;
  contactPhone: string;
  facebook: string;
  linkedin: string;
  locationGps: string;
}

export interface NgosLoadResult {
  ngos: Ngo[];
  error: string | null;
}

interface NgosConfig {
  ngosGasUrl?: string;
}

function readNgosConfig(): NgosConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as { ngos?: NgosConfig };
  return extra.ngos ?? {};
}

export async function getStoredNgosGasUrl(): Promise<string> {
  return (await AsyncStorage.getItem(STORAGE_NGOS_GAS_URL_KEY)) ?? '';
}

export async function saveNgosGasUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  if (trimmed) {
    await AsyncStorage.setItem(STORAGE_NGOS_GAS_URL_KEY, trimmed);
  } else {
    await AsyncStorage.removeItem(STORAGE_NGOS_GAS_URL_KEY);
  }
}

async function fetchNgosFromGas(gasUrl: string): Promise<Ngo[]> {
  const response = await fetch(gasUrl, { method: 'GET', redirect: 'follow' });
  const text = await response.text();

  if (!response.ok) throw new Error(`NGOs GAS HTTP ${response.status}: ${text.substring(0, 200)}`);
  if (text.trimStart().startsWith('<')) throw new Error('NGOs GAS returned HTML. Set deployment access to "Anyone".');

  let data: { ngos?: Ngo[]; error?: string };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`NGOs GAS response is not valid JSON: ${text.substring(0, 80)}`);
  }

  if (data.error) throw new Error(`NGOs GAS error: ${data.error}`);
  if (!Array.isArray(data.ngos)) throw new Error('NGOs GAS response missing "ngos" array.');

  return data.ngos.filter((n) => n.name?.trim());
}

export async function loadNgos(): Promise<NgosLoadResult> {
  const config = readNgosConfig();
  const storedUrl = await getStoredNgosGasUrl();
  const gasUrl = storedUrl || config.ngosGasUrl?.trim() || null;

  if (gasUrl) {
    try {
      const ngos = await fetchNgosFromGas(gasUrl);
      if (ngos.length > 0) {
        await AsyncStorage.setItem(NGOS_CACHE_KEY, JSON.stringify(ngos)).catch(() => {});
        return { ngos, error: null };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        const raw = await AsyncStorage.getItem(NGOS_CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw) as Ngo[];
          if (cached.length > 0) {
            return { ngos: cached, error: `Could not refresh: ${message}. Showing cached NGOs.` };
          }
        }
      } catch { /* ignore */ }
      return { ngos: [], error: message };
    }
  }

  try {
    const raw = await AsyncStorage.getItem(NGOS_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as Ngo[];
      if (cached.length > 0) return { ngos: cached, error: null };
    }
  } catch { /* ignore */ }

  return {
    ngos: [],
    error: gasUrl ? 'No NGOs returned from the GAS URL.' : 'No NGOs GAS URL configured.',
  };
}

export function normalizeOrgName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
}

/** Parses a "lat,lng" (or "lat, lng") sheet value into coordinates. */
export function parseLocationGps(value: string): GpsCoordinates | null {
  if (!value?.trim()) return null;
  const parts = value.split(',').map((part) => part.trim());
  if (parts.length !== 2) return null;
  const latitude = Number(parts[0]);
  const longitude = Number(parts[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}
