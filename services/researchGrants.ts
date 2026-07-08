import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const RESEARCH_GRANTS_CACHE_KEY = 'research_grants_cache_v1';
const STORAGE_RESEARCH_GRANTS_GAS_URL_KEY = 'research_grants_gas_url_v1';

// `type` is free text from the sheet's "Type of research opportunities" column
// (e.g. "Research Grant", "PhD Scholarship", "Fellowship", "Research
// Internship", "Workshop"). New categories are just new sheet rows -- the
// portal screen builds its filter chips from whatever distinct values are
// present in the data, no code change needed. Most fields below are only
// relevant to some types (e.g. maxGrantAmount for grants, monthlyStipend for
// scholarships/fellowships) and are simply left blank in the sheet for rows
// where they don't apply.
export interface ResearchOpportunity {
  id: string;
  timestamp: string;
  type: string;
  title: string;
  organization: string;
  website: string;
  mode: string;
  researchArea: string;
  shortDescription: string;
  highlights: string;
  eligibleApplicants: string;
  eligibleCountries: string;
  requiredQualifications: string;
  preferredQualifications: string;
  requiredSkills: string;
  applicationOpensDate: string;
  applicationDeadline: string;
  duration: string;
  isFunded: string;
  fundingDetails: string;
  benefits: string;
  applicationMethod: string;
  applicationLink: string;
  requiredDocuments: string;
  contactEmail: string;
  additionalInstructions: string;
  maxGrantAmount: string;
  fundingAgency: string;
  scholarshipFor: string;
  universityName: string;
  tuitionCovered: string;
  monthlyStipend: string;
  ieltsToeflRequired: string;
  greRequired: string;
  fellowshipDuration: string;
  hostDepartment: string;
  registrationFee: string;
  certificateProvided: string;
  skillLevel: string;
  maxParticipants: string;
}

export interface ResearchGrantsLoadResult {
  opportunities: ResearchOpportunity[];
  error: string | null;
}

interface ResearchGrantsConfig {
  researchGrantsGasUrl?: string;
}

function readResearchGrantsConfig(): ResearchGrantsConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as { researchGrants?: ResearchGrantsConfig };
  return extra.researchGrants ?? {};
}

export async function getStoredResearchGrantsGasUrl(): Promise<string> {
  return (await AsyncStorage.getItem(STORAGE_RESEARCH_GRANTS_GAS_URL_KEY)) ?? '';
}

export async function saveResearchGrantsGasUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  if (trimmed) {
    await AsyncStorage.setItem(STORAGE_RESEARCH_GRANTS_GAS_URL_KEY, trimmed);
  } else {
    await AsyncStorage.removeItem(STORAGE_RESEARCH_GRANTS_GAS_URL_KEY);
  }
}

async function fetchResearchGrantsFromGas(gasUrl: string): Promise<ResearchOpportunity[]> {
  const response = await fetch(gasUrl, { method: 'GET', redirect: 'follow' });
  const text = await response.text();

  if (!response.ok) throw new Error(`Research Grants GAS HTTP ${response.status}: ${text.substring(0, 200)}`);
  if (text.trimStart().startsWith('<')) throw new Error('Research Grants GAS returned HTML. Set deployment access to "Anyone".');

  let data: { opportunities?: ResearchOpportunity[]; error?: string };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Research Grants GAS response is not valid JSON: ${text.substring(0, 80)}`);
  }

  if (data.error) throw new Error(`Research Grants GAS error: ${data.error}`);
  if (!Array.isArray(data.opportunities)) throw new Error('Research Grants GAS response missing "opportunities" array.');

  return data.opportunities.filter((o) => o.title?.trim() || o.organization?.trim());
}

export async function loadResearchGrants(): Promise<ResearchGrantsLoadResult> {
  const config = readResearchGrantsConfig();
  const storedUrl = await getStoredResearchGrantsGasUrl();
  const gasUrl = storedUrl || config.researchGrantsGasUrl?.trim() || null;

  if (gasUrl) {
    try {
      const opportunities = await fetchResearchGrantsFromGas(gasUrl);
      if (opportunities.length > 0) {
        await AsyncStorage.setItem(RESEARCH_GRANTS_CACHE_KEY, JSON.stringify(opportunities)).catch(() => {});
        return { opportunities, error: null };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        const raw = await AsyncStorage.getItem(RESEARCH_GRANTS_CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw) as ResearchOpportunity[];
          if (cached.length > 0) {
            return { opportunities: cached, error: `Could not refresh: ${message}. Showing cached opportunities.` };
          }
        }
      } catch { /* ignore */ }
      return { opportunities: [], error: message };
    }
  }

  try {
    const raw = await AsyncStorage.getItem(RESEARCH_GRANTS_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as ResearchOpportunity[];
      if (cached.length > 0) return { opportunities: cached, error: null };
    }
  } catch { /* ignore */ }

  return {
    opportunities: [],
    error: gasUrl ? 'No opportunities returned from the GAS URL.' : 'No Research Grants GAS URL configured.',
  };
}

export function isResearchDeadlinePassed(deadline: string): boolean {
  if (!deadline) return false;
  const parsed = new Date(deadline);
  if (isNaN(parsed.getTime())) return false;
  return parsed < new Date();
}

export function formatResearchDate(date: string): string {
  if (!date) return '';
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function isYes(value: string): boolean {
  return /^(y|yes|true)$/i.test(value.trim());
}
