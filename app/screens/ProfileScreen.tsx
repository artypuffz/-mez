import { StyleSheet, Text, View } from 'react-native';

import { useGameStore } from '../store/useGameStore';
import { selectCharacterSummary, selectResidencySummary } from '../domain/state/selectors';

function formatMoney(amount: number): string {
  return `${amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} TL`;
}

export default function ProfileScreen() {
  const gameState = useGameStore((s) => s.gameState);

  if (!gameState) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Profil</Text>
        <Text style={styles.subtitle}>Karakter bilgisi ve istatistikler buraya gelecek</Text>
      </View>
    );
  }

  const characterSummary = selectCharacterSummary(gameState);
  const residencySummary = selectResidencySummary(gameState);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profil</Text>
      <Text style={styles.name}>Dr. {characterSummary.name}</Text>
      <Text style={styles.line}>{characterSummary.age} yaş — {characterSummary.hometown}</Text>
      <Text style={styles.line}>{characterSummary.backgroundLabel}</Text>

      {residencySummary && (
        <View style={styles.card}>
          <Text style={styles.line}>{residencySummary.branchName}</Text>
          <Text style={styles.line}>{residencySummary.hospitalName}, {residencySummary.cityName}</Text>
          <Text style={styles.line}>
            Yıl {residencySummary.residencyYear} — Hafta {residencySummary.residencyWeek}
          </Text>
        </View>
      )}

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Bakiye</Text>
        <Text style={styles.balanceValue}>{formatMoney(gameState.resources.money)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: 24, gap: 6 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666' },
  name: { fontSize: 16, fontWeight: '600' },
  line: { fontSize: 14, color: '#444' },
  card: { width: '100%', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 14, marginTop: 12, gap: 2 },
  balanceCard: { width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 16, marginTop: 16, alignItems: 'center' },
  balanceLabel: { fontSize: 12, color: '#999', letterSpacing: 0.5 },
  balanceValue: { fontSize: 22, fontWeight: '700', marginTop: 4 },
});
