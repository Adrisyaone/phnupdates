import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/colors';
import { elevation, Elevation, radii } from '@/constants/theme';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  level?: Elevation;
  /** Subtle top-to-bottom surface gradient for depth. */
  gradient?: boolean;
  /** Accent colour for a coloured left rail / border tint. */
  accent?: string;
  radius?: number;
  padded?: boolean;
}

/**
 * Consistent elevated surface used across the app. Optional depth gradient and
 * accent rail. Keeps shadow/radius tokens uniform so cards feel like one family.
 */
export function GlassCard({
  children,
  style,
  level = 'md',
  gradient = false,
  accent,
  radius = radii.md,
  padded = true,
  ...rest
}: GlassCardProps) {
  const base: ViewStyle = {
    borderRadius: radius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: accent ? accent + '40' : colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    ...elevation(level),
  };

  return (
    <View style={[base, padded && styles.padded, style]} {...rest}>
      {gradient ? (
        <LinearGradient
          colors={[colors.surface, colors.surfaceAlt]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {accent ? <View style={[styles.rail, { backgroundColor: accent }]} /> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  padded: {
    padding: 14,
  },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
});
