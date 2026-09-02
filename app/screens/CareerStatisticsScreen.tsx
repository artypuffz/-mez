import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { ProfileStackParamList } from '../navigation/ProfileStackNavigator';
import { useGameStore } from '../store/useGameStore';
import { selectCareerStatistics } from '../domain/state/selectors';
import Card from '../components/ui/Card';
import ScreenHeader from '../components/ui/ScreenHeader';
import Icon from '../components/ui/Icon';
import EmptyState from '../components/ui/EmptyState';
import { colors, spacing } from '../theme/tokens';

type Props = NativeStackScreenProps<ProfileStackParamList, 'CareerStatistics'>;

function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}${Math.abs(amount).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} TL`;
}

// Gameplay Expansion Part B §18 — every row here reads a real accumulating
// counter (see domain/state/selectors.ts's selectCareerStatistics). Never
// a scoring/ranking screen — no total score, just what happened.
export default function CareerStatisticsScreen({ navigation }: Props) {
  const gameState = useGameStore((s) => s.gameState);

  return (
    <ScrollView contentContainerStyle={styles.container} testID="career-statistics-screen">
      <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.backRow} testID="btn-back-statistics">
        <Icon name="back" size={18} color={colors.accent} />
        <Text style={styles.backText}>Profil</Text>
      </Pressable>
      <ScreenHeader title="Kariyer İstatistikleri" icon="achievements" />

      {!gameState ? (
        <EmptyState text="Henüz istatistik yok." />
      ) : (
        (() => {
          const stats = selectCareerStatistics(gameState);
          const rows: { label: string; value: string }[] = [
            { label: 'Asistanlık Haftası', value: `${stats.residencyWeek}` },
            { label: 'Toplam Nöbet', value: `${stats.totalOnCallShifts}` },
            { label: 'Hafta Sonu Nöbeti', value: `${stats.weekendOnCallShifts}` },
            { label: 'Ekstra Nöbet', value: `${stats.extraOnCallShifts}` },
            { label: 'Atlatılan Kriz', value: `${stats.crisisCount}` },
            { label: 'Krizden Dönüş', value: `${stats.crisisRecoveredCount}` },
            { label: 'Çözülen Olay', value: `${stats.eventsResolved}` },
            { label: 'Mobbing Olayı', value: `${stats.mobbingEventCount}` },
            { label: 'Harcama Aktivitesi', value: `${stats.spendingActivityCount}` },
            { label: 'Çömez Desteği', value: `${stats.juniorSupportCount}` },
            { label: 'En Düşük Bakiye', value: formatMoney(stats.lowestBalanceEver) },
          ];
          return (
            <Card>
              {rows.map((row) => (
                <View key={row.label} style={styles.row}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowValue}>{row.value}</Text>
                </View>
              ))}
            </Card>
          );
        })()
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.bgBase },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: 13, color: colors.textSecondary },
  rowValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
});
