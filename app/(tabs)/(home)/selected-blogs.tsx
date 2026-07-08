import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MinusCircle, Search, Sparkles } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { elevation, radii, spacing } from '@/constants/theme';
import { AnimatedEntrance, AuroraBackground, GradientHero, PressableScale } from '@/components/ui';
import { DASHBOARD_MENUS, DashboardMenuKey, getMenuThemeColor } from '@/constants/blogMenus';
import { getInterestedPosts, InterestedPost, removeInterestedPost } from '@/services/interestedPosts';

const CATEGORY_ORDER: Array<{ key: DashboardMenuKey | 'all' | 'uncategorized'; title: string }> = [
  { key: 'all', title: 'All' },
  { key: 'dashboards', title: 'Dashboards' },
  { key: 'news', title: 'News' },
  { key: 'articles', title: 'Reports & Documents' },
  { key: 'factsheet', title: 'Factsheet' },
  { key: 'literatures', title: 'Literature' },
  { key: 'uncategorized', title: 'Other' },
];

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

function getCategoryForPost(post: InterestedPost): DashboardMenuKey | 'uncategorized' {
  const postLabels = new Set((post.labels || []).map((label) => normalizeLabel(label)));

  for (const menu of DASHBOARD_MENUS) {
    const menuLabels = menu.submenus.flatMap((submenu) => submenu.labels || []).map((label) => normalizeLabel(label));
    if (menuLabels.some((label) => postLabels.has(label))) {
      return menu.key;
    }
  }

  return 'uncategorized';
}

export default function SelectedBlogsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<InterestedPost[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<DashboardMenuKey | 'all' | 'uncategorized'>('all');

  const loadItems = useCallback(async () => {
    const posts = await getInterestedPosts();
    setItems(posts);
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useFocusEffect(
    useCallback(() => {
      void loadItems();
    }, [loadItems])
  );

  const groupedByCategory = useMemo(() => {
    const map = new Map<DashboardMenuKey | 'uncategorized', InterestedPost[]>();
    items.forEach((post) => {
      const category = getCategoryForPost(post);
      const current = map.get(category) || [];
      current.push(post);
      map.set(category, current);
    });
    return map;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'all') {
      return items;
    }
    return items.filter((post) => getCategoryForPost(post) === selectedCategory);
  }, [items, selectedCategory]);

  const openPost = useCallback(
    (post: InterestedPost) => {
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

  const removePost = useCallback(
    async (postId: string) => {
      await removeInterestedPost(postId);
      await loadItems();
    },
    [loadItems]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  }, [loadItems]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <AuroraBackground />
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={(
          <View style={styles.headerWrap}>
            <GradientHero rounded style={styles.hero}>
              <View style={styles.heroRow}>
                <View style={styles.heroIcon}>
                  <Sparkles size={24} color="#FFFFFF" />
                </View>
                <View style={styles.heroTextWrap}>
                  <Text style={styles.heroTitle}>Selected Blogs</Text>
                  <Text style={styles.heroSubtitle}>Browse all selected blogs grouped by category.</Text>
                </View>
              </View>
            </GradientHero>

            <View style={styles.filterRow}>
              {CATEGORY_ORDER.map((category) => {
                const active = selectedCategory === category.key;
                const count = category.key === 'all'
                  ? items.length
                  : category.key === 'uncategorized'
                    ? groupedByCategory.get('uncategorized')?.length || 0
                    : groupedByCategory.get(category.key)?.length || 0;

                if (category.key !== 'all' && count === 0) {
                  return null;
                }

                const chipColor = category.key === 'all' || category.key === 'uncategorized'
                  ? colors.primary
                  : getMenuThemeColor(category.key);

                return (
                  <PressableScale
                    key={category.key}
                    style={[
                      styles.filterChip,
                      { borderColor: chipColor + '80' },
                      active && { backgroundColor: chipColor, borderColor: chipColor },
                    ]}
                    onPress={() => setSelectedCategory(category.key)}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {category.title}
                    </Text>
                    <Text style={[styles.filterCountText, active && styles.filterChipTextActive]}>
                      {count}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        )}
        renderItem={({ item }) => {
          const categoryKey = getCategoryForPost(item);
          const categoryMenu = DASHBOARD_MENUS.find((menu) => menu.key === categoryKey);
          const accentColor = categoryKey === 'uncategorized' ? colors.primary : getMenuThemeColor(categoryKey);

          return (
            <AnimatedEntrance from="up">
            <PressableScale
              style={[styles.card, { borderColor: accentColor + '33' }]}
              onPress={() => openPost(item)}
              activeScale={0.99}
            >
              <View style={[styles.cardRail, { backgroundColor: accentColor }]} />
              {item.imageUrl ? (
                <View style={styles.cardImageWrap}>
                  <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
                  <LinearGradient colors={['#00000000', '#00000055']} style={styles.cardImageScrim} />
                </View>
              ) : null}
              <View style={styles.cardBody}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleWrap}>
                    <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                    <Text style={[styles.categoryLabel, { color: accentColor }]}>
                      {categoryMenu?.title || 'Other'}
                    </Text>
                  </View>
                  <PressableScale
                    onPress={(e: any) => {
                      e?.stopPropagation?.();
                      void removePost(item.id);
                    }}
                    style={styles.removeBtn}
                    haptic
                    accessibilityLabel="Remove from selected"
                  >
                    <MinusCircle size={20} color={colors.error} />
                  </PressableScale>
                </View>
                <Text style={styles.meta}>Published: {formatDate(item.published)}</Text>
                <Text style={styles.excerpt} numberOfLines={3}>{item.excerpt}</Text>
              </View>
            </PressableScale>
            </AnimatedEntrance>
          );
        }}
        ListEmptyComponent={(
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIcon}>
              <Search size={26} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No selected blogs yet.</Text>
            <Text style={styles.emptySubtitle}>Tap the + icon on posts in any category to add them here.</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = createThemedStyles((themeColors) => ({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  listContent: {
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  headerWrap: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  hero: {
    paddingBottom: spacing.lg,
    marginBottom: spacing.xs,
  },
  heroRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF2E',
    borderWidth: 1,
    borderColor: '#FFFFFF40',
  },
  heroTextWrap: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: '#FFFFFFE6',
    fontSize: 13,
    lineHeight: 19,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: themeColors.surface,
  },
  filterChipText: {
    color: themeColors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  filterCountText: {
    color: themeColors.textSecondary,
    fontWeight: '700',
    fontSize: 12,
  },
  filterChipTextActive: {
    color: themeColors.surface,
  },
  card: {
    marginHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: themeColors.surface,
    overflow: 'hidden',
    ...elevation('md'),
  },
  cardRail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 2,
  },
  cardImageWrap: {
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: themeColors.surfaceAlt,
  },
  cardImageScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },
  cardBody: {
    padding: 14,
    paddingLeft: 16,
    gap: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitleWrap: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: themeColors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  removeBtn: {
    padding: 2,
  },
  meta: {
    color: themeColors.textSecondary,
    fontSize: 12,
  },
  excerpt: {
    color: themeColors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary + '18',
    marginBottom: 4,
  },
  emptyTitle: {
    color: themeColors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: themeColors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
}));
