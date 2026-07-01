import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, ExternalLink } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { elevation, glow, radii, spacing } from '@/constants/theme';
import { AnimatedEntrance, AuroraBackground, GradientHero, PressableScale } from '@/components/ui';

const BOOKS = [
  {
    key: 'biostatistics-for-beginners',
    title: 'Biostatistics for beginners',
    description: 'Open the Biostatistics for beginners book resource.',
    url: 'https://biostatisticsforbeginners.netlify.app/',
  },
  {
    key: 'epidemiology-and-biostat-with-r',
    title: 'Epidemiology and Biostat with R',
    description: 'Open the Epidemiology and Biostat with R book resource.',
    url: 'https://epidemiologywithr.netlify.app/',
  },
] as const;

export default function BooksScreen() {
  const router = useRouter();

  const openBookLink = (url: string, title: string) => {
    router.push({
      pathname: '/web-viewer',
      params: {
        url: encodeURIComponent(url),
        title: encodeURIComponent(title),
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GradientHero rounded style={styles.hero}>
          <View style={styles.heroInner}>
            <View style={styles.heroIcon}>
              <BookOpen size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Books</Text>
            <Text style={styles.subtitle}>Tap a book below to open it in your browser.</Text>
          </View>
        </GradientHero>

        <View style={styles.list}>
          {BOOKS.map((book, i) => (
            <AnimatedEntrance key={book.key} index={i} from="up">
              <PressableScale
                style={styles.bookCard}
                onPress={() => { openBookLink(book.url, book.title); }}
                haptic
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.bookIcon, glow(colors.primary, 0.28)]}
                >
                  <BookOpen size={20} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.bookTextWrap}>
                  <Text style={styles.bookTitle}>{book.title}</Text>
                  <Text style={styles.bookDescription}>{book.description}</Text>
                </View>
                <ExternalLink size={18} color={colors.primary} />
              </PressableScale>
            </AnimatedEntrance>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl,
  },
  hero: {
    paddingBottom: spacing.xl,
  },
  heroInner: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
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
    marginBottom: spacing.xs,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: '#FFFFFFE6',
    fontSize: 13,
    lineHeight: 19,
  },
  bookCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...elevation('md'),
  },
  bookIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookTextWrap: {
    flex: 1,
    gap: 4,
  },
  bookTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  bookDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
}));