import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const JOB_PORTAL_CACHE_KEY = 'job_portal_cache_v1';
const STORAGE_JOB_GAS_URL_KEY = 'job_portal_gas_url_v1';

export interface JobPosting {
  id: string;
  timestamp: string;
  organization: string;
  website: string;
  companyType: string;
  orgLocation: string;
  contactEmail: string;
  jobTitle: string;
  jobType: string;
  workArrangement: string;
  jobLocation: string;
  summary: string;
  responsibilities: string;
  requiredQualifications: string;
  preferredQualifications: string;
  salaryRange: string;
  benefits: string;
  applicationDeadline: string;
  howToApply: string;
  applicationLink: string;
  additionalNotes: string;
}

export interface JobPortalLoadResult {
  jobs: JobPosting[];
  error: string | null;
}

interface JobPortalConfig {
  jobPortalGasUrl?: string;
}

function readJobPortalConfig(): JobPortalConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as { jobPortal?: JobPortalConfig };
  return extra.jobPortal ?? {};
}

export async function getStoredJobPortalGasUrl(): Promise<string> {
  return (await AsyncStorage.getItem(STORAGE_JOB_GAS_URL_KEY)) ?? '';
}

export async function saveJobPortalGasUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  if (trimmed) {
    await AsyncStorage.setItem(STORAGE_JOB_GAS_URL_KEY, trimmed);
  } else {
    await AsyncStorage.removeItem(STORAGE_JOB_GAS_URL_KEY);
  }
}

async function fetchJobsFromGas(gasUrl: string): Promise<JobPosting[]> {
  const response = await fetch(gasUrl, { method: 'GET', redirect: 'follow' });
  const text = await response.text();

  if (!response.ok) throw new Error(`Job portal GAS HTTP ${response.status}: ${text.substring(0, 200)}`);
  if (text.trimStart().startsWith('<')) throw new Error('Job portal GAS returned HTML. Set deployment access to "Anyone".');

  let data: { jobs?: JobPosting[]; error?: string };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Job portal GAS response is not valid JSON: ${text.substring(0, 80)}`);
  }

  if (data.error) throw new Error(`Job portal GAS error: ${data.error}`);
  if (!Array.isArray(data.jobs)) throw new Error('Job portal GAS response missing "jobs" array.');

  return data.jobs.filter((j) => j.jobTitle?.trim() || j.organization?.trim());
}

export async function loadJobPostings(): Promise<JobPortalLoadResult> {
  const config = readJobPortalConfig();
  const storedUrl = await getStoredJobPortalGasUrl();
  const gasUrl = storedUrl || config.jobPortalGasUrl?.trim() || null;

  if (gasUrl) {
    try {
      const jobs = await fetchJobsFromGas(gasUrl);
      if (jobs.length > 0) {
        await AsyncStorage.setItem(JOB_PORTAL_CACHE_KEY, JSON.stringify(jobs)).catch(() => {});
        return { jobs, error: null };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {
        const raw = await AsyncStorage.getItem(JOB_PORTAL_CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw) as JobPosting[];
          if (cached.length > 0) {
            return { jobs: cached, error: `Could not refresh: ${message}. Showing cached jobs.` };
          }
        }
      } catch { /* ignore */ }
      return { jobs: [], error: message };
    }
  }

  try {
    const raw = await AsyncStorage.getItem(JOB_PORTAL_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as JobPosting[];
      if (cached.length > 0) return { jobs: cached, error: null };
    }
  } catch { /* ignore */ }

  return {
    jobs: [],
    error: gasUrl ? 'No jobs returned from the GAS URL.' : 'No Job Portal GAS URL configured.',
  };
}

export function isDeadlinePassed(deadline: string): boolean {
  if (!deadline) return false;
  const parsed = new Date(deadline);
  if (isNaN(parsed.getTime())) return false;
  return parsed < new Date();
}

export function formatDeadline(deadline: string): string {
  if (!deadline) return '';
  const parsed = new Date(deadline);
  if (isNaN(parsed.getTime())) return deadline;
  return parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}
