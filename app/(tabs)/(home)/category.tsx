import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { CheckCircle2, PlusCircle, Star } from 'lucide-react-native';
import { getMenuThemeColor, getSubmenu } from '@/constants/blogMenus';
import { BlogPost, extractImageFromContent, fetchPostsByLabels, getExcerpt } from '@/services/bloggerApi';
import { colors, createThemedStyles } from '@/constants/colors';
import { getInterestedPostIds, toggleInterestedPost } from '@/services/interestedPosts';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function CategoryPostsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ menuKey?: string | string[]; submenuKey?: string | string[] }>();
  const menuKey = Array.isArray(params.menuKey) ? params.menuKey[0] : params.menuKey;
  const submenuKey = Array.isArray(params.submenuKey) ? params.submenuKey[0] : params.submenuKey;
  const submenu = getSubmenu(menuKey ?? '', submenuKey ?? '');
  const menuColor = getMenuThemeColor(menuKey);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());

  const loadPosts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      if (!submenu) {
        setPosts([]);
        return;
      }
      const result = await fetchPostsByLabels(submenu.labels, 20, 80);
      setPosts(result);
    } catch (error) {
      console.log('[Category] Failed to load posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [submenu]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    const loadInterested = async () => {
      const ids = await getInterestedPostIds();
      setInterestedIds(ids);
    };
    void loadInterested();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const refreshInterested = async () => {
        const ids = await getInterestedPostIds();
        setInterestedIds(ids);
      };
      void refreshInterested();
    }, [])
  );

  const openPost = useCallback(
    (post: BlogPost) => {
      router.push({
        pathname: '/web-viewer',
        params: {
          url: encodeURIComponent(post.url),
          title: encodeURIComponent(post.title),
        },
      });
    },
    [router]
  );

  const toggleInterested = useCallback(async (post: BlogPost) => {
    const added = await toggleInterestedPost(post);
    setInterestedIds((prev) => {
      const next = new Set(prev);
      if (added) {
        next.add(post.id);
      } else {
        next.delete(post.id);
      }
      return next;
    });
  }, []);

  if (!submenu) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Submenu not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Filter posts by search
  const filteredPosts = search.trim().length === 0
    ? posts
    : posts.filter(
        (item) =>
          item.title.toLowerCase().includes(search.toLowerCase()) ||
          item.content?.toLowerCase().includes(search.toLowerCase())
      );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View style={styles.topActionsRow}>
        <TouchableOpacity
          style={[styles.interestedShortcut, { borderColor: menuColor }]}
          onPress={() => {
            router.push({ pathname: '/(tabs)/(home)/interested', params: { menuKey: menuKey ?? '' } });
          }}
        >
          <Star size={16} color={menuColor} />
          <Text style={styles.interestedShortcutText}>Interested</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchBarWrap}>
        <TextInput
          style={styles.searchBar}
          placeholder={`Search ${submenu.title}...`}
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={menuColor} />
          <Text style={styles.loaderText}>Loading {submenu.title.toLowerCase()} posts...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadPosts(true)} />}
          renderItem={({ item }) => {
            const imageUrl = item.images?.[0]?.url || extractImageFromContent(item.content);
            return (
            <View style={[styles.postCard, { borderColor: menuColor + '55', backgroundColor: menuColor + '0A' }]}>
              {imageUrl ? (
                <TouchableOpacity style={styles.postImageWrap} onPress={() => openPost(item)} activeOpacity={0.85}>
                  <Image source={{ uri: imageUrl }} style={styles.postImage} contentFit="cover" />
                </TouchableOpacity>
              ) : null}
              <View style={styles.cardHeaderRow}>
                <TouchableOpacity style={styles.cardMainArea} onPress={() => openPost(item)} activeOpacity={0.8}>
                  <Text style={styles.postTitle}>{item.title}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { void toggleInterested(item); }}
                  style={styles.addBtn}
                >
                  {interestedIds.has(item.id) ? (
                    <CheckCircle2 size={22} color={colors.success} />
                  ) : (
                    <PlusCircle size={22} color={menuColor} />
                  )}
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.cardMainArea} onPress={() => openPost(item)} activeOpacity={0.8}>
              <Text style={styles.postDate}>{formatDate(item.published)}</Text>
              <Text style={styles.postExcerpt} numberOfLines={3}>{getExcerpt(item.content, 180)}</Text>
              </TouchableOpacity>
            </View>
          )}}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>{submenu.emptyMessage}</Text>
              <Text style={styles.emptySubtitle}>Pull to refresh when new posts are published.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  topActionsRow: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  interestedShortcut: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  interestedShortcutText: {
    marginLeft: 6,
    color: colors.text,
    fontWeight: '600',
  },
  searchBarWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
    backgroundColor: colors.background,
  },
  searchBar: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 2,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    display: 'none',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    color: colors.textSecondary,
    marginTop: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 22,
    paddingTop: 2,
    gap: 10,
  },
  postCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 4,
  },
  postImageWrap: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 4,
  },
  postImage: {
    width: '100%',
    height: 170,
    backgroundColor: colors.surfaceAlt,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardMainArea: {
    flex: 1,
  },
  postTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  addBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  postDate: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  postExcerpt: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 1,
  },
  emptyWrap: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
}));