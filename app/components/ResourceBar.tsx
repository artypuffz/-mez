import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme/tokens';
import Icon, { type IconName } from './ui/Icon';
import ProgressBar from './ui/ProgressBar';

export type ResourceKind = 'stress' | 'fatigue' | 'burnout' | 'health' | 'social';

interface Props {
  kind: ResourceKind;
  label: string;
  value: number;
  max?: number;
}

const RESOURCE_ICON: Record<ResourceKind, IconName> = {
  stress: 'stress',
  fatigue: 'fatigue',
  burnout: 'burnout',
  health: 'health',
  social: 'social',
};

const RESOURCE_COLOR: Record<ResourceKind, string> = {
  stress: colors.resourceStress,
  fatigue: colors.resourceFatigue,
  burnout: colors.resourceBurnout,
  health: colors.resourceHealth,
  social: colors.resourceSocial,
};

// §12 — a "good" direction differs per resource: stress/fatigue/burnout
// are bad-when-high, health/social are good-when-high. Status text is
// never the ONLY signal (the numeric value is always shown too).
const HIGH_IS_BAD: Record<ResourceKind, boolean> = {
  stress: true,
  fatigue: true,
  burnout: true,
  health: false,
  social: false,
};

function statusText(kind: ResourceKind, value: number): string {
  const bad = HIGH_IS_BAD[kind];
  const level = bad ? value : 100 - value;
  if (level >= 80) return bad ? 'Kritik' : 'Çok Düşük';
  if (level >= 60) return bad ? 'Yüksek' : 'Düşük';
  if (level >= 35) return 'Orta';
  return bad ? 'İyi' : 'İyi';
}

// Gameplay Expansion Part D section 12/§10 (Home) — a themed, iconed
// resource row. Always integer, always 0-100 clamped (the value comes in
// pre-clamped from applyResourceDelta, this component never re-clamps
// display-only — see the "integer-only UI" rule).
export default function ResourceBar({ kind, label, value, max = 100 }: Props) {
  const color = RESOURCE_COLOR[kind];
  const rounded = Math.round(value);
  return (
    <View style={styles.container} testID={`resource-${kind}`}>
      <View style={styles.headerRow}>
        <View style={styles.labelRow}>
          <Icon name={RESOURCE_ICON[kind]} size={16} color={color} />
          <Text style={styles.label}>{label}</Text>
        </View>
        <Text style={styles.value}>
          {rounded}<Text style={styles.valueMax}>/{max}</Text>
        </Text>
      </View>
      <ProgressBar value={rounded} max={max} color={color} accessibilityLabel={`${label}: ${rounded}/${max}`} />
      <Text style={[styles.status, { color }]}>{statusText(kind, rounded)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4, width: '100%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  value: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  valueMax: { fontSize: 11, fontWeight: '400', color: colors.textMuted },
  status: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
});
