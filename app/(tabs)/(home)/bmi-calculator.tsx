import React, { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calculator, Ruler } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';

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
      <View style={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Calculator size={22} color={colors.surface} />
          </View>
          <Text style={styles.title}>BMI Calculator</Text>
          <Text style={styles.subtitle}>Enter height in centimeters and weight in kilograms.</Text>
        </View>

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

        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Your BMI</Text>
          <Text style={styles.resultValue}>{bmi > 0 ? bmi.toFixed(1) : '--'}</Text>
          <Text style={[styles.resultCategory, { color: category.color }]}>{category.label}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: 16,
    gap: 14,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 18,
    gap: 10,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  inputCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    gap: 14,
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
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  resultLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  resultValue: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
  },
  resultCategory: {
    fontSize: 15,
    fontWeight: '700',
  },
}));