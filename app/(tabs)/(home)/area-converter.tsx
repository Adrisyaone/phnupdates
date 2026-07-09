import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { LandPlot } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { elevation, radii, spacing } from '@/constants/theme';
import { AnimatedEntrance, AuroraBackground, GradientHero } from '@/components/ui';

type AreaUnit = 'ropani' | 'aana' | 'paisa' | 'daam' | 'bigha' | 'kattha' | 'dhur' | 'sqft' | 'sqm' | 'sqkm' | 'acre' | 'hectare';

// Every unit expressed in square feet, the common intermediate for Nepali
// land units — conversion is then a single multiply/divide via this map.
const SQFT_MAP: Record<AreaUnit, number> = {
  ropani: 5476,
  aana: 342.25,
  paisa: 85.5625,
  daam: 21.390625,
  bigha: 72900,
  kattha: 3645,
  dhur: 182.25,
  sqft: 1,
  sqm: 10.76391041671,
  sqkm: 10763910.41671,
  acre: 43560,
  hectare: 107639.1041671,
};

const UNIT_LABELS: Record<AreaUnit, string> = {
  ropani: 'Ropani',
  aana: 'Aana',
  paisa: 'Paisa',
  daam: 'Daam',
  bigha: 'Bigha',
  kattha: 'Kattha',
  dhur: 'Dhur',
  sqft: 'Sq Feet',
  sqm: 'Sq Meter',
  sqkm: 'Sq KM',
  acre: 'Acre',
  hectare: 'Hectare',
};

const UNIT_GROUPS: { title: string; units: AreaUnit[] }[] = [
  { title: 'Nepali · Hilly (Ropani)', units: ['ropani', 'aana', 'paisa', 'daam'] },
  { title: 'Nepali · Terai (Bigha)', units: ['bigha', 'kattha', 'dhur'] },
  { title: 'International', units: ['sqft', 'sqm', 'sqkm', 'acre', 'hectare'] },
];

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function convertArea(value: number, from: AreaUnit, to: AreaUnit): number {
  return (value * SQFT_MAP[from]) / SQFT_MAP[to];
}

function UnitPicker({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: AreaUnit;
  onSelect: (unit: AreaUnit) => void;
}) {
  return (
    <View style={styles.unitGroup}>
      <Text style={styles.unitGroupLabel}>{label}</Text>
      {UNIT_GROUPS.map((group) => (
        <View key={group.title} style={styles.unitSubGroup}>
          <Text style={styles.unitSubLabel}>{group.title}</Text>
          <View style={styles.unitChipWrap}>
            {group.units.map((unit) => (
              <TouchableOpacity
                key={unit}
                style={[styles.unitChip, selected === unit && styles.unitChipActive]}
                onPress={() => onSelect(unit)}
              >
                <Text style={[styles.unitChipText, selected === unit && styles.unitChipTextActive]}>
                  {UNIT_LABELS[unit]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function AreaConverterScreen() {
  const [inputValue, setInputValue] = useState('1');
  const [fromUnit, setFromUnit] = useState<AreaUnit>('ropani');
  const [toUnit, setToUnit] = useState<AreaUnit>('sqm');

  const result = useMemo(() => {
    const value = toNumber(inputValue);
    return convertArea(value, fromUnit, toUnit);
  }, [fromUnit, inputValue, toUnit]);

  const formattedResult = Number.isFinite(result)
    ? result.toLocaleString(undefined, { maximumFractionDigits: 4 })
    : '--';

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <AuroraBackground />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <GradientHero rounded style={styles.hero}>
          <View style={styles.heroInner}>
            <View style={styles.heroIcon}>
              <LandPlot size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>Area Converter</Text>
            <Text style={styles.subtitle}>Convert between Nepali land units and international area units.</Text>
          </View>
        </GradientHero>

        <View style={styles.body}>
          <View style={styles.inputCard}>
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Value</Text>
              <TextInput
                keyboardType="numeric"
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="1"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
              />
            </View>

            <UnitPicker label="From" selected={fromUnit} onSelect={setFromUnit} />
            <UnitPicker label="To" selected={toUnit} onSelect={setToUnit} />
          </View>

          <AnimatedEntrance key={formattedResult} from="up">
            <View style={styles.resultCard}>
              <LinearGradient
                colors={[colors.primary + '14', colors.primary + '03']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.resultBg}
              />
              <Text style={styles.resultLabel}>Converted Value</Text>
              <Text style={styles.resultValue}>{formattedResult}</Text>
              <Text style={styles.resultCaption}>
                {inputValue || '0'} {UNIT_LABELS[fromUnit]} = {formattedResult} {UNIT_LABELS[toUnit]}
              </Text>
            </View>
          </AnimatedEntrance>

          <View style={styles.referenceCard}>
            <Text style={styles.referenceTitle}>Quick Reference</Text>
            <Text style={styles.referenceText}>1 Ropani = 16 Aana = 64 Paisa = 256 Daam ≈ 508.74 m²</Text>
            <Text style={styles.referenceText}>1 Bigha = 20 Kattha = 400 Dhur ≈ 6772.63 m²</Text>
            <Text style={styles.referenceText}>1 Acre ≈ 43,560 sq ft · 1 Hectare = 10,000 m²</Text>
          </View>
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
  resultBg: {
    ...({ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const),
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
    gap: 16,
    ...elevation('md'),
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
  unitGroup: {
    gap: 10,
  },
  unitGroupLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  unitSubGroup: {
    gap: 6,
  },
  unitSubLabel: {
    color: colors.textLight,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  unitChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unitChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  unitChipTextActive: {
    color: '#FFFFFF',
  },
  resultCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    borderRadius: radii.lg,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
    ...elevation('md'),
  },
  resultLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  resultValue: {
    color: colors.primary,
    fontSize: 34,
    fontWeight: '900',
  },
  resultCaption: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  referenceCard: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 14,
    gap: 4,
  },
  referenceTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  referenceText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
}));
