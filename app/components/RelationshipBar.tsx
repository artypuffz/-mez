import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme/tokens';
import type { RelationshipLabel } from '../domain/npc/relationshipLabel';
import ProgressBar from './ui/ProgressBar';

interface Props {
  label: RelationshipLabel;
  score: number;
  compact?: boolean;
}

const LABEL_COLOR: Record<RelationshipLabel, string> = {
  'Gergin': colors.danger,
  'Mesafeli': colors.warning,
  'Nötr': colors.textSecondary,
  'Aranız iyi': colors.info,
  'Yakın': colors.success,
};

// Gameplay Expansion Part B §7 — a finer-grained 0-100 PRESENTATION value
// under the coarse label ("İyi ████████░░ 72"), never a substitute for it
// (the label is still the first thing read). Purely derived — see
// deriveRelationshipScore — never a second relationship model.
export default function RelationshipBar({ label, score, compact }: Props) {
  const color = LABEL_COLOR[label];
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, { color }, compact && styles.labelCompact]}>{label}</Text>
        {!compact && <Text style={styles.score}>{score}</Text>}
      </View>
      <ProgressBar value={score} max={100} color={color} height={compact ? 5 : 7} accessibilityLabel={`İlişki: ${label}, ${score}/100`} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 3, width: '100%' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 12, fontWeight: '700' },
  labelCompact: { fontSize: 11 },
  score: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
});
