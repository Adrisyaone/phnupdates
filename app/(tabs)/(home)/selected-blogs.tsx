import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Image, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MinusCircle, Search, Sparkles } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { DASHBOARD_MENUS, DashboardMenuKey, getMenuThemeColor } from '@/constants/blogMenus';
import { getInterestedPosts, InterestedPost, removeInterestedPost } from '@/services/interestedPosts';

const CATEGORY_ORDER: Array<{ key: DashboardMenuKey | 'all' | 'uncategorized'; title: string }> = [
  { key: 'all', title: 'All' },
  { key: 'opportunities', title: 'Opportunities' },
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
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={(
          <View style={styles.headerWrap}>
            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <Sparkles size={22} color={colors.surface} />
              </View>
              <View style={styles.heroTextWrap}>
                <Text style={styles.heroTitle}>Selected Blogs</Text>
                <Text style={styles.heroSubtitle}>Browse all selected blogs grouped by category.</Text>
              </View>
            </View>

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
                  <TouchableOpacity
                    key={category.key}
                    style={[
                      styles.filterChip,
                      { borderColor: chipColor },
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
                  </TouchableOpacity>
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
            <TouchableOpacity
              style={[styles.card, { borderColor: accentColor + '55', backgroundColor: accentColor + '0A' }]}
              onPress={() => openPost(item)}
              activeOpacity={0.85}
            >
              {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.cardImage} /> : null}
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                  <Text style={[styles.categoryLabel, { color: accentColor }]}>
                    {categoryMenu?.title || 'Other'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={(e: any) => {
                    e?.stopPropagation?.();
                    void removePost(item.id);
                  }}
                  style={styles.removeBtn}
                >
                  <MinusCircle size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
              <Text style={styles.meta}>Published: {formatDate(item.published)}</Text>
              <Text style={styles.excerpt} numberOfLines={3}>{item.excerpt}</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={(
          <View style={styles.emptyWrap}>
            <Search size={22} color={colors.textSecondary} />
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
    paddingHorizontal: 16,
    paddingBottom: 22,
    gap: 10,
  },
  headerWrap: {
    gap: 12,
    paddingTop: 8,
    paddingBottom: 6,
  },
  heroCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: themeColors.surface,
    borderWidth: 1,
    borderColor: themeColors.border,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary,
  },
  heroTextWrap: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    color: themeColors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: themeColors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
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
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardImage: {
    width: '100%',
    height: 170,
    borderRadius: 14,
    backgroundColor: themeColors.surfaceAlt,
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
    paddingVertical: 56,
    gap: 6,
  },
  emptyTitle: {
    color: themeColors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: themeColors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
}));
