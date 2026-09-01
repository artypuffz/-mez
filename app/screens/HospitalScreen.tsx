import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useGameStore } from '../store/useGameStore';
import { selectHospitalRoster, selectNpcDetail } from '../domain/npc/rosterSelectors';
import { selectResidencySummary } from '../domain/state/selectors';

export default function HospitalScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);

  if (!gameState || gameState.career.phase !== 'residency') {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Hastane</Text>
        <Text style={styles.subtitle}>Asistanlık başladığında klinik ekibi burada görünecek.</Text>
      </View>
    );
  }

  const residencySummary = selectResidencySummary(gameState);
  const groups = selectHospitalRoster(gameState);
  const detail = selectedNpcId ? selectNpcDetail(gameState, selectedNpcId) : null;
  const schedule = gameState.onCall.schedule;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Hastane</Text>
      {residencySummary && (
        <Text style={styles.subtitle}>
          {residencySummary.hospitalName} — {residencySummary.branchName}
        </Text>
      )}

      {schedule && (
        <View style={styles.onCallSummary}>
          <Text style={styles.onCallSummaryLine}>Bu ay: {schedule.player.totalShifts} nöbet</Text>
          <Text style={styles.onCallSummaryLine}>{schedule.player.weekendShifts} hafta sonu</Text>
        </View>
      )}

      {detail && (
        <Pressable style={styles.detailCard} onPress={() => setSelectedNpcId(null)} accessibilityRole="button">
          <Text style={styles.detailName}>{detail.name}</Text>
          <Text style={styles.detailRole}>{detail.roleLabel}</Text>
          <Text style={styles.detailLine}>{detail.tenureLabel}</Text>
          <Text style={styles.detailLine}>"{detail.relationshipLabel}"</Text>
          <Text style={styles.detailHint}>Kapatmak için dokun</Text>
        </Pressable>
      )}

      {groups.map((group) => (
        <View key={group.label} style={styles.group}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          {group.npcs.map((npc) => (
            <Pressable
              key={npc.id}
              accessibilityRole="button"
              style={styles.row}
              onPress={() => setSelectedNpcId(npc.id)}
            >
              <Text style={styles.rowName}>{npc.identity.name}</Text>
            </Pressable>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'stretch', padding: 24, gap: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 16 },
  onCallSummary: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  onCallSummaryLine: { fontSize: 13, color: '#333', fontWeight: '600' },
  group: { marginTop: 16 },
  groupLabel: { fontSize: 12, fontWeight: '700', color: '#999', letterSpacing: 0.5, marginBottom: 6 },
  row: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  rowName: { fontSize: 14, color: '#222' },
  detailCard: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    gap: 4,
    backgroundColor: '#fafafa',
  },
  detailName: { fontSize: 16, fontWeight: '700' },
  detailRole: { fontSize: 13, color: '#555' },
  detailLine: { fontSize: 13, color: '#333' },
  detailHint: { fontSize: 11, color: '#999', marginTop: 6 },
});
