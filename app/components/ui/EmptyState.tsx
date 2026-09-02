import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../../theme/tokens';
import Icon, { type IconName } from './Icon';

interface Props {
  icon?: IconName;
  text: string;
}

// Section 52 — a deliberate empty state, never a blank rectangle.
export default function EmptyState({ icon, text }: Props) {
  return (
    <View style={styles.container}>
      {icon && <Icon name={icon} size={22} color={colors.textMuted} />}
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  text: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
});
