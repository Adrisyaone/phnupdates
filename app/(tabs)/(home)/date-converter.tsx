import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { CalendarDays, ArrowRightLeft } from 'lucide-react-native';
import adbs from 'ad-bs-converter';
import { colors, createThemedStyles } from '@/constants/colors';
import { elevation, radii, spacing } from '@/constants/theme';
import { AnimatedEntrance, AuroraBackground, GradientHero, PressableScale } from '@/components/ui';

type DateMode = 'ad-to-bs' | 'bs-to-ad';

function normalizeMode(value?: string | string[]): DateMode {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'bs-to-ad' ? 'bs-to-ad' : 'ad-to-bs';
}

function formatParts(year: number, month: number, day: number): string {
  return [year, month, day].map((part) => String(part).padStart(2, '0')).join('/');
}

function parseDateInput(value: string): [number, number, number] | null {
  const parts = value.split(/[/-]/).map((item) => item.trim()).filter(Boolean);
  if (parts.length !== 3) return null;

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (![year, month, day].every(Number.isFinite)) return null;
  return [year, month, day];
}

export default function DateConverterScreen() {
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const [mode, setMode] = useState<DateMode>(normalizeMode(params.mode));
  const [inputValue, setInputValue] = useState(mode === 'ad-to-bs' ? '2026/05/27' : '2083/02/14');

  const conversion = useMemo(() => {
    const parsed = parseDateInput(inputValue);
    if (!parsed) return null;

    try {
      if (mode === 'ad-to-bs') {
        const result = adbs.ad2bs(inputValue);
        return {
          sourceLabel: 'AD',
          targetLabel: 'BS',
          sourceValue: formatParts(parsed[0], parsed[1], parsed[2]),
          targetValue: `${result.en.year}/${String(result.en.month).padStart(2, '0')}/${String(result.en.day).padStart(2, '0')}`,
          targetDetail: `${result.ne.strDayOfWeek}, ${result.ne.day} ${result.ne.strMonth} ${result.ne.year}`,
        };
      }

      const result = adbs.bs2ad(inputValue);
      return {
        sourceLabel: 'BS',
        targetLabel: 'AD',
        sourceValue: formatParts(parsed[0], parsed[1], parsed[2]),
        targetValue: `${result.year}/${String(result.month).padStart(2, '0')}/${String(result.day).padStart(2, '0')}`,
        targetDetail: `${result.strDayOfWeek}, ${result.strShortMonth} ${result.day}, ${result.year}`,
      };
    } catch {
      return null;
    }
  }, [inputValue, mode]);

  const placeholder = mode === 'ad-to-bs' ? '2026/05/27' : '2083/02/14';
  const title = 'Date Converter';
  const subtitle = mode === 'ad-to-bs'
    ? 'Convert Gregorian dates into Bikram Sambat dates, or switch to the reverse direction below.'
    : 'Convert Bikram Sambat dates into Gregorian dates, or switch to the reverse direction below.';
  const inputLabel = mode === 'ad-to-bs' ? 'AD Date (YYYY/MM/DD)' : 'BS Date (YYYY/MM/DD)';
  const outputLabel = mode === 'ad-to-bs' ? 'BS Date' : 'AD Date';

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <GradientHero rounded style={styles.hero}>
          <View style={styles.heroInner}>
            <View style={styles.heroIcon}>
              <CalendarDays size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </GradientHero>

        <View style={styles.body}>
          <View style={styles.segmentRow}>
            {([
              { key: 'ad-to-bs', label: 'AD to BS' },
              { key: 'bs-to-ad', label: 'BS to AD' },
            ] as const).map((item) => {
              const active = mode === item.key;
              return (
                <PressableScale
                  key={item.key}
                  style={[styles.segmentButton, active && styles.segmentButtonActive]}
                  onPress={() => {
                    setMode(item.key);
                    setInputValue(item.key === 'ad-to-bs' ? '2026/05/27' : '2083/02/14');
                  }}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item.label}</Text>
                </PressableScale>
              );
            })}
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{inputLabel}</Text>
            <TextInput
              value={inputValue}
              onChangeText={setInputValue}
              placeholder={placeholder}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helperText}>Use YYYY/MM/DD or YYYY-MM-DD format.</Text>
          </View>

          <AnimatedEntrance key={conversion?.targetValue ?? 'none'} from="up">
            <View style={styles.resultCard}>
              <LinearGradient
                colors={[colors.primary + '14', colors.primary + '03']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.resultBg}
              />
              <View style={styles.resultRow}>
                <ArrowRightLeft size={18} color={colors.primary} />
                <Text style={styles.resultLabel}>{outputLabel}</Text>
              </View>
              {conversion ? (
                <>
                  <Text style={styles.resultValue}>{conversion.targetValue}</Text>
                  <Text style={styles.resultDetail}>{conversion.targetDetail}</Text>
                </>
              ) : (
                <Text style={styles.resultDetail}>Enter a valid date to see the converted result.</Text>
              )}
            </View>
          </AnimatedEntrance>
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
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...elevation('sm'),
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: '#FFFFFFE6',
    fontSize: 13,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 16,
    gap: 10,
    ...elevation('md'),
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    borderRadius: radii.lg,
    padding: 20,
    gap: 8,
    overflow: 'hidden',
    ...elevation('md'),
  },
  resultBg: {
    ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const),
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  resultValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  resultDetail: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
}));