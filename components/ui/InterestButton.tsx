import React from 'react';
import { Check, Plus } from 'lucide-react-native';
import { PressableScale } from './PressableScale';

interface InterestButtonProps {
  interested: boolean;
  onToggle: () => void;
  color: string;
  size?: number;
}

/**
 * Small "+" toggle for marking a job/opportunity/organization as interested.
 * Turns into a filled checkmark once selected.
 */
export function InterestButton({ interested, onToggle, color, size = 30 }: InterestButtonProps) {
  return (
    <PressableScale
      onPress={onToggle}
      haptic
      accessibilityRole="button"
      accessibilityLabel={interested ? 'Remove from interested' : 'Mark as interested'}
      accessibilityState={{ selected: interested }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: interested ? color : 'transparent',
        borderWidth: 1.5,
        borderColor: color,
        flexShrink: 0,
      }}
    >
      {interested ? (
        <Check size={Math.round(size * 0.55)} color="#fff" />
      ) : (
        <Plus size={Math.round(size * 0.6)} color={color} />
      )}
    </PressableScale>
  );
}
