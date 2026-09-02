import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme/tokens';
import Icon, { type IconName } from './Icon';

interface Props {
  title: string;
  subtitle?: string;
  icon?: IconName;
}

export default function ScreenHeader({ title, subtitle, icon }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        {icon && <Icon name={icon} size={20} color={colors.accent} />}
        <Text style={typography.screenTitle}>{title}</Text>
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4, marginBottom: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  subtitle: { fontSize: 13, color: colors.textSecondary },
});
