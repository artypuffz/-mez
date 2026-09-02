import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, touchTarget } from '../../theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'compact';

interface Props {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

// Section 43 — one button primitive with clear pressed/disabled states and
// a guaranteed comfortable touch target, reused everywhere instead of a
// new Pressable+StyleSheet pair per screen.
export default function Button({ label, onPress, variant = 'primary', disabled, loading, testID, accessibilityLabel }: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        variant === 'compact' && styles.compact,
        VARIANT_STYLE[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled }}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.accent : colors.textOnAccent} size="small" />
      ) : (
        <Text style={[styles.label, TEXT_STYLE[variant]]}>{label}</Text>
      )}
    </Pressable>
  );
}

const VARIANT_STYLE = StyleSheet.create({
  primary: { backgroundColor: colors.accent, borderWidth: 0 },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.borderStrong },
  destructive: { backgroundColor: colors.danger, borderWidth: 0 },
  compact: { backgroundColor: colors.accentMuted, borderWidth: 1, borderColor: colors.accent },
});

const TEXT_STYLE = StyleSheet.create({
  primary: { color: colors.textOnAccent },
  secondary: { color: colors.textPrimary },
  destructive: { color: colors.textOnAccent },
  compact: { color: colors.accent },
});

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget.minHeight,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  compact: {
    width: 'auto',
    paddingHorizontal: spacing.lg,
    minHeight: 36,
    paddingVertical: 8,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
  label: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
});
