import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, createThemedStyles } from '@/constants/colors';
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>{eventTitle}</Text>
          <Text style={styles.heroMeta}>{eventDate}</Text>
          <Text style={styles.heroType}>{type === 'week' ? 'Awareness Week' : 'Awareness Day'}</Text>
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loaderText}>Finding AI summary for this event...</Text>
          </View>
        ) : null}

        {!loading && error ? (
          <View style={styles.card}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => void fetchInfo()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!loading && !error && info ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Official Theme of the Current Year</Text>
              <Text style={styles.sectionText}>{info.currentYearTheme}</Text>
              <Text style={styles.sourceLabel}>Source</Text>
              <Text style={styles.sourceText}>{`${info.currentYearThemeSourceOrg} - ${info.currentYearThemeSource}`}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <Text style={styles.sectionText}>{info.overview}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Why It Matters</Text>
              <Text style={styles.sectionText}>{info.significance}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Practical Actions</Text>
              {info.actions.map((item, index) => (
                <Text key={`${item}-${index}`} style={styles.bulletText}>{`• ${item}`}</Text>
              ))}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Key Facts</Text>
              {info.keyFacts.map((fact, index) => (
                <Text key={`${fact}-${index}`} style={styles.bulletText}>{`• ${fact}`}</Text>
              ))}
            </View>
          </>
        ) : null}
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
    padding: 16,
    gap: 10,
    paddingBottom: 26,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '700',
  },
  heroMeta: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  heroType: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  loaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  loaderText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  sectionText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  sourceLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  sourceText: {
    color: colors.textLight,
    fontSize: 12,
    lineHeight: 17,
  },
  bulletText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
}));
