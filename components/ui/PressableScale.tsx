import React, { useRef } from 'react';
import { Animated, Platform, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { useReducedMotion } from './useReducedMotion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale applied while pressed (default 0.96). */
  activeScale?: number;
  /** Fire a light haptic on press-in (native only). */
  haptic?: boolean;
}

/**
 * Tappable wrapper that gives instant spring-based scale feedback on press —
 * the "scale-feedback" motion guideline. Restores on release, honours
 * reduce-motion, and keeps a full 44pt touch target via hitSlop.
 *
 * The passed `style` (including layout props like flex/width/margin) is applied
 * directly to the Pressable so it participates in parent layout exactly like a
 * TouchableOpacity would — the scale transform lives on the same element.
 */
export function PressableScale({
  children,
  style,
  activeScale = 0.96,
  haptic = false,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (to: number) => {
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      damping: 18,
      stiffness: 320,
      mass: 0.7,
    }).start();
  };

  return (
    <AnimatedPressable
      disabled={disabled}
      hitSlop={6}
      style={[style as any, { transform: [{ scale }], opacity: disabled ? 0.5 : 1 }]}
      onPressIn={(e) => {
        if (!reduced && !disabled) animateTo(activeScale);
        if (haptic && Platform.OS !== 'web' && !disabled) {
          import('expo-haptics')
            .then((H) => H.impactAsync(H.ImpactFeedbackStyle.Light))
            .catch(() => {});
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduced) animateTo(1);
        onPressOut?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
