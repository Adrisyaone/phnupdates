import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/colors';
import { gradients, radii } from '@/constants/theme';
import { FloatingParticles } from './FloatingParticles';
import { useReducedMotion } from './useReducedMotion';

interface GradientHeroProps {
  children: React.ReactNode;
  /** Gradient colour stops; defaults to the brand gradient. */
  colorsOverride?: readonly [string, string, ...string[]];
  style?: StyleProp<ViewStyle>;
  /** Show the drifting depth orbs. */
  particles?: boolean;
  /** Show the slow diagonal light sweep. */
  sheen?: boolean;
  rounded?: boolean;
}

/**
 * Signature animated hero surface: brand gradient + drifting depth orbs +
 * a slow light sweep. Gives an immersive, premium "3D feel" using only
 * gradients and native-driver transforms (no WebGL / heavy deps).
 */
export function GradientHero({
  children,
  colorsOverride,
  style,
  particles = true,
  sheen = true,
  rounded = false,
}: GradientHeroProps) {
  const reduced = useReducedMotion();
  const sweep = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!sheen || reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration: 4200,
          delay: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(2600),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, sheen, sweep]);

  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-260, 320] });

  return (
    <View style={[rounded && styles.rounded, styles.wrap, style]}>
      <LinearGradient
        colors={colorsOverride ?? gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {particles ? <FloatingParticles color="#FFFFFF" count={6} /> : null}

      {sheen && !reduced ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.sheen, { transform: [{ translateX }, { rotate: '18deg' }] }]}
        >
          <LinearGradient
            colors={['#FFFFFF00', '#FFFFFF55', '#FFFFFF00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: colors.primary,
  },
  rounded: {
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
  },
  content: {
    zIndex: 2,
  },
  sheen: {
    position: 'absolute',
    top: -40,
    bottom: -40,
    width: 120,
    zIndex: 1,
  },
});
