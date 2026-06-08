import { getGoogleApiKey } from '@/constants/security';

const YOUTUBE_API_KEY = getGoogleApiKey();
const CHANNEL_HANDLE = '@HealthyMe4u';
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

let cachedChannelId: string | null = null;

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  channelTitle: string;
  url: string;
}

const CONDITION_KEYWORDS: Record<string, string[]> = {
  diabetes: ['diabetes', 'diabetic', 'blood sugar', 'insulin', 'glucose', 'a1c', 'hba1c'],
  hypertension: ['hypertension', 'high blood pressure', 'blood pressure', 'bp'],
  heart_disease: ['heart disease', 'heart attack', 'cardiac', 'cardiovascular', 'cholesterol', 'heart health', 'heart failure'],
  liver_disease: ['liver', 'hepatitis', 'fatty liver', 'cirrhosis', 'liver disease'],
  kidney_disease: ['kidney', 'renal', 'kidney disease', 'dialysis', 'kidney failure'],
  stroke: ['stroke', 'brain attack', 'cerebrovascular'],
  arthritis: ['arthritis', 'joint pain', 'rheumatoid', 'osteoarthritis', 'joint'],
  dental_problems: ['dental', 'teeth', 'tooth', 'toothache', 'gum disease', 'gingivitis', 'oral health', 'cavity'],
  depression: ['depression', 'depressed', 'mental health', 'mood disorder'],
  anxiety: ['anxiety', 'anxious', 'panic', 'stress', 'mental health'],
  obesity: ['obesity', 'overweight', 'weight loss', 'weight management', 'bmi', 'fat loss'],
};

async function getChannelId(): Promise<string> {
  if (cachedChannelId) return cachedChannelId;
  try {
    const res = await fetch(
      `${BASE_URL}/channels?forHandle=${encodeURIComponent(CHANNEL_HANDLE)}&part=id&key=${YOUTUBE_API_KEY}`
    );
    if (!res.ok) {
      console.log('[YouTubeAPI] Failed to get channel ID by handle, status:', res.status);
      const searchRes = await fetch(
        `${BASE_URL}/search?q=${encodeURIComponent(CHANNEL_HANDLE)}&type=channel&part=snippet&maxResults=1&key=${YOUTUBE_API_KEY}`
      );
      if (!searchRes.ok) throw new Error('Failed to find channel');
      const searchData = await searchRes.json();
      if (searchData.items?.length > 0) {
        cachedChannelId = searchData.items[0].id.channelId || searchData.items[0].snippet?.channelId;
        console.log('[YouTubeAPI] Channel ID from search:', cachedChannelId);
        return cachedChannelId!;
      }
      throw new Error('Channel not found');
    }
    const data = await res.json();
    if (data.items?.length > 0) {
      cachedChannelId = data.items[0].id;
      console.log('[YouTubeAPI] Channel ID:', cachedChannelId);
      return cachedChannelId!;
    }
    throw new Error('Channel not found');
  } catch (error) {
    console.log('[YouTubeAPI] Error getting channel ID:', error);
    throw error;
  }
}

export async function fetchChannelVideos(maxResults: number = 50): Promise<YouTubeVideo[]> {
  try {
    const channelId = await getChannelId();

    const searchRes = await fetch(
      `${BASE_URL}/search?channelId=${channelId}&part=snippet&order=date&type=video&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
    );
    if (!searchRes.ok) {
      console.log('[YouTubeAPI] Failed to fetch videos, status:', searchRes.status);
      throw new Error('Failed to fetch videos');
    }
    const searchData = await searchRes.json();

    const videos: YouTubeVideo[] = (searchData.items || []).map((item: any) => ({
      id: item.id?.videoId || item.id,
      title: item.snippet?.title || '',
      description: item.snippet?.description || '',
      thumbnail:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        '',
      publishedAt: item.snippet?.publishedAt || '',
      channelTitle: item.snippet?.channelTitle || 'HealthyMe4u',
      url: `https://www.youtube.com/watch?v=${item.id?.videoId || item.id}`,
    }));

    console.log('[YouTubeAPI] Fetched', videos.length, 'videos');
    return videos;
  } catch (error) {
    console.log('[YouTubeAPI] Error fetching channel videos:', error);
    return [];
  }
}

export function sortVideosByConditions(
  videos: YouTubeVideo[],
  userNcds: string[]
): YouTubeVideo[] {
  const sortByDate = (a: YouTubeVideo, b: YouTubeVideo) =>
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();

  if (userNcds.length === 0) return [...videos].sort(sortByDate);

  const matchingVideos: YouTubeVideo[] = [];
  const otherVideos: YouTubeVideo[] = [];

  for (const video of videos) {
    const titleLower = video.title.toLowerCase();
    const descLower = video.description.toLowerCase();
    let isMatch = false;

    for (const ncd of userNcds) {
      const keywords = CONDITION_KEYWORDS[ncd] || [ncd.replace(/_/g, ' ')];
      for (const keyword of keywords) {
        if (titleLower.includes(keyword.toLowerCase()) || descLower.includes(keyword.toLowerCase())) {
          isMatch = true;
          break;
        }
      }
      if (isMatch) break;
    }

    if (isMatch) {
      matchingVideos.push(video);
    } else {
      otherVideos.push(video);
    }
  }

  matchingVideos.sort(sortByDate);
  otherVideos.sort(sortByDate);
  console.log('[YouTubeAPI] Matching videos:', matchingVideos.length, 'Other:', otherVideos.length);
  return [...matchingVideos, ...otherVideos];
}
