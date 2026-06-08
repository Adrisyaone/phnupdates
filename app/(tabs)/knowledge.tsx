import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ExternalLink,
  Youtube,
  Globe,
  ChevronRight,
  RefreshCw,
  Clock,
  Tag,
  ChevronDown,
  List,
} from 'lucide-react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { colors, createThemedStyles } from '@/constants/colors';
import { useFood } from '@/contexts/FoodContext';
import * as Haptics from 'expo-haptics';
import {
  BlogPost,
  fetchPostsForConditions,
  extractImageFromContent,
  getExcerpt,
} from '@/services/bloggerApi';
import {
  YouTubeVideo,
  fetchChannelVideos,
} from '@/services/youtubeApi';

type TabKey = 'blog' | 'videos' | 'tips';

type BlogSectionKey =
  | 'diabetes'
  | 'hypertension'
  | 'dyslipedemia'
  | 'heart_disease'
  | 'liver_disease'
  | 'kidney_disease'
  | 'thyroid'
  | 'stroke'
  | 'arthritis'
  | 'dental_problems'
  | 'mental_health'
  | 'obesity'
  | 'other_conditions'
  | 'general';

type BlogListItem =
  | { type: 'section'; key: string; sectionKey: BlogSectionKey; title: string; count: number }
  | { type: 'post'; key: string; post: BlogPost }
  | { type: 'action'; key: string; sectionKey: BlogSectionKey; expanded: boolean; hiddenCount: number }
  | { type: 'empty'; key: string; sectionKey: BlogSectionKey; message: string };

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];
const INITIAL_POSTS_PER_SECTION = 3;
const BLOG_CACHE_KEY = 'healthme_knowledge_blog_cache_v1';
const VIDEO_CACHE_KEY = 'healthme_knowledge_video_cache_v1';
const CACHE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const BP_STORAGE_KEY = 'blood_pressure_entries';
const BG_STORAGE_KEY = 'blood_glucose_entries';
const LIPID_STORAGE_KEY = 'lipid_profile_entries';
const YOUTUBE_RED = '#DC2626';
const TRACKER_PRIORITY_ORDER: BlogSectionKey[] = ['hypertension', 'diabetes', 'dyslipedemia', 'obesity'];

interface BlogCachePayload {
  ncdKey: string;
  updatedAt: number;
  posts: BlogPost[];
}

interface VideoCachePayload {
  updatedAt: number;
  videos: YouTubeVideo[];
}

interface BPEntry {
  systolic: number;
  diastolic: number;
  timestamp: number;
}

interface BGEntry {
  value: number;
  unit: 'mg/dL' | 'mmol/L';
  type: 'fasting' | 'random' | 'pp';
  timestamp: number;
}

interface LipidEntry {
  tg: number;
  hdl: number;
  ldl: number;
  vldl?: number;
  totalCholesterol?: number;
  timestamp: number;
}

const isHighBloodPressure = (entry?: BPEntry | null) => {
  if (!entry) return false;
  return entry.systolic >= 130 || entry.diastolic >= 80;
};

const isHighBloodSugar = (entry?: BGEntry | null) => {
  if (!entry) return false;
  const mgdl = entry.unit === 'mmol/L' ? entry.value * 18 : entry.value;

  if (entry.type === 'fasting') {
    return mgdl > 125;
  }

  if (entry.type === 'pp') {
    return mgdl > 199;
  }

  return mgdl > 199;
};

const isAbnormalLipidProfile = (entry?: LipidEntry | null) => {
  if (!entry) return false;
  const estimatedVldl = typeof entry.vldl === 'number' && entry.vldl > 0 ? entry.vldl : (entry.tg > 0 ? entry.tg / 5 : undefined);
  return entry.tg >= 150
    || entry.hdl < 40
    || entry.ldl >= 130
    || (typeof entry.totalCholesterol === 'number' && entry.totalCholesterol >= 200)
    || (typeof estimatedVldl === 'number' && estimatedVldl > 40);
};

const BLOG_SECTION_META: Record<BlogSectionKey, { title: string; tag: string | null }> = {
  diabetes: { title: 'Diabetes Related', tag: 'diabetes_blog' },
  hypertension: { title: 'Hypertension Related', tag: 'htn_blog' },
  dyslipedemia: { title: 'Dyslipidemia Related', tag: 'dyslipedemia_blog' },
  heart_disease: { title: 'Heart Disease Related', tag: 'hd_blog' },
  liver_disease: { title: 'Liver Disease Related', tag: 'liver_blog' },
  kidney_disease: { title: 'Kidney Disease Related', tag: 'kidney_blog' },
  thyroid: { title: 'Thyroid Disease Related', tag: 'thyroid_blog' },
  stroke: { title: 'Stroke Related', tag: 'stroke_blog' },
  arthritis: { title: 'Arthritis Related', tag: 'arthritis_blog' },
  dental_problems: { title: 'Dental Health Related', tag: 'dental_blog' },
  mental_health: { title: 'Mental Health Related', tag: 'mentalhealth_blog' },
  obesity: { title: 'Obesity Related', tag: 'obesity_blog' },
  other_conditions: { title: 'Other Diseases Related', tag: 'other_blog' },
  general: { title: 'General Health', tag: 'healthy_blog' },
};

const DEFAULT_SECTION_ORDER: BlogSectionKey[] = [
  'diabetes',
  'hypertension',
  'dyslipedemia',
  'heart_disease',
  'liver_disease',
  'kidney_disease',
  'thyroid',
  'stroke',
  'arthritis',
  'dental_problems',
  'mental_health',
  'obesity',
  'other_conditions',
  'general',
];

const TABS: { key: TabKey; label: string; icon: typeof Globe }[] = [
  { key: 'blog', label: 'Health Blog', icon: Globe },
  { key: 'videos', label: 'Videos', icon: Youtube },
];



export default function KnowledgeHubScreen() {
  const { profile, currentBMI } = useFood();
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab = params.tab === 'videos' ? 'videos' : 'blog';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [blogLoading, setBlogLoading] = useState(true);
  const [blogRefreshing, setBlogRefreshing] = useState(false);
  const [youtubeVideos, setYoutubeVideos] = useState<YouTubeVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videosRefreshing, setVideosRefreshing] = useState(false);
  const [videoItemsPerPage, setVideoItemsPerPage] = useState<number>(10);
  const [showVideoPagePicker, setShowVideoPagePicker] = useState(false);
  const [expandedBlogSections, setExpandedBlogSections] = useState<Record<BlogSectionKey, boolean>>({} as Record<BlogSectionKey, boolean>);
  const [trackerPrioritySections, setTrackerPrioritySections] = useState<BlogSectionKey[]>([]);
  const [trackerPriorityReady, setTrackerPriorityReady] = useState(false);

  const userNcds = useMemo(() => profile.ncds || [], [profile.ncds]);
  const effectiveBlogPriorityKeys = useMemo(() => {
    return Array.from(new Set([...userNcds, ...trackerPrioritySections]));
  }, [trackerPrioritySections, userNcds]);

  const ncdCacheKey = useMemo(() => {
    const normalized = effectiveBlogPriorityKeys
      .map((item) => (item || '').toString().trim().toLowerCase())
      .filter(Boolean)
      .sort();
    return normalized.join('|');
  }, [effectiveBlogPriorityKeys]);

  const loadTrackerPrioritySections = useCallback(async () => {
    try {
      const [storedBp, storedBg, storedLipid] = await Promise.all([
        AsyncStorage.getItem(BP_STORAGE_KEY),
        AsyncStorage.getItem(BG_STORAGE_KEY),
        AsyncStorage.getItem(LIPID_STORAGE_KEY),
      ]);

      const bpEntries = storedBp ? (JSON.parse(storedBp) as BPEntry[]) : [];
      const bgEntries = storedBg ? (JSON.parse(storedBg) as BGEntry[]) : [];
      const lipidEntries = storedLipid ? (JSON.parse(storedLipid) as LipidEntry[]) : [];
      const latestBp = bpEntries.sort((a, b) => b.timestamp - a.timestamp)[0] || null;
      const latestBg = bgEntries.sort((a, b) => b.timestamp - a.timestamp)[0] || null;
      const latestLipid = lipidEntries.sort((a, b) => b.timestamp - a.timestamp)[0] || null;

      const prioritySet = new Set<BlogSectionKey>();
      if (isHighBloodPressure(latestBp)) {
        prioritySet.add('hypertension');
      }
      if (isHighBloodSugar(latestBg)) {
        prioritySet.add('diabetes');
      }
      if (isAbnormalLipidProfile(latestLipid)) {
        prioritySet.add('dyslipedemia');
      }
      if (Number.isFinite(currentBMI) && currentBMI >= 25) {
        prioritySet.add('obesity');
      }

      setTrackerPrioritySections(
        TRACKER_PRIORITY_ORDER.filter((key) => prioritySet.has(key))
      );
    } catch (error) {
      console.log('[Knowledge] Failed to derive tracker priority sections:', error);
      setTrackerPrioritySections([]);
    } finally {
      setTrackerPriorityReady(true);
    }
  }, [currentBMI]);

  const readCachedBlogPosts = useCallback(async (): Promise<BlogPost[] | null> => {
    try {
      const raw = await AsyncStorage.getItem(BLOG_CACHE_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw) as BlogCachePayload;
      if (cached?.ncdKey !== ncdCacheKey) return null;
      if (!cached?.updatedAt || Date.now() - cached.updatedAt > CACHE_MAX_AGE_MS) return null;
      if (!Array.isArray(cached?.posts) || cached.posts.length === 0) return null;
      return cached.posts;
    } catch (error) {
      console.log('[Knowledge] Failed to read blog cache:', error);
      return null;
    }
  }, [ncdCacheKey]);

  const writeCachedBlogPosts = useCallback(async (posts: BlogPost[]) => {
    try {
      const payload: BlogCachePayload = {
        ncdKey: ncdCacheKey,
        updatedAt: Date.now(),
        posts,
      };
      await AsyncStorage.setItem(BLOG_CACHE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.log('[Knowledge] Failed to write blog cache:', error);
    }
  }, [ncdCacheKey]);

  const readCachedVideos = useCallback(async (): Promise<YouTubeVideo[] | null> => {
    try {
      const raw = await AsyncStorage.getItem(VIDEO_CACHE_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw) as VideoCachePayload;
      if (!cached?.updatedAt || Date.now() - cached.updatedAt > CACHE_MAX_AGE_MS) return null;
      if (!Array.isArray(cached?.videos) || cached.videos.length === 0) return null;
      return cached.videos;
    } catch (error) {
      console.log('[Knowledge] Failed to read videos cache:', error);
      return null;
    }
  }, []);

  const writeCachedVideos = useCallback(async (videos: YouTubeVideo[]) => {
    try {
      const payload: VideoCachePayload = {
        updatedAt: Date.now(),
        videos,
      };
      await AsyncStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.log('[Knowledge] Failed to write videos cache:', error);
    }
  }, []);

  const loadBlogPosts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setBlogRefreshing(true);
      } else {
        setBlogLoading(true);
        const cachedPosts = await readCachedBlogPosts();
        if (cachedPosts) {
          setBlogPosts(cachedPosts);
          setBlogLoading(false);
          return;
        }
      }
      console.log('[Knowledge] Loading blog posts with condition-aware relevance');
      const posts = await fetchPostsForConditions(effectiveBlogPriorityKeys, 12);
      setBlogPosts(posts);
      await writeCachedBlogPosts(posts);
      console.log('[Knowledge] Loaded', posts.length, 'blog posts');
    } catch (error) {
      console.log('[Knowledge] Error loading blog posts:', error);
    } finally {
      setBlogLoading(false);
      setBlogRefreshing(false);
    }
  }, [effectiveBlogPriorityKeys, readCachedBlogPosts, writeCachedBlogPosts]);

  const loadVideos = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setVideosRefreshing(true);
      } else {
        setVideosLoading(true);
        const cachedVideos = await readCachedVideos();
        if (cachedVideos) {
          setYoutubeVideos(cachedVideos);
          setVideosLoading(false);
          return;
        }
      }
      console.log('[Knowledge] Loading YouTube channel videos without condition sorting');
      const videos = await fetchChannelVideos(50);
      setYoutubeVideos(videos);
      await writeCachedVideos(videos);
      console.log('[Knowledge] Loaded', videos.length, 'YouTube videos');
    } catch (error) {
      console.log('[Knowledge] Error loading YouTube videos:', error);
    } finally {
      setVideosLoading(false);
      setVideosRefreshing(false);
    }
  }, [readCachedVideos, writeCachedVideos]);

  useEffect(() => {
    void loadTrackerPrioritySections();
  }, [loadTrackerPrioritySections]);

  useFocusEffect(
    useCallback(() => {
      void loadTrackerPrioritySections();
    }, [loadTrackerPrioritySections])
  );

  useEffect(() => {
    if (!trackerPriorityReady) {
      return;
    }
    loadBlogPosts();
    loadVideos();
  }, [loadBlogPosts, loadVideos, trackerPriorityReady]);

  const inAppRouter = useRouter();

  const extractYouTubeVideoId = useCallback((url: string): string | null => {
    if (!url || typeof url !== 'string') return null;
    const normalized = url.trim();

    const patterns = [
      /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{6,})/i,
      /(?:youtu\.be\/)([A-Za-z0-9_-]{6,})/i,
      /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{6,})/i,
      /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/i,
      /^([A-Za-z0-9_-]{6,})$/,
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match?.[1]) return match[1];
    }

    return null;
  }, []);

  const normalizeUrl = useCallback((rawUrl: string): string => {
    const trimmed = (rawUrl || '').trim();
    if (!trimmed) return '';
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : trimmed.startsWith('//')
        ? `https:${trimmed}`
        : `https://${trimmed}`;

    try {
      const parsed = new URL(withScheme);
      if (parsed.protocol === 'http:') {
        parsed.protocol = 'https:';
      }
      return parsed.toString();
    } catch {
      return withScheme;
    }
  }, []);

  const openInApp = useCallback((url: string, title?: string) => {
    try {
      const normalizedUrl = normalizeUrl(url);
      if (!normalizedUrl) return;
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      inAppRouter.push({ pathname: '/web-viewer', params: { url: normalizedUrl, title: title || '' } });
    } catch (error) {
      console.log('[Knowledge] Failed to open URL:', error);
      const normalizedUrl = normalizeUrl(url);
      if (normalizedUrl) {
        Linking.openURL(normalizedUrl).catch(() => {});
      }
    }
  }, [inAppRouter, normalizeUrl]);

  const openYouTubeExternal = useCallback(async (url: string) => {
    const videoId = extractYouTubeVideoId(url);
    const webUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
    const appDeepLinks = videoId
      ? [
          `youtube://www.youtube.com/watch?v=${videoId}`,
          `vnd.youtube://${videoId}`,
          `vnd.youtube://watch/${videoId}`,
          `intent://www.youtube.com/watch?v=${videoId}#Intent;package=com.google.android.youtube;scheme=https;end`,
        ]
      : [
          'youtube://',
          'vnd.youtube://',
        ];

    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      for (const deepLinkUrl of appDeepLinks) {
        try {
          if (Platform.OS === 'ios') {
            await Linking.openURL(deepLinkUrl);
            return;
          }

          const canOpenYoutubeApp = await Linking.canOpenURL(deepLinkUrl);
          if (!canOpenYoutubeApp) continue;
          await Linking.openURL(deepLinkUrl);
          return;
        } catch {
          // Try the next app deep link option.
        }
      }

      const canOpenWeb = await Linking.canOpenURL(webUrl);
      if (canOpenWeb) {
        await Linking.openURL(webUrl);
        return;
      }

      await WebBrowser.openBrowserAsync(webUrl);
    } catch (error) {
      console.log('[Knowledge] Failed to open YouTube externally:', error);
      // Last-resort fallback keeps content accessible if external opening fails.
      openInApp(webUrl);
    }
  }, [extractYouTubeVideoId, openInApp]);

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  const renderBlogPost = useCallback(({ item }: { item: BlogPost }) => {
    const imageUrl = item.images?.[0]?.url || extractImageFromContent(item.content);
    const excerpt = getExcerpt(item.content, 100);

    return (
      <TouchableOpacity
        style={styles.blogCard}
        onPress={() => openInApp(item.url)}
        activeOpacity={0.7}
      >
        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={styles.blogImage}
            contentFit="cover"
          />
        )}
        <View style={styles.blogContent}>
          <Text style={styles.blogTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.blogExcerpt} numberOfLines={2}>{excerpt}</Text>
          <View style={styles.blogMeta}>
            <View style={styles.blogDateRow}>
              <Clock size={12} color={colors.textLight} />
              <Text style={styles.blogDate}>{formatDate(item.published)}</Text>
            </View>
            {item.labels && item.labels.length > 0 && (
              <View style={styles.blogTagRow}>
                <Tag size={12} color={colors.primary} />
                <Text style={styles.blogTag} numberOfLines={1}>
                  {item.labels.slice(0, 2).join(', ')}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.blogArrow}>
          <ChevronRight size={18} color={colors.textLight} />
        </View>
      </TouchableOpacity>
    );
  }, [openInApp, formatDate]);

  const formatVideoDate = useCallback((dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  const renderVideoCard = useCallback(({ item }: { item: YouTubeVideo }) => {
    return (
      <TouchableOpacity
        style={styles.videoCard}
        onPress={() => openYouTubeExternal(item.url)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.thumbnail }}
          style={styles.videoThumbnail}
          contentFit="cover"
        />
        <View style={styles.videoPlayOverlay}>
          <View style={styles.videoPlayButton}>
            <Youtube size={20} color="#fff" />
          </View>
        </View>
        <View style={styles.videoContent}>
          <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.videoMetaRow}>
            <Text style={styles.videoChannel}>{item.channelTitle}</Text>
            {item.publishedAt ? (
              <Text style={styles.videoDate}>{formatVideoDate(item.publishedAt)}</Text>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [openYouTubeExternal, formatVideoDate]);

  const blogSectionOrder = useMemo(() => {
    const trackerPriority = TRACKER_PRIORITY_ORDER.filter((key) => trackerPrioritySections.includes(key));
    const userPriority = userNcds
      .map((ncd) => {
        if (ncd === 'depression' || ncd === 'anxiety') return 'mental_health' as BlogSectionKey;
        if (ncd === 'other') return 'other_conditions' as BlogSectionKey;
        return ncd as BlogSectionKey;
      })
      .filter((key, index, arr) => key in BLOG_SECTION_META && arr.indexOf(key) === index);

    const prioritized = [...trackerPriority, ...userPriority].filter(
      (key, index, arr) => key in BLOG_SECTION_META && arr.indexOf(key) === index
    );
    const remaining = DEFAULT_SECTION_ORDER.filter((key) => !prioritized.includes(key));
    return [...prioritized, ...remaining];
  }, [trackerPrioritySections, userNcds]);

  const getPostSectionKey = useCallback((post: BlogPost): BlogSectionKey => {
    const labels = (post.labels || []).map((l) => l.toLowerCase());

    if (labels.includes('diabetes_blog')) return 'diabetes';
    if (labels.includes('htn_blog')) return 'hypertension';
    if (labels.includes('dyslipedemia_blog')) return 'dyslipedemia';
    if (labels.includes('hd_blog')) return 'heart_disease';
    if (labels.includes('liver_blog')) return 'liver_disease';
    if (labels.includes('kidney_blog')) return 'kidney_disease';
    if (labels.includes('thyroid_blog')) return 'thyroid';
    if (labels.includes('stroke_blog')) return 'stroke';
    if (labels.includes('arthritis_blog')) return 'arthritis';
    if (labels.includes('dental_blog')) return 'dental_problems';
    if (labels.includes('mentalhealth_blog')) return 'mental_health';
    if (labels.includes('obesity_blog')) return 'obesity';
    if (labels.includes('other_blog')) return 'other_conditions';
    return 'general';
  }, []);

  const groupedBlogItems = useMemo(() => {
    const grouped = new Map<BlogSectionKey, BlogPost[]>();

    blogPosts.forEach((post) => {
      const key = getPostSectionKey(post);
      const list = grouped.get(key) || [];
      list.push(post);
      grouped.set(key, list);
    });

    const output: BlogListItem[] = [];
    const hasUserConditions = userNcds.length > 0;
    for (const sectionKey of blogSectionOrder) {
      const posts = grouped.get(sectionKey) || [];

      if (posts.length === 0) {
        continue;
      }

      const meta = BLOG_SECTION_META[sectionKey];
      output.push({
        type: 'section',
        key: `section-${sectionKey}`,
        sectionKey,
        title: meta.title,
        count: posts.length,
      });

      const expanded = expandedBlogSections[sectionKey] === true;
      const visiblePosts = !hasUserConditions
        ? posts
        : (expanded ? posts : posts.slice(0, INITIAL_POSTS_PER_SECTION));

      visiblePosts.forEach((post) => {
        output.push({
          type: 'post',
          key: `post-${post.id}`,
          post,
        });
      });

      if (hasUserConditions && !expanded && posts.length > INITIAL_POSTS_PER_SECTION) {
        output.push({
          type: 'action',
          key: `action-${sectionKey}`,
          sectionKey,
          expanded: false,
          hiddenCount: Math.max(0, posts.length - INITIAL_POSTS_PER_SECTION),
        });
      } else if (hasUserConditions && expanded && posts.length > INITIAL_POSTS_PER_SECTION) {
        output.push({
          type: 'action',
          key: `action-${sectionKey}`,
          sectionKey,
          expanded: true,
          hiddenCount: Math.max(0, posts.length - INITIAL_POSTS_PER_SECTION),
        });
      }
    }

    return output;
  }, [blogPosts, blogSectionOrder, expandedBlogSections, getPostSectionKey, userNcds.length]);

  const toggleBlogSection = useCallback((sectionKey: BlogSectionKey) => {
    setExpandedBlogSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  }, []);

  const renderBlogListItem = useCallback(({ item }: { item: BlogListItem }) => {
    if (item.type === 'section') {
      return (
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionHeaderTitle}>{item.title}</Text>
            <Text style={styles.sectionHeaderSubtitle}>
              {item.count > 0 ? `${Math.min(item.count, INITIAL_POSTS_PER_SECTION)} recent posts` : 'No recent posts'}
            </Text>
          </View>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{item.count}</Text>
          </View>
        </View>
      );
    }

    if (item.type === 'empty') {
      return (
        <View style={styles.sectionEmptyState}>
          <Text style={styles.sectionEmptyText}>{item.message}</Text>
        </View>
      );
    }

    if (item.type === 'action') {
      return (
        <TouchableOpacity
          style={styles.sectionActionButton}
          onPress={() => toggleBlogSection(item.sectionKey)}
          activeOpacity={0.7}
        >
          <Text style={styles.sectionActionText}>
            {item.expanded ? 'Show less' : `See more${item.hiddenCount > 0 ? ` (${item.hiddenCount})` : ''}`}
          </Text>
          <ChevronDown
            size={16}
            color={colors.primary}
            style={{ transform: [{ rotate: item.expanded ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>
      );
    }

    return renderBlogPost({ item: item.post });
  }, [renderBlogPost, toggleBlogSection]);

  const paginatedVideos = useMemo(() => {
    return youtubeVideos.slice(0, videoItemsPerPage);
  }, [youtubeVideos, videoItemsPerPage]);

  const renderPageSizePicker = useCallback((
    current: number,
    showPicker: boolean,
    setShowPicker: (v: boolean) => void,
    onSelect: (v: number) => void,
    totalItems: number,
    accentColor: string,
  ) => {
    return (
      <View style={styles.pageSizeContainer}>
        <View style={styles.pageSizeRow}>
          <View style={styles.pageSizeInfo}>
            <List size={14} color={colors.textSecondary} />
            <Text style={styles.pageSizeLabel}>
              Showing {Math.min(current, totalItems)} of {totalItems}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.pageSizeButton, { borderColor: accentColor + '40' }]}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowPicker(!showPicker);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.pageSizeButtonText, { color: accentColor }]}>{current} items</Text>
            <ChevronDown size={14} color={accentColor} />
          </TouchableOpacity>
        </View>
        {showPicker && (
          <View style={styles.pageSizeOptions}>
            {PAGE_SIZE_OPTIONS.map(size => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.pageSizeOption,
                  current === size && { backgroundColor: accentColor + '15' },
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelect(size);
                  setShowPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pageSizeOptionText,
                    current === size && { color: accentColor, fontWeight: '700' as const },
                  ]}
                >
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  }, []);

  const renderBlogTab = () => {
    if (blogLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading health articles...</Text>
        </View>
      );
    }

    if (blogPosts.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Globe size={48} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No articles found</Text>
          <Text style={styles.emptyText}>Pull down to refresh or check your internet connection</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadBlogPosts()}>
            <RefreshCw size={16} color="#fff" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={groupedBlogItems}
        renderItem={renderBlogListItem}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={blogRefreshing}
            onRefresh={() => loadBlogPosts(true)}
            tintColor={colors.primary}
          />
        }
      />
    );
  };

  const renderVideosTab = () => {
    if (videosLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={YOUTUBE_RED} />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      );
    }

    if (youtubeVideos.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Youtube size={48} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No videos found</Text>
          <Text style={styles.emptyText}>Pull down to refresh or check your internet connection</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: YOUTUBE_RED }]} onPress={() => loadVideos()}>
            <RefreshCw size={16} color="#fff" />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={paginatedVideos}
        renderItem={renderVideoCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        columnWrapperStyle={styles.videoRow}
        refreshControl={
          <RefreshControl
            refreshing={videosRefreshing}
            onRefresh={() => loadVideos(true)}
            tintColor={YOUTUBE_RED}
          />
        }
        ListHeaderComponent={
          <View>
            <TouchableOpacity
              style={styles.youtubeChannelBanner}
              onPress={() => openYouTubeExternal('https://www.youtube.com/@HealthyMe4u')}
              activeOpacity={0.8}
            >
              <View style={styles.youtubeBannerContent}>
                <View style={styles.youtubeIconWrap}>
                  <Youtube size={28} color="#fff" />
                </View>
                <View style={styles.youtubeBannerTextWrap}>
                  <Text style={styles.youtubeBannerTitle}>HealthyMe4u</Text>
                  <Text style={styles.youtubeBannerSub}>Health tips, guides & wellness videos</Text>
                </View>
                <ExternalLink size={18} color="rgba(255,255,255,0.7)" />
              </View>
            </TouchableOpacity>
            {renderPageSizePicker(
              videoItemsPerPage,
              showVideoPagePicker,
              setShowVideoPagePicker,
              setVideoItemsPerPage,
              youtubeVideos.length,
              YOUTUBE_RED,
            )}
          </View>
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['left', 'right']} style={styles.safeTop}>
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>Health resources at your fingertips</Text>
        </View>

        <View style={styles.tabBar}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const IconComp = tab.icon;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(tab.key);
                }}
                activeOpacity={0.7}
              >
                <IconComp size={16} color={isActive ? '#fff' : colors.textSecondary} />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>

      <View style={styles.contentArea}>
        {activeTab === 'blog' && renderBlogTab()}
        {activeTab === 'videos' && renderVideosTab()}
      </View>
    </View>
  );
}

const styles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  safeTop: {
    backgroundColor: colors.surfaceAlt,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 0,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 3,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 5,
  },
  tabItemActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: '#fff',
  },
  contentArea: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 20,
    gap: 6,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600' as const,
    fontSize: 14,
  },
  blogCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  blogImage: {
    width: 90,
    height: 100,
  },
  blogContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  blogTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.text,
    lineHeight: 19,
    marginBottom: 4,
  },
  blogExcerpt: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginBottom: 6,
  },
  blogMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  blogDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  blogDate: {
    fontSize: 11,
    color: colors.textLight,
  },
  blogTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  blogTag: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500' as const,
  },
  blogArrow: {
    justifyContent: 'center',
    paddingRight: 10,
  },
  videoRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  videoCard: {
    width: '48%' as any,
    backgroundColor: colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  videoThumbnail: {
    width: '100%',
    height: 100,
  },
  videoPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  videoPlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(220,38,38,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoContent: {
    padding: 10,
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.text,
    lineHeight: 18,
    marginBottom: 4,
  },
  videoMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoChannel: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  videoDate: {
    fontSize: 10,
    color: colors.textLight,
  },
  youtubeChannelBanner: {
    backgroundColor: YOUTUBE_RED,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  youtubeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  youtubeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  youtubeBannerTextWrap: {
    flex: 1,
  },
  youtubeBannerTitle: {
    fontSize: 18,
    fontWeight: '800' as const,
    color: '#fff',
  },
  youtubeBannerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  dailyTipBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: colors.warning + '14',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  dailyTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dailyTipLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.warning,
  },
  dailyTipText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    fontWeight: '500' as const,
  },
  dailyTipCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
  },
  dailyTipCategoryText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  tipCategoriesScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tipCategoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tipCategoryChipActive: {
    backgroundColor: colors.primary,
  },
  tipCategoryChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  tipCategoryChipTextActive: {
    color: '#fff',
  },
  pageSizeContainer: {
    marginBottom: 12,
  },
  pageSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageSizeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageSizeLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500' as const,
  },
  pageSizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  pageSizeButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  pageSizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  pageSizeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
  },
  pageSizeOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: colors.text,
  },
  sectionHeader: {
    marginTop: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: colors.text,
  },
  sectionHeaderSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionBadge: {
    minWidth: 26,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '1A',
  },
  sectionBadgeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700' as const,
  },
  sectionEmptyState: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionEmptyText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  sectionActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: -2,
    marginBottom: 14,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.primary,
  },
  tipsListContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    alignItems: 'flex-start',
    gap: 12,
  },
  tipNumberBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipNumber: {
    fontSize: 14,
    fontWeight: '800' as const,
  },
  tipContent: {
    flex: 1,
  },
  tipText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
    fontWeight: '400' as const,
  },
  tipCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 8,
  },
  tipCategoryText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
}));
