import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeftRight, Scale, Thermometer } from 'lucide-react-native';
import { colors, createThemedStyles } from '@/constants/colors';

type ConversionMode = 'length' | 'weight' | 'temperature';

const LENGTH_UNITS = ['mm', 'cm', 'm', 'km', 'in', 'ft'] as const;
const WEIGHT_UNITS = ['g', 'kg', 'lb', 'oz'] as const;
const TEMPERATURE_UNITS = ['C', 'F', 'K'] as const;

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function convertLength(value: number, from: string, to: string): number {
  const metersMap: Record<string, number> = {
    mm: 0.001,
    cm: 0.01,
    m: 1,
    km: 1000,
    in: 0.0254,
    ft: 0.3048,
  };
  return (value * metersMap[from]) / metersMap[to];
}

function convertWeight(value: number, from: string, to: string): number {
  const kgMap: Record<string, number> = {
    g: 0.001,
    kg: 1,
    lb: 0.45359237,
    oz: 0.028349523125,
  };
  return (value * kgMap[from]) / kgMap[to];
}

function toCelsius(value: number, from: string): number {
  if (from === 'C') return value;
  if (from === 'F') return (value - 32) * (5 / 9);
  return value - 273.15;
}

function fromCelsius(value: number, to: string): number {
  if (to === 'C') return value;
  if (to === 'F') return (value * 9) / 5 + 32;
  return value + 273.15;
}

function convertTemperature(value: number, from: string, to: string): number {
  return fromCelsius(toCelsius(value, from), to);
}

export default function MeasurementConverterScreen() {
  const [mode, setMode] = useState<ConversionMode>('length');
  const [inputValue, setInputValue] = useState('1');
  const [fromUnit, setFromUnit] = useState('cm');
  const [toUnit, setToUnit] = useState('m');

  const availableUnits = mode === 'length' ? LENGTH_UNITS : mode === 'weight' ? WEIGHT_UNITS : TEMPERATURE_UNITS;

  const result = useMemo(() => {
    const value = toNumber(inputValue);
    if (mode === 'length') return convertLength(value, fromUnit, toUnit);
    if (mode === 'weight') return convertWeight(value, fromUnit, toUnit);
    return convertTemperature(value, fromUnit, toUnit);
  }, [fromUnit, inputValue, mode, toUnit]);

  const formattedResult = Number.isFinite(result) ? result.toFixed(mode === 'temperature' ? 1 : 2) : '--';

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <ArrowLeftRight size={22} color={colors.surface} />
          </View>
          <Text style={styles.title}>Measurement Conversion</Text>
          <Text style={styles.subtitle}>Switch between length, weight, and temperature values.</Text>
        </View>

        <View style={styles.segmentRow}>
          {([
            { key: 'length', label: 'Length', icon: ArrowLeftRight },
            { key: 'weight', label: 'Weight', icon: Scale },
            { key: 'temperature', label: 'Temperature', icon: Thermometer },
          ] as const).map((item) => {
            const active = mode === item.key;
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.segmentButton, active && styles.segmentButtonActive]}
                onPress={() => {
                  setMode(item.key);
                  if (item.key === 'length') {
                    setFromUnit('cm');
                    setToUnit('m');
                  } else if (item.key === 'weight') {
                    setFromUnit('kg');
                    setToUnit('lb');
                  } else {
                    setFromUnit('C');
                    setToUnit('F');
                  }
                }}
              >
                <Icon size={16} color={active ? colors.surface : colors.primary} />
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

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

          <View style={styles.unitsRow}>
            <View style={styles.unitGroup}>
              <Text style={styles.unitGroupLabel}>From</Text>
              <View style={styles.unitChipWrap}>
                {availableUnits.map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[styles.unitChip, fromUnit === unit && styles.unitChipActive]}
                    onPress={() => {
                      setFromUnit(unit);
                      if (unit === toUnit) {
                        const nextUnit = availableUnits.find((candidate) => candidate !== unit) || unit;
                        setToUnit(nextUnit);
                      }
                    }}
                  >
                    <Text style={[styles.unitChipText, fromUnit === unit && styles.unitChipTextActive]}>{unit}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.unitGroup}>
              <Text style={styles.unitGroupLabel}>To</Text>
              <View style={styles.unitChipWrap}>
                {availableUnits.map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[styles.unitChip, toUnit === unit && styles.unitChipActive]}
                    onPress={() => setToUnit(unit)}
                  >
                    <Text style={[styles.unitChipText, toUnit === unit && styles.unitChipTextActive]}>{unit}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Converted Value</Text>
          <Text style={styles.resultValue}>{formattedResult}</Text>
          <Text style={styles.resultCaption}>
            {inputValue || '0'} {fromUnit} = {formattedResult} {toUnit}
          </Text>
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
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  segmentTextActive: {
    color: colors.surface,
  },
  inputCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    gap: 16,
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
  unitsRow: {
    gap: 14,
  },
  unitGroup: {
    gap: 8,
  },
  unitGroupLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
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
    color: colors.surface,
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
    fontSize: 30,
    fontWeight: '900',
  },
  resultCaption: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
}));