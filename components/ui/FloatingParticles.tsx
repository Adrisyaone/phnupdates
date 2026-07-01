import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import { useReducedMotion } from './useReducedMotion';

interface Orb {
  size: number;
  left: string;
  top: string;
  color: string;
  opacity: number;
  driftX: number;
  driftY: number;
  duration: number;
  delay: number;
}

interface FloatingParticlesProps {
  /** Base tint for the orbs (defaults to white for use on gradients). */
  color?: string;
  /** Number of drifting orbs. */
  count?: number;
  style?: ViewStyle;
  /** Softens/removes motion (also auto-disabled when reduce-motion is on). */
  animated?: boolean;
}

/**
 * Depth layer of softly drifting, glowing orbs. Rendered behind hero content
 * to give a subtle parallax "3D feel" without any WebGL dependency. Uses only
 * native-driver transforms/opacity so it stays at 60fps on device.
 */
export function FloatingParticles({
  color = '#FFFFFF',
  count = 6,
  style,
  animated = true,
}: FloatingParticlesProps) {
  const reduced = useReducedMotion();
  const active = animated && !reduced;

  const orbs = useMemo<Orb[]>(() => {
    const presets = [
      { size: 140, left: '-8%', top: '-20%', opacity: 0.16, driftX: 18, driftY: 14 },
      { size: 90, left: '72%', top: '8%', opacity: 0.14, driftX: -22, driftY: 20 },
      { size: 60, left: '18%', top: '55%', opacity: 0.12, driftX: 16, driftY: -18 },
      { size: 110, left: '55%', top: '58%', opacity: 0.1, driftX: -14, driftY: -16 },
      { size: 46, left: '40%', top: '-8%', opacity: 0.18, driftX: 20, driftY: 22 },
      { size: 72, left: '85%', top: '62%', opacity: 0.12, driftX: -18, driftY: 14 },
      { size: 54, left: '5%', top: '30%', opacity: 0.14, driftX: 14, driftY: 18 },
      { size: 96, left: '30%', top: '20%', opacity: 0.09, driftX: -16, driftY: -20 },
    ];
    return presets.slice(0, count).map((p, i) => ({
      ...p,
      color,
      duration: 5200 + i * 900,
      delay: i * 350,
    }));
  }, [color, count]);

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.container, style]}>
      {orbs.map((orb, i) => (
        <Orbit key={i} orb={orb} active={active} />
      ))}
    </View>
  );
}

function Orbit({ orb, active }: { orb: Orb; active: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      progress.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: orb.duration,
          delay: orb.delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: orb.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, orb.delay, orb.duration, progress]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, orb.driftX] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, orb.driftY] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const opacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [orb.opacity, orb.opacity * 1.6],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: orb.left as any,
        top: orb.top as any,
        width: orb.size,
        height: orb.size,
        borderRadius: orb.size / 2,
        backgroundColor: orb.color,
        opacity: active ? opacity : orb.opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});
