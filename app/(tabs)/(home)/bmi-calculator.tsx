import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Calculator, Ruler } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { elevation, glow, radii, spacing } from '@/constants/theme';
import { AnimatedEntrance, AuroraBackground, GradientHero } from '@/components/ui';

function getBMICategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', color: colors.warning };
  if (bmi < 25) return { label: 'Normal', color: colors.success };
  if (bmi < 30) return { label: 'Overweight', color: colors.warning };
  return { label: 'Obese', color: colors.error };
}

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function BMICalculatorScreen() {
  const [heightCm, setHeightCm] = useState('170');
  const [weightKg, setWeightKg] = useState('65');

  const bmi = useMemo(() => {
    const heightMeters = toNumber(heightCm) / 100;
    const weight = toNumber(weightKg);
    if (heightMeters <= 0 || weight <= 0) return 0;
    return weight / (heightMeters * heightMeters);
  }, [heightCm, weightKg]);

  const category = getBMICategory(bmi);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <GradientHero rounded style={styles.hero}>
          <View style={styles.heroInner}>
            <View style={styles.heroIcon}>
              <Calculator size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>BMI Calculator</Text>
            <Text style={styles.subtitle}>Enter height in centimeters and weight in kilograms.</Text>
          </View>
        </GradientHero>

        <View style={styles.body}>
          <AnimatedEntrance index={0} from="up">
            <View style={styles.inputCard}>
              <View style={styles.inputHeader}>
                <Ruler size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>Measurements</Text>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Height (cm)</Text>
                <TextInput
                  keyboardType="numeric"
                  value={heightCm}
                  onChangeText={setHeightCm}
                  placeholder="170"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Weight (kg)</Text>
                <TextInput
                  keyboardType="numeric"
                  value={weightKg}
                  onChangeText={setWeightKg}
                  placeholder="65"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                />
              </View>
            </View>
          </AnimatedEntrance>

          <AnimatedEntrance index={1} from="up">
            <View style={[styles.resultCard, { borderColor: category.color + '55' }]}>
              <LinearGradient
                colors={[category.color + '1F', category.color + '05']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.resultBg}
              />
              <Text style={styles.resultLabel}>Your BMI</Text>
              <Text style={[styles.resultValue, bmi > 0 && { color: category.color }]}>{bmi > 0 ? bmi.toFixed(1) : '--'}</Text>
              <View style={[styles.categoryPill, { backgroundColor: category.color + '22', borderColor: category.color + '55' }]}>
                <Text style={[styles.resultCategory, { color: category.color }]}>{category.label}</Text>
              </View>
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
  body: {
    padding: spacing.lg,
    gap: spacing.md,
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
  inputCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 16,
    gap: 14,
    ...elevation('md'),
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
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
  resultCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 22,
    alignItems: 'center',
    gap: spacing.sm,
    overflow: 'hidden',
    ...elevation('md'),
  },
  resultBg: {
    ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const),
  },
  resultLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  resultValue: {
    color: colors.text,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
  },
  categoryPill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  resultCategory: {
    fontSize: 14,
    fontWeight: '800',
  },
}));