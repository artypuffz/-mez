import { StyleSheet, View } from 'react-native';

import { colors } from '../../theme/tokens';

interface Props {
  value: number;
  max?: number;
  color?: string;
  trackColor?: string;
  height?: number;
  accessibilityLabel?: string;
}

// Bare bar primitive (no label) — ResourceBar/RelationshipBar/etc. wrap
// this with their own text. Kept separate so the accessibility
// progressbar role/value logic lives in exactly one place.
export default function ProgressBar({ value, max = 100, color = colors.accent, trackColor = colors.surfaceCardAlt, height = 8, accessibilityLabel }: Props) {
  const ratio = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max, now: value }}
    >
      <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color, borderRadius: height / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
