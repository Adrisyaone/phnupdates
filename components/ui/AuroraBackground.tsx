import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '@/constants/colors';
import { FloatingParticles } from './FloatingParticles';

interface AuroraBackgroundProps {
  style?: ViewStyle;
  /** Tint of the ambient orbs. */
  tint?: string;
  intensity?: number;
}

/**
 * Ambient, low-contrast depth layer for ordinary screens (non-hero). Places a
 * couple of very soft brand-tinted orbs behind the content so backgrounds feel
 * alive without distracting from the content. Sits at the very back.
 */
export function AuroraBackground({ style, tint = colors.primary, intensity = 1 }: AuroraBackgroundProps) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrap, style]}>
      <View
        style={[
          styles.blob,
          {
            top: -80,
            right: -60,
            backgroundColor: tint,
            opacity: 0.06 * intensity,
          },
        ]}
      />
      <View
        style={[
          styles.blob,
          {
            bottom: -100,
            left: -80,
            backgroundColor: colors.secondary,
            opacity: 0.05 * intensity,
          },
        ]}
      />
      <FloatingParticles color={tint} count={3} style={{ opacity: 0.5 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
  },
});
