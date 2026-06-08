import { generateObject } from '@rork-ai/toolkit-sdk';
import { z } from 'zod';

const publicHealthNarrativeSchema = z.object({
  overview: z.string().describe('Short description of the public health day in plain language.'),
  significance: z.string().describe('Why this day matters in public health practice.'),
  actions: z.array(z.string()).describe('3 to 5 practical actions people or communities can take.'),
  keyFacts: z.array(z.string()).describe('2 to 4 brief factual points relevant to the day.'),
});

export interface PublicHealthDayInfo {
  currentYearTheme: string;
  currentYearThemeSource: string;
  currentYearThemeSourceOrg: string;
  overview: string;
  significance: string;
  actions: string[];
  keyFacts: string[];
}

interface OfficialThemeSource {
  match: RegExp;
  org: string;
  urls: string[];
}

interface ThemeLookupResult {
  theme: string;
  sourceUrl: string;
  sourceOrg: string;
}

const OFFICIAL_THEME_FALLBACK = 'Official current-year theme not announced.';

const OFFICIAL_THEME_SOURCES: OfficialThemeSource[] = [
  {
    match: /world health day/i,
    org: 'WHO',
    urls: ['https://www.who.int/campaigns/world-health-day'],
  },
  {
    match: /world no tobacco day/i,
    org: 'WHO',
    urls: ['https://www.who.int/campaigns/world-no-tobacco-day'],
  },
  {
    match: /world tuberculosis day|world tb day/i,
    org: 'WHO',
    urls: ['https://www.who.int/campaigns/world-tb-day'],
  },
  {
    match: /world malaria day/i,
    org: 'WHO',
    urls: ['https://www.who.int/campaigns/world-malaria-day'],
  },
  {
    match: /world blood donor day/i,
    org: 'WHO',
    urls: ['https://www.who.int/campaigns/world-blood-donor-day'],
  },
  {
    match: /world hepatitis day/i,
    org: 'WHO',
    urls: ['https://www.who.int/campaigns/world-hepatitis-day'],
  },
  {
    match: /world patient safety day/i,
    org: 'WHO',
    urls: ['https://www.who.int/campaigns/world-patient-safety-day'],
  },
  {
    match: /world diabetes day/i,
    org: 'WHO',
    urls: ['https://www.who.int/campaigns/world-diabetes-day'],
  },
  {
    match: /world aids day/i,
    org: 'UNAIDS',
    urls: ['https://www.unaids.org/en/events/world-aids-day'],
  },
  {
    match: /world heart day/i,
    org: 'World Heart Federation',
    urls: ['https://world-heart-federation.org/world-heart-day/'],
  },
  {
    match: /world rabies day/i,
    org: 'World Rabies Day',
    urls: ['https://www.worldrabiesday.org/'],
  },
  {
    match: /world environment day/i,
    org: 'UNEP',
    urls: ['https://www.worldenvironmentday.global/'],
  },
  {
    match: /world water day/i,
    org: 'UN-Water',
    urls: ['https://www.worldwaterday.org/'],
  },
  {
    match: /world food day/i,
    org: 'FAO',
    urls: ['https://www.fao.org/world-food-day/en'],
  },
  {
    match: /international day of yoga/i,
    org: 'United Nations',
    urls: ['https://www.un.org/en/observances/yoga-day'],
  },
  {
    match: /world immunization week/i,
    org: 'WHO',
    urls: ['https://www.who.int/campaigns/world-immunization-week'],
  },
];

function cleanHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractThemeFromText(text: string, year: number): string | null {
  const patterns = [
    new RegExp(`${year}\\s*(?:theme|slogan)\\s*[:\\-]\\s*["“]?([^"”]{8,180})["”]?`, 'i'),
    new RegExp(`(?:theme|slogan)\\s*(?:for\\s*${year})?\\s*[:\\-]\\s*["“]?([^"”]{8,180})["”]?`, 'i'),
    new RegExp(`(?:${year}).{0,80}(?:theme|slogan).{0,15}(?:is|:).{0,3}["“]?([^"”]{8,180})["”]?`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const candidate = match?.[1]?.trim();
    if (!candidate) continue;

    const sanitized = candidate
      .replace(/\s+/g, ' ')
      .replace(/[\r\n]+/g, ' ')
      .replace(/^[\s:;\-]+|[\s:;\-]+$/g, '');

    if (sanitized.length < 8 || sanitized.length > 160) continue;
    if (/official current-year theme not announced/i.test(sanitized)) continue;
    if (/not\s+announced|to\s+be\s+announced|tba|coming\s+soon/i.test(sanitized)) continue;
    return sanitized;
  }

  return null;
}

async function fetchWithTimeout(url: string, timeoutMs = 9000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getOfficialThemeFromWebsite(dayTitle: string, year: number): Promise<ThemeLookupResult> {
  const source = OFFICIAL_THEME_SOURCES.find((item) => item.match.test(dayTitle));
  if (!source) {
    return {
      theme: OFFICIAL_THEME_FALLBACK,
      sourceUrl: 'Not available',
      sourceOrg: 'Not available',
    };
  }

  for (const url of source.urls) {
    try {
      const response = await fetchWithTimeout(url);
      if (!response.ok) continue;
      const html = await response.text();
      const text = cleanHtmlToText(html);
      const theme = extractThemeFromText(text, year);

      if (theme) {
        return {
          theme,
          sourceUrl: url,
          sourceOrg: source.org,
        };
      }
    } catch {
      // Keep trying other official URLs for the same day.
    }
  }

  return {
    theme: OFFICIAL_THEME_FALLBACK,
    sourceUrl: 'Not available',
    sourceOrg: 'Not available',
  };
}

export async function getPublicHealthDayInfo(dayTitle: string): Promise<PublicHealthDayInfo> {
  const currentYear = new Date().getFullYear();
  const officialTheme = await getOfficialThemeFromWebsite(dayTitle, currentYear);

  const narrative = await generateObject({
    messages: [
      {
        role: 'user',
        content: `You are a public health educator. Provide concise and accurate educational information for this event: "${dayTitle}".

Rules:
- Keep language simple for general users.
- Do not invent specific statistics if uncertain.
- Focus on practical and evidence-aligned public health guidance.
- Keep each bullet short and actionable.
- Do not include theme names in overview/significance/actions/keyFacts unless well-known and already official.
- Keep facts practical, brief, and readable.`,
      },
    ],
    schema: publicHealthNarrativeSchema,
  });

  return {
    currentYearTheme: officialTheme.theme,
    currentYearThemeSource: officialTheme.sourceUrl,
    currentYearThemeSourceOrg: officialTheme.sourceOrg,
    ...narrative,
  };
}
