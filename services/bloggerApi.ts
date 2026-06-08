import { getGoogleApiKey } from '@/constants/security';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BLOGGER_API_KEY = getGoogleApiKey();
const BLOG_URL = 'https://www.phnupdates.com';
const BASE_URL = 'https://www.googleapis.com/blogger/v3';

let cachedBlogId: string | null = null;
const LABEL_CACHE_PREFIX = 'blogger_posts_by_labels_v1';
const LABEL_CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

interface LabelPostsCachePayload {
  cachedAt: number;
  posts: BlogPost[];
}

function buildLabelsCacheKey(labels: string[], perLabelMaxResults: number, totalMaxResults: number): string {
  const normalized = labels
    .map((label) => (label || '').trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('|');

  return `${LABEL_CACHE_PREFIX}:${normalized}:${perLabelMaxResults}:${totalMaxResults}`;
}

async function readLabelsCache(cacheKey: string): Promise<{ fresh: boolean; posts: BlogPost[] } | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (!raw) return null;

    const payload = JSON.parse(raw) as LabelPostsCachePayload;
    if (!payload || !Array.isArray(payload.posts)) return null;

    const age = Date.now() - (payload.cachedAt || 0);
    const fresh = age >= 0 && age <= LABEL_CACHE_MAX_AGE_MS;
    return { fresh, posts: payload.posts };
  } catch (error) {
    console.log('[BloggerAPI] Failed to read labels cache:', error);
    return null;
  }
}

async function writeLabelsCache(cacheKey: string, posts: BlogPost[]): Promise<void> {
  try {
    const payload: LabelPostsCachePayload = {
      cachedAt: Date.now(),
      posts,
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch (error) {
    console.log('[BloggerAPI] Failed to write labels cache:', error);
  }
}

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  published: string;
  updated: string;
  url: string;
  labels?: string[];
  author: {
    displayName: string;
    image?: { url: string };
  };
  images?: { url: string }[];
}

export interface BlogPostsResponse {
  items: BlogPost[];
  nextPageToken?: string;
}

export const NCD_TO_BLOG_TAG: Record<string, string> = {
  diabetes: 'diabetes_blog',
  hypertension: 'htn_blog',
  dyslipedemia: 'dyslipedemia_blog',
  heart_disease: 'HD_blog',
  liver_disease: 'liver_blog',
  kidney_disease: 'kidney_blog',
  stroke: 'stroke_blog',
  arthritis: 'arthritis_blog',
  dental_problems: 'dental_blog',
  depression: 'Mentalhealth_blog',
  anxiety: 'Mentalhealth_blog',
  obesity: 'obesity_blog',
  thyroid: 'thyroid_blog',
  other: 'other_blog',
};

const ALL_BLOG_TAGS = [
  'Healthy_blog',
  'htn_blog',
  'diabetes_blog',
  'dyslipedemia_blog',
  'HD_blog',
  'liver_blog',
  'kidney_blog',
  'stroke_blog',
  'arthritis_blog',
  'dental_blog',
  'Mentalhealth_blog',
  'obesity_blog',
  'thyroid_blog',
  'other_blog',
];

async function getBlogId(): Promise<string> {
  if (cachedBlogId) return cachedBlogId;
  try {
    const res = await fetch(
      `${BASE_URL}/blogs/byurl?url=${encodeURIComponent(BLOG_URL)}&key=${BLOGGER_API_KEY}`
    );
    if (!res.ok) {
      console.log('[BloggerAPI] Failed to get blog ID, status:', res.status);
      throw new Error('Failed to fetch blog ID');
    }
    const data = await res.json();
    cachedBlogId = data.id;
    console.log('[BloggerAPI] Blog ID:', cachedBlogId);
    return cachedBlogId!;
  } catch (error) {
    console.log('[BloggerAPI] Error getting blog ID:', error);
    throw error;
  }
}

export async function fetchPostsByLabel(
  label: string,
  maxResults: number = 10,
  pageToken?: string
): Promise<BlogPostsResponse> {
  try {
    const blogId = await getBlogId();
    let url = `${BASE_URL}/blogs/${blogId}/posts?labels=${encodeURIComponent(label)}&maxResults=${maxResults}&key=${BLOGGER_API_KEY}&fetchImages=true`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }
    console.log('[BloggerAPI] Fetching posts for label:', label);
    const res = await fetch(url);
    if (!res.ok) {
      console.log('[BloggerAPI] Failed to fetch posts, status:', res.status);
      throw new Error('Failed to fetch posts');
    }
    const data = await res.json();
    return {
      items: data.items || [],
      nextPageToken: data.nextPageToken,
    };
  } catch (error) {
    console.log('[BloggerAPI] Error fetching posts:', error);
    return { items: [] };
  }
}

export async function fetchPostsForConditions(
  ncds: string[],
  maxResults: number = 10
): Promise<BlogPost[]> {
  try {
    const priorityTags: string[] = [];
    const otherTags: string[] = [];

    for (const ncd of ncds) {
      const tag = NCD_TO_BLOG_TAG[ncd];
      if (tag && !priorityTags.includes(tag)) {
        priorityTags.push(tag);
      }
    }

    for (const tag of ALL_BLOG_TAGS) {
      if (!priorityTags.includes(tag)) {
        otherTags.push(tag);
      }
    }

    const allPosts: BlogPost[] = [];
    const seenIds = new Set<string>();

    for (const tag of priorityTags) {
      const result = await fetchPostsByLabel(tag, maxResults);
      for (const post of result.items) {
        if (!seenIds.has(post.id)) {
          seenIds.add(post.id);
          allPosts.push(post);
        }
      }
    }

    if (ncds.length === 0) {
      for (const tag of ALL_BLOG_TAGS) {
        const result = await fetchPostsByLabel(tag, 5);
        for (const post of result.items) {
          if (!seenIds.has(post.id)) {
            seenIds.add(post.id);
            allPosts.push(post);
          }
        }
      }
    } else {
      for (const tag of otherTags) {
        const result = await fetchPostsByLabel(tag, 3);
        for (const post of result.items) {
          if (!seenIds.has(post.id)) {
            seenIds.add(post.id);
            allPosts.push(post);
          }
        }
      }
    }

    allPosts.sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime());
    console.log('[BloggerAPI] Total unique posts fetched:', allPosts.length);
    return allPosts;
  } catch (error) {
    console.log('[BloggerAPI] Error fetching posts for conditions:', error);
    return [];
  }
}

export async function fetchPostsByLabels(
  labels: string[],
  perLabelMaxResults: number = 10,
  totalMaxResults: number = 50
): Promise<BlogPost[]> {
  try {
    const cleanLabels = Array.from(
      new Set(
        labels
          .map((label) => (label || '').trim())
          .filter(Boolean)
      )
    );

    if (cleanLabels.length === 0) {
      return [];
    }

    const cacheKey = buildLabelsCacheKey(cleanLabels, perLabelMaxResults, totalMaxResults);
    const cached = await readLabelsCache(cacheKey);
    if (cached?.fresh && cached.posts.length > 0) {
      return cached.posts;
    }

    const responses = await Promise.all(
      cleanLabels.map((label) => fetchPostsByLabel(label, perLabelMaxResults))
    );

    const dedupedPosts: BlogPost[] = [];
    const seen = new Set<string>();

    for (const response of responses) {
      for (const post of response.items) {
        if (!seen.has(post.id)) {
          seen.add(post.id);
          dedupedPosts.push(post);
        }
      }
    }

    dedupedPosts.sort(
      (a, b) => new Date(b.published).getTime() - new Date(a.published).getTime()
    );

    const finalPosts = dedupedPosts.slice(0, totalMaxResults);
    await writeLabelsCache(cacheKey, finalPosts);
    return finalPosts;
  } catch (error) {
    console.log('[BloggerAPI] Error fetching posts by labels:', error);

    const cleanLabels = Array.from(
      new Set(
        labels
          .map((label) => (label || '').trim())
          .filter(Boolean)
      )
    );
    const fallbackKey = buildLabelsCacheKey(cleanLabels, perLabelMaxResults, totalMaxResults);
    const fallbackCache = await readLabelsCache(fallbackKey);
    if (fallbackCache?.posts?.length) {
      return fallbackCache.posts;
    }

    return [];
  }
}

export function extractImageFromContent(content: string): string | null {
  const imgMatch = content.match(/<img[^>]+src="([^"]+)"/);
  return imgMatch ? imgMatch[1] : null;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getExcerpt(content: string, maxLength: number = 120): string {
  const text = stripHtml(content);
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}
