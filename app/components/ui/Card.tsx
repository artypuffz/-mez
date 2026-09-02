import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../../theme/tokens';

// Gameplay Expansion Part D section 39 — one card primitive, a handful of
// variants, reused everywhere instead of one-off borders per screen.
export type CardVariant = 'standard' | 'interactive' | 'warning' | 'critical' | 'success' | 'profile';

interface Props {
  variant?: CardVariant;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
}

const VARIANT_BORDER: Record<CardVariant, string> = {
  standard: colors.border,
  interactive: colors.border,
  warning: colors.warning,
  critical: colors.danger,
  success: colors.success,
  profile: colors.borderStrong,
};

const VARIANT_BG: Record<CardVariant, string> = {
  standard: colors.surfaceCard,
  interactive: colors.surfaceCard,
  warning: colors.warningMuted,
  critical: colors.dangerMuted,
  success: colors.successMuted,
  profile: colors.surfaceCardAlt,
};

export default function Card({ variant = 'standard', onPress, disabled, style, children, testID, accessibilityLabel }: Props) {
  const cardStyle = [
    styles.base,
    { borderColor: VARIANT_BORDER[variant], backgroundColor: VARIANT_BG[variant] },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [cardStyle, pressed && styles.pressed, disabled && styles.disabled]}
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
