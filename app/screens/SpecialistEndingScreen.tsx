import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/RootStack';
import { useGameStore } from '../store/useGameStore';
import { selectCharacterSummary, formatDuration } from '../domain/state/selectors';
import { computeCycleScore, resolveCycleEnding, type CycleOutcome } from '../domain/careerReport/behaviorProfile';

type Props = NativeStackScreenProps<RootStackParamList, 'SpecialistEnding'>;

// Phase 10 §17 — deliberately not melodramatic. Variant chosen by the
// same cycle outcome the Career Report uses (§12), never a separate
// invented axis — "how you got here" colors the same three lines a
// little, nothing more.
const VARIANTS: Record<CycleOutcome, string[]> = {
  broke_cycle: [
    'Sistem güncellendi. Adının yanındaki unvan değişti.',
    'Telefonun çalmaya devam ediyor. Bu kez açan sen değilsin her seferinde.',
  ],
  mixed: [
    'Sistem güncellendi. Adının yanındaki unvan değişti.',
    'Telefonun çalmaya devam ediyor.',
  ],
  repeated_cycle: [
    'Sistem güncellendi. Adının yanındaki unvan değişti.',
    'Telefonun çalmaya devam ediyor. Şimdi arayan sensin bazen.',
  ],
};

export default function SpecialistEndingScreen({ navigation }: Props) {
  const gameState = useGameStore((s) => s.gameState);

  if (!gameState) {
    return <View style={styles.container} />;
  }

  const character = selectCharacterSummary(gameState);
  const cycleScore = computeCycleScore(gameState.behaviorStats);
  const cycleEnding = resolveCycleEnding(cycleScore);
  const lines = VARIANTS[cycleEnding.outcome];

  return (
    <View style={styles.container} testID="specialist-ending-screen">
      <Text style={styles.heading}>UZMAN OLDUN</Text>
      <Text style={styles.name}>Dr. {character.name}</Text>
      <Text style={styles.subline}>{formatDuration(gameState.career.residencyWeek)}</Text>

      <View style={styles.card}>
        {lines.map((line, i) => (
          <Text key={i} style={styles.cardLine}>{line}</Text>
        ))}
      </View>

      <Pressable
        style={styles.button}
        onPress={() => navigation.replace('CareerReport')}
        accessibilityRole="button"
        testID="btn-career-report"
      >
        <Text style={styles.buttonText}>KARİYER KARNESİNİ GÖR</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 24 },
  heading: { fontSize: 20, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  subline: { fontSize: 13, color: '#888' },
  card: { width: '100%', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 16, marginTop: 20, gap: 4 },
  cardLine: { fontSize: 13, color: '#444', lineHeight: 19 },
  button: { backgroundColor: '#222', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 8, marginTop: 28 },
  buttonText: { color: '#fff', fontWeight: '600', letterSpacing: 0.5 },
});
