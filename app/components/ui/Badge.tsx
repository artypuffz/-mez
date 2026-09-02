import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../../theme/tokens';
import Icon, { type IconName } from './Icon';

// Section 44 — text + color/icon, never color alone.
export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

interface Props {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
}

const TONE_COLORS: Record<BadgeTone, { bg: string; fg: string; border: string }> = {
  neutral: { bg: colors.surfaceCardAlt, fg: colors.textSecondary, border: colors.border },
  accent: { bg: colors.accentMuted, fg: colors.accent, border: colors.accent },
  success: { bg: colors.successMuted, fg: colors.success, border: colors.success },
  warning: { bg: colors.warningMuted, fg: colors.warning, border: colors.warning },
  danger: { bg: colors.dangerMuted, fg: colors.danger, border: colors.danger },
  info: { bg: colors.infoMuted, fg: colors.info, border: colors.info },
};

export default function Badge({ label, tone = 'neutral', icon }: Props) {
  const c = TONE_COLORS[tone];
  return (
    <View style={[styles.container, { backgroundColor: c.bg, borderColor: c.border }]}>
      {icon && <Icon name={icon} size={12} color={c.fg} />}
      <Text style={[styles.label, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 11, fontWeight: '700' },
});
