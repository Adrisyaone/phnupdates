import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Tracks the OS "reduce motion" accessibility setting so animations can be
 * softened or disabled. Every animated component in the kit honours this.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((value) => {
        if (mounted) setReduced(!!value);
      })
      .catch(() => {});

    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value) => {
      setReduced(!!value);
    });

    return () => {
      mounted = false;
      // RN >= 0.65 returns a subscription with remove(); guard for web.
      // @ts-ignore - older signatures
      sub?.remove?.();
    };
  }, []);

  return reduced;
}
