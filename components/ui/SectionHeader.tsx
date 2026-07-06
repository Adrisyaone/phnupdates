import React from 'react';
import { Text, TextStyle, View, ViewStyle } from 'react-native';
import { colors, createThemedStyles } from '@/constants/colors';
import { spacing } from '@/constants/theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Accent colour for the leading rail. */
  accent?: string;
  right?: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Standard section title with an accent rail and optional subtitle + trailing
 * action. Gives every screen the same clear content hierarchy.
 */
export function SectionHeader({ title, subtitle, accent = colors.primary, right, style }: SectionHeaderProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={[styles.rail, { backgroundColor: accent }]} />
      <View style={styles.textWrap}>
        <Text style={styles.title as TextStyle}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle as TextStyle}>{subtitle}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

const styles = createThemedStyles((colors) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rail: {
    width: 4,
    alignSelf: 'stretch',
    minHeight: 28,
    borderRadius: 999,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
}));
