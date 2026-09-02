import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { ProfileStackParamList } from '../navigation/ProfileStackNavigator';
import { useGameStore } from '../store/useGameStore';
import { selectCharacterSummary, selectResidencyProgress, selectResidencySummary } from '../domain/state/selectors';
import { resolveOutfitContext } from '../domain/avatar/outfitResolver';
import { resolveExpression } from '../domain/avatar/expressionResolver';
import AvatarRenderer from '../components/avatar/AvatarRenderer';
import Card from '../components/ui/Card';
import ProgressBar from '../components/ui/ProgressBar';
import Icon, { type IconName } from '../components/ui/Icon';
import { colors, spacing, typography } from '../theme/tokens';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileHome'>;

function formatMoney(amount: number): string {
  return `${amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} TL`;
}

const SENIORITY_LABEL: Record<string, string> = {
  none: 'Aday', comez: 'Çömez', orta: 'Orta Kıdem', kidemli: 'Kıdemli Asistan',
};

const MENU_ITEMS: { route: keyof ProfileStackParamList; label: string; icon: IconName }[] = [
  { route: 'CareerStatistics', label: 'İstatistikler', icon: 'achievements' },
  { route: 'Achievements', label: 'Başarımlar', icon: 'achievements' },
  { route: 'Settings', label: 'Ayarlar', icon: 'settings' },
];

export default function ProfileScreen({ navigation }: Props) {
  const gameState = useGameStore((s) => s.gameState);

  if (!gameState) {
    return (
      <View style={styles.container}>
        <Text style={typography.screenTitle}>Profil</Text>
        <Text style={styles.subtitle}>Karakter bilgisi ve istatistikler buraya gelecek</Text>
      </View>
    );
  }

  const characterSummary = selectCharacterSummary(gameState);
  const residencySummary = selectResidencySummary(gameState);
  const progress = selectResidencyProgress(gameState);
  const outfit = resolveOutfitContext({ phase: gameState.career.phase, schedule: gameState.schedule });
  const expression = resolveExpression(gameState.resources);

  return (
    <ScrollView contentContainerStyle={styles.container} testID="profile-screen">
      <Card variant="profile">
        <View style={styles.headerRow}>
          <AvatarRenderer avatar={characterSummary.avatar} outfit={outfit} expression={expression} size={72} accessibilityLabel={`${characterSummary.name} avatarı`} />
          <View style={styles.headerText}>
            <Text style={styles.name}>Dr. {characterSummary.name}</Text>
            <Text style={styles.line}>{characterSummary.age} yaş — {characterSummary.hometown}</Text>
            <Text style={styles.lineMuted}>{characterSummary.backgroundLabel}</Text>
          </View>
        </View>
      </Card>

      {residencySummary && (
        <Card>
          <Text style={styles.sectionHeading}>KARİYER BİLGİLERİ</Text>
          <Text style={styles.line}>{SENIORITY_LABEL[gameState.career.seniorityStage]} — {residencySummary.branchName}</Text>
          <Text style={styles.lineMuted}>{residencySummary.hospitalName}, {residencySummary.cityName}</Text>
          {progress && (
            <View style={styles.progressBlock}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>Asistanlık İlerlemesi</Text>
                <Text style={styles.progressValue}>{progress.weeksCompleted}/{progress.totalWeeks} hafta</Text>
              </View>
              <ProgressBar value={progress.weeksCompleted} max={progress.totalWeeks} accessibilityLabel="Asistanlık ilerlemesi" />
            </View>
          )}
        </Card>
      )}

      <Card>
        <Text style={styles.sectionHeading}>BAKİYE</Text>
        <Text style={styles.balanceValue}>{formatMoney(gameState.resources.money)}</Text>
      </Card>

      <View style={styles.menu}>
        {MENU_ITEMS.map((item) => (
          <Pressable
            key={item.route}
            style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
            onPress={() => navigation.navigate(item.route)}
            accessibilityRole="button"
            testID={`profile-menu-${item.route}`}
          >
            <Icon name={item.icon} size={18} color={colors.accent} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Icon name="chevronRight" size={16} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.bgBase },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerText: { flex: 1, gap: 2 },
  name: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  line: { fontSize: 13, color: colors.textSecondary },
  lineMuted: { fontSize: 12, color: colors.textMuted },
  sectionHeading: { ...typography.sectionHeading, marginBottom: spacing.xs },
  progressBlock: { marginTop: spacing.sm, gap: 4 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  progressValue: { fontSize: 11, color: colors.textMuted },
  balanceValue: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  menu: { gap: spacing.sm },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceCard, borderRadius: 12, paddingVertical: 14, paddingHorizontal: spacing.md,
  },
  menuRowPressed: { backgroundColor: colors.surfaceCardAlt },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
});
