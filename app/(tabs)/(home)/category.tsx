import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle2, PlusCircle, Search, Star } from 'lucide-react-native';
import { getMenuThemeColor, getSubmenu } from '@/constants/blogMenus';
import { BlogPost, extractImageFromContent, fetchPostsByLabels, getExcerpt } from '@/services/bloggerApi';
import { colors, createThemedStyles } from '@/constants/colors';
import { elevation, radii, spacing } from '@/constants/theme';
import { AnimatedEntrance, AuroraBackground, PressableScale } from '@/components/ui';
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
      <AuroraBackground tint={menuColor} />

      {/* Gradient sub-header */}
      <LinearGradient
        colors={[menuColor, menuColor + 'CC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.subHeader}
      >
        <View style={styles.subHeaderRow}>
          <View style={styles.subHeaderTextWrap}>
            <Text style={styles.subHeaderTitle} numberOfLines={1}>{submenu.title}</Text>
            <Text style={styles.subHeaderMeta}>{filteredPosts.length} posts</Text>
          </View>
          <PressableScale
            style={styles.interestedShortcut}
            onPress={() => { router.push({ pathname: '/(tabs)/(home)/interested', params: { menuKey: menuKey ?? '' } }); }}
            haptic
          >
            <Star size={15} color="#FFFFFF" />
            <Text style={styles.interestedShortcutText}>Interested</Text>
          </PressableScale>
        </View>
      </LinearGradient>

      <View style={styles.searchBarWrap}>
        <View style={styles.searchInner}>
          <Search size={17} color={colors.textSecondary} />
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
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadPosts(true)} tintColor={menuColor} />}
          renderItem={({ item, index }) => {
            const imageUrl = item.images?.[0]?.url || extractImageFromContent(item.content);
            const isInterested = interestedIds.has(item.id);
            return (
              <AnimatedEntrance index={Math.min(index, 8)} from="up">
                <View style={[styles.postCard, { borderColor: menuColor + '33' }]}>
                  <View style={[styles.cardAccentRail, { backgroundColor: menuColor }]} />
                  {imageUrl ? (
                    <PressableScale style={styles.postImageWrap} onPress={() => openPost(item)} activeScale={0.99}>
                      <Image source={{ uri: imageUrl }} style={styles.postImage} contentFit="cover" transition={220} />
                      <LinearGradient colors={['#00000000', '#00000055']} style={styles.postImageScrim} />
                    </PressableScale>
                  ) : null}
                  <View style={styles.cardBody}>
                    <View style={styles.cardHeaderRow}>
                      <PressableScale style={styles.cardMainArea} onPress={() => openPost(item)} activeScale={0.99}>
                        <Text style={styles.postTitle}>{item.title}</Text>
                      </PressableScale>
                      <PressableScale
                        onPress={() => { void toggleInterested(item); }}
                        style={styles.addBtn}
                        haptic
                        accessibilityLabel={isInterested ? 'Remove from interested' : 'Add to interested'}
                      >
                        {isInterested ? (
                          <CheckCircle2 size={24} color={colors.success} />
                        ) : (
                          <PlusCircle size={24} color={menuColor} />
                        )}
                      </PressableScale>
                    </View>
                    <PressableScale style={styles.cardMainArea} onPress={() => openPost(item)} activeScale={0.99}>
                      <Text style={styles.postDate}>{formatDate(item.published)}</Text>
                      <Text style={styles.postExcerpt} numberOfLines={3}>{getExcerpt(item.content, 180)}</Text>
                    </PressableScale>
                  </View>
                </View>
              </AnimatedEntrance>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIcon, { backgroundColor: menuColor + '18' }]}>
                <Star size={26} color={menuColor} />
              </View>
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
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  subHeader: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...elevation('md'),
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  subHeaderTextWrap: {
    flex: 1,
    gap: 2,
  },
  subHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subHeaderMeta: {
    color: '#FFFFFFDD',
    fontSize: 12,
    fontWeight: '600',
  },
  interestedShortcut: {
    backgroundColor: '#FFFFFF26',
    borderWidth: 1,
    borderColor: '#FFFFFF40',
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  interestedShortcutText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  searchBarWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...elevation('sm'),
  },
  searchBar: {
    flex: 1,
    color: colors.text,
    paddingVertical: 11,
    fontSize: 15,
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  postCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...elevation('md'),
  },
  cardAccentRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 2,
  },
  postImageWrap: {
    overflow: 'hidden',
  },
  postImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.surfaceAlt,
  },
  postImageScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },
  cardBody: {
    padding: 14,
    paddingLeft: 16,
    gap: 4,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardMainArea: {
    flex: 1,
  },
  postTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    flex: 1,
  },
  addBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  postDate: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  postExcerpt: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
}));
