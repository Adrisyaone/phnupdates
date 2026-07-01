import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, CalendarDays, CheckCircle, Heart, Info, Lightbulb, RefreshCw, Star } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { elevation, radii, spacing } from '@/constants/theme';
import { AnimatedEntrance, AuroraBackground, GradientHero, PressableScale } from '@/components/ui';
import { getPublicHealthDayInfo, PublicHealthDayInfo } from '@/services/publicHealthDayInfo';

export default function PublicHealthDayScreen() {
  const params = useLocalSearchParams<{
    month?: string | string[];
    day?: string | string[];
    title?: string | string[];
    type?: string | string[];
  }>();

  const month = Array.isArray(params.month) ? params.month[0] : params.month;
  const day = Array.isArray(params.day) ? params.day[0] : params.day;
  const title = Array.isArray(params.title) ? params.title[0] : params.title;
  const type = Array.isArray(params.type) ? params.type[0] : params.type;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<PublicHealthDayInfo | null>(null);

  const eventTitle = title || 'Public Health Day';
  const eventDate = useMemo(() => {
    if (!month || !day) return 'Date not provided';
    return `${month}/${day}`;
  }, [day, month]);

  const fetchInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getPublicHealthDayInfo(eventTitle);
      setInfo(result);
    } catch (e) {
      console.log('[PublicHealthDay] AI info fetch failed:', e);
      setError('Could not load AI details right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [eventTitle]);

  useEffect(() => {
    void fetchInfo();
  }, [fetchInfo]);

  const isWeek = type === 'week';

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <GradientHero rounded style={styles.hero}>
          <View style={styles.heroInner}>
            <View style={styles.heroIconWrap}>
              <Heart size={30} color="#FFFFFF" />
            </View>
            <Text style={styles.heroTitle}>{eventTitle}</Text>
            <View style={styles.heroBadgeRow}>
              <View style={styles.dateBadge}>
                <CalendarDays size={11} color="#FFFFFF" />
                <Text style={styles.dateBadgeText}>{eventDate}</Text>
              </View>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>
                  {isWeek ? 'Awareness Week' : 'Awareness Day'}
                </Text>
              </View>
            </View>
          </View>
        </GradientHero>

        <View style={styles.body}>

        {/* Loading */}
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Finding AI summary for this event...</Text>
          </View>
        ) : null}

        {/* Error */}
        {!loading && error ? (
          <View style={styles.errorCard}>
            <Info size={32} color={colors.error} />
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorText}>{error}</Text>
            <PressableScale style={styles.retryBtn} onPress={() => void fetchInfo()} haptic>
              <RefreshCw size={14} color="#fff" />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </PressableScale>
          </View>
        ) : null}

        {/* Content */}
        {!loading && !error && info ? (
          <>
            {/* Theme Card */}
            <AnimatedEntrance index={0} from="up"><View style={styles.themeCard}>
              <View style={styles.cardHeader}>
                <Star size={15} color={colors.secondary} />
                <Text style={styles.cardHeaderText}>Official Theme {new Date().getFullYear()}</Text>
              </View>
              <Text style={styles.themeQuote}>"{info.currentYearTheme}"</Text>
              <View style={styles.sourcePill}>
                <Text style={styles.sourcePillText} numberOfLines={2}>
                  {info.currentYearThemeSourceOrg} · {info.currentYearThemeSource}
                </Text>
              </View>
            </View></AnimatedEntrance>

            {/* Overview */}
            <AnimatedEntrance index={1} from="up"><View style={styles.card}>
              <View style={styles.cardHeader}>
                <BookOpen size={15} color={colors.primary} />
                <Text style={styles.cardHeaderText}>Overview</Text>
              </View>
              <Text style={styles.sectionText}>{info.overview}</Text>
            </View></AnimatedEntrance>

            {/* Why It Matters */}
            <AnimatedEntrance index={2} from="up"><View style={styles.card}>
              <View style={styles.cardHeader}>
                <Heart size={15} color={colors.error} />
                <Text style={styles.cardHeaderText}>Why It Matters</Text>
              </View>
              <Text style={styles.sectionText}>{info.significance}</Text>
            </View></AnimatedEntrance>

            {/* Practical Actions */}
            <AnimatedEntrance index={3} from="up"><View style={styles.card}>
              <View style={styles.cardHeader}>
                <CheckCircle size={15} color={colors.success} />
                <Text style={styles.cardHeaderText}>Practical Actions</Text>
              </View>
              <View style={styles.listContainer}>
                {info.actions.map((item, index) => (
                  <View key={`${item}-${index}`} style={styles.listRow}>
                    <View style={styles.listNumBadge}>
                      <Text style={styles.listNumText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.listItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View></AnimatedEntrance>

            {/* Key Facts */}
            <AnimatedEntrance index={4} from="up"><View style={styles.card}>
              <View style={styles.cardHeader}>
                <Lightbulb size={15} color={colors.warning} />
                <Text style={styles.cardHeaderText}>Key Facts</Text>
              </View>
              <View style={styles.listContainer}>
                {info.keyFacts.map((fact, index) => (
                  <View key={`${fact}-${index}`} style={styles.listRow}>
                    <View style={[styles.listNumBadge, styles.factNumBadge]}>
                      <Text style={[styles.listNumText, styles.factNumText]}>{index + 1}</Text>
                    </View>
                    <Text style={styles.listItemText}>{fact}</Text>
                  </View>
                ))}
              </View>
            </View></AnimatedEntrance>
          </>
        ) : null}
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
    paddingBottom: 32,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  // Hero
  hero: {
    paddingBottom: spacing.xl,
  },
  heroInner: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  heroIconWrap: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFFFFF2E',
    borderWidth: 1,
    borderColor: '#FFFFFF40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 30,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF26',
    borderWidth: 1,
    borderColor: '#FFFFFF40',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dateBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  typeBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  typeBadgeText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },

  // Loading
  loaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 14,
  },
  loaderText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },

  // Error
  errorCard: {
    backgroundColor: colors.error + '10',
    borderWidth: 1,
    borderColor: colors.error + '35',
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 4,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // Theme Card
  themeCard: {
    backgroundColor: colors.secondary + '0E',
    borderWidth: 1.5,
    borderColor: colors.secondary + '35',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },

  // Generic Card
  card: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary + 'AA',
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  cardHeaderText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  sectionText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },

  // Theme Quote
  themeQuote: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  sourcePill: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sourcePillText: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },

  // Numbered List
  listContainer: {
    gap: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  listNumBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  factNumBadge: {
    backgroundColor: colors.warning + '28',
  },
  listNumText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  factNumText: {
    color: colors.warning,
  },
  listItemText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
}));
