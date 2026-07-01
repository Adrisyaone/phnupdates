import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MinusCircle, Star } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { elevation, radii, spacing } from '@/constants/theme';
import { AnimatedEntrance, AuroraBackground, PressableScale } from '@/components/ui';
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
      <AuroraBackground tint={menuColor} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={menuColor} />}
        renderItem={({ item, index }) => (
          <AnimatedEntrance index={Math.min(index, 8)} from="up">
            <PressableScale
              style={[styles.card, { borderColor: menuColor + '33' }]}
              onPress={() => openPost(item)}
              activeScale={0.99}
            >
              <View style={[styles.cardRail, { backgroundColor: menuColor }]} />
              {item.imageUrl ? (
                <View style={styles.cardImageWrap}>
                  <Image source={{ uri: item.imageUrl }} style={styles.cardImage} contentFit="cover" transition={200} />
                  <LinearGradient colors={['#00000000', '#00000055']} style={styles.cardImageScrim} />
                </View>
              ) : null}
              <View style={styles.cardBody}>
                <View style={styles.headerRow}>
                  <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                  <PressableScale
                    onPress={(e: any) => {
                      e?.stopPropagation?.();
                      void removePost(item.id);
                    }}
                    style={styles.removeBtn}
                    haptic
                    accessibilityLabel="Remove from interested"
                  >
                    <MinusCircle size={20} color={colors.error} />
                  </PressableScale>
                </View>
                <Text style={styles.meta}>Published: {formatDate(item.published)}</Text>
                <Text style={styles.excerpt} numberOfLines={3}>{item.excerpt}</Text>
              </View>
            </PressableScale>
          </AnimatedEntrance>
        )}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIcon, { backgroundColor: menuColor + '18' }]}>
              <Star size={26} color={menuColor} />
            </View>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surfaceAlt,
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
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    flex: 1,
  },
  removeBtn: {
    padding: 2,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  excerpt: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
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
    paddingHorizontal: spacing.xl,
  },
}));
