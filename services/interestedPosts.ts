import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlogPost, extractImageFromContent, getExcerpt } from '@/services/bloggerApi';

const INTERESTED_POSTS_KEY = 'interested_posts_v1';

export interface InterestedPost {
  id: string;
  title: string;
  url: string;
  published: string;
  labels?: string[];
  imageUrl?: string;
  excerpt: string;
  savedAt: number;
}

export function toInterestedPost(post: BlogPost): InterestedPost {
  return {
    id: post.id,
    title: post.title,
    url: post.url,
    published: post.published,
    labels: post.labels,
    imageUrl: post.images?.[0]?.url || extractImageFromContent(post.content) || undefined,
    excerpt: getExcerpt(post.content, 180),
    savedAt: Date.now(),
  };
}

export async function getInterestedPosts(): Promise<InterestedPost[]> {
  try {
    const raw = await AsyncStorage.getItem(INTERESTED_POSTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InterestedPost[];
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a, b) => b.savedAt - a.savedAt);
  } catch (error) {
    console.log('[Interested] Failed to read interested posts:', error);
    return [];
  }
}

async function saveInterestedPosts(posts: InterestedPost[]): Promise<void> {
  try {
    await AsyncStorage.setItem(INTERESTED_POSTS_KEY, JSON.stringify(posts));
  } catch (error) {
    console.log('[Interested] Failed to save interested posts:', error);
  }
}

export async function getInterestedPostIds(): Promise<Set<string>> {
  const posts = await getInterestedPosts();
  return new Set(posts.map((post) => post.id));
}

export async function addInterestedPost(post: BlogPost): Promise<void> {
  const interestedPost = toInterestedPost(post);
  const current = await getInterestedPosts();
  const withoutDuplicate = current.filter((item) => item.id !== interestedPost.id);
  await saveInterestedPosts([interestedPost, ...withoutDuplicate]);
}

export async function removeInterestedPost(postId: string): Promise<void> {
  const current = await getInterestedPosts();
  await saveInterestedPosts(current.filter((item) => item.id !== postId));
}

export async function toggleInterestedPost(post: BlogPost): Promise<boolean> {
  const current = await getInterestedPosts();
  const exists = current.some((item) => item.id === post.id);
  if (exists) {
    await saveInterestedPosts(current.filter((item) => item.id !== post.id));
    return false;
  }

  const interestedPost = toInterestedPost(post);
  await saveInterestedPosts([interestedPost, ...current]);
  return true;
}
