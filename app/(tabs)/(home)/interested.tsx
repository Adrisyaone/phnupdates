import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { MinusCircle } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { getDashboardMenu, getMenuThemeColor } from '@/constants/blogMenus';
import { getInterestedPosts, InterestedPost, removeInterestedPost } from '@/services/interestedPosts';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function InterestedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ menuKey?: string | string[] }>();
  const menuKey = Array.isArray(params.menuKey) ? params.menuKey[0] : params.menuKey;
  const menu = getDashboardMenu(menuKey ?? '');
  const menuColor = getMenuThemeColor(menuKey);

  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<InterestedPost[]>([]);

  const getAllowedMenuLabels = useCallback(() => {
    if (!menu) return null;
    const labels = menu.submenus.flatMap((submenu) => submenu.labels || []);
    return new Set(labels.map((label) => label.trim().toLowerCase()));
  }, [menu]);

  const loadItems = useCallback(async () => {
    const posts = await getInterestedPosts();

    const allowedLabels = getAllowedMenuLabels();
    if (!allowedLabels) {
      setItems(posts);
      return;
    }

    const filtered = posts.filter((post) => {
      if (!post.labels || post.labels.length === 0) return false;
      return post.labels.some((label) => allowedLabels.has(label.trim().toLowerCase()));
    });
    setItems(filtered);
  }, [getAllowedMenuLabels]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useFocusEffect(
    useCallback(() => {
      void loadItems();
    }, [loadItems])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  }, [loadItems]);

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

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, menu ? { borderColor: menuColor + '55', backgroundColor: menuColor + '0A' } : null]}
            onPress={() => openPost(item)}
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.cardImage} contentFit="cover" />
            ) : null}
            <View style={styles.headerRow}>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
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
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>{menu ? `No interested posts in ${menu.title} yet.` : 'No interested posts yet.'}</Text>
            <Text style={styles.emptySubtitle}>
              {menu
                ? 'Use the + icon in this menu to add posts here.'
                : 'Use the + icon in Jobs or other menu posts to add them here.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 20,
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: 12,
    gap: 4,
  },
  cardImage: {
    width: '100%',
    height: 170,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: colors.surfaceAlt,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  removeBtn: {
    padding: 2,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  excerpt: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 56,
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
    textAlign: 'center',
  },
}));
