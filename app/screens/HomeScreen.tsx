import { StyleSheet, Text, View } from 'react-native';

import { useGameStore } from '../store/useGameStore';
import { selectCharacterSummary, selectResidencySummary } from '../domain/state/selectors';

export default function HomeScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const characterSummary = gameState ? selectCharacterSummary(gameState) : null;
  const residencySummary = gameState ? selectResidencySummary(gameState) : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ÇÖMEZ</Text>
      {characterSummary && residencySummary ? (
        <>
          <Text style={styles.subtitle}>
            Dr. {characterSummary.name} — {residencySummary.branchName}
          </Text>
          <Text style={styles.subtitle}>
            {residencySummary.hospitalName} — {residencySummary.cityName}
          </Text>
          <Text style={styles.week}>
            Asistanlık: Yıl {residencySummary.residencyYear} — Hafta {residencySummary.residencyWeek}
          </Text>
        </>
      ) : (
        <Text style={styles.subtitle}>Ana Sayfa — event feed buraya gelecek</Text>
      )}
      <Text style={styles.note}>Haftalık simülasyon Faz 4'te gelecek.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 24 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#444', textAlign: 'center' },
  week: { fontSize: 13, color: '#666', marginTop: 6 },
  note: { fontSize: 12, color: '#999', marginTop: 16 },
});
