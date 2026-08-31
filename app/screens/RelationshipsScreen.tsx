import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useGameStore } from '../store/useGameStore';
import { selectRelationshipRoster } from '../domain/npc/rosterSelectors';

// §25/§26 — name, role, and a derived label only. Never a raw
// trust/friendship/grudge number.
export default function RelationshipsScreen() {
  const gameState = useGameStore((s) => s.gameState);

  if (!gameState || gameState.career.phase !== 'residency') {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>İlişkiler</Text>
        <Text style={styles.subtitle}>Asistanlık başladığında ilişkilerin burada görünecek.</Text>
      </View>
    );
  }

  const rows = selectRelationshipRoster(gameState);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>İlişkiler</Text>
      {rows.map((row) => (
        <View key={row.npcId} style={styles.card}>
          <Text style={styles.name}>{row.name}</Text>
          <Text style={styles.role}>{row.roleLabel}</Text>
          <Text style={styles.label}>"{row.label}"</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 10 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center' },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 14, gap: 2 },
  name: { fontSize: 15, fontWeight: '700' },
  role: { fontSize: 12, color: '#666' },
  label: { fontSize: 13, color: '#333', marginTop: 4 },
});
