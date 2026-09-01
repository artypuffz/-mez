import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/RootStack';
import { useGameStore } from '../store/useGameStore';
import { selectCharacterSummary, selectGameOverSummary } from '../domain/state/selectors';
import type { GameOverReason } from '../domain/state/types';

type Props = NativeStackScreenProps<RootStackParamList, 'GameOver'>;

// Phase 9 §36 — a few deterministic, reason-specific deadpan variants.
// Never a moral judgment on the reason itself (§17/§58) — the career
// simply ended this way; the player should be able to understand WHY
// without being told it was a failure.
const REASON_TEXT: Record<GameOverReason, { heading: string; body: (durationLabel: string) => string[] }> = {
  resigned_burnout: {
    heading: 'İSTİFA ETTİN',
    body: (d) => [
      `${d} sürdü.`,
      'Bir sabah alarm çaldı. Alarmı kapattın. Sonra telefonu kapattın. Bu kez geri açmadın.',
    ],
  },
  resigned_career: {
    heading: 'İSTİFA ETTİN',
    body: (d) => [
      `${d} sürdü.`,
      'Bir pazartesi sabahı dilekçeyi gerçekten verdin. Telefonun o gün biraz daha az çaldı.',
    ],
  },
  financial_collapse: {
    heading: 'İŞİ BIRAKTIN',
    body: (d) => [
      `${d} sürdü.`,
      'Ay sonunda hesabı kontrol ettin. Hesap da seni kontrol etti. Bu kez farklı bir karar verdin.',
    ],
  },
  program_left: {
    heading: 'PROGRAMDAN AYRILDIN',
    body: (d) => [`${d} sürdü.`],
  },
  dismissed: {
    heading: 'GÖREVE SON VERİLDİ',
    body: (d) => [`${d} sürdü.`],
  },
  // Phase 10 §5 — not framed as worse than resigning; two attempts is
  // the MVP cap, not a verdict on the whole career that preceded it.
  specialist_exam_failed: {
    heading: 'UZMANLIK SINAVI',
    body: (d) => [
      `${d} sürdü.`,
      'İkinci deneme de olmadı. Kağıt üstünde asistanlık burada bitiyor.',
    ],
  },
};

function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}${Math.abs(amount).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} TL`;
}

export default function GameOverScreen({ navigation }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  const resetGame = useGameStore((s) => s.resetGame);

  const summary = gameState ? selectGameOverSummary(gameState) : null;
  const character = gameState ? selectCharacterSummary(gameState) : null;

  if (!summary || !character) {
    // Reached with no gameOver state (e.g. a direct deep-link) — nothing
    // sensible to show, so just don't render a broken screen.
    return <View style={styles.container} />;
  }

  const reasonText = REASON_TEXT[summary.reason];

  const handleNewGame = async () => {
    await resetGame();
    navigation.replace('CharacterCreation');
  };

  const handleMainMenu = () => navigation.replace('MainMenu');

  return (
    <View style={styles.container} testID="gameover-screen">
      <Text style={styles.heading}>ASİSTANLIK BİTTİ</Text>
      <Text style={styles.name}>Dr. {character.name}</Text>
      {summary.branchName && <Text style={styles.subline}>{summary.branchName}</Text>}
      <Text style={styles.subline}>{summary.durationLabel}</Text>

      <View style={styles.reasonCard}>
        <Text style={styles.reasonHeading} testID="gameover-reason">{reasonText.heading}</Text>
        {reasonText.body(summary.durationLabel).map((line, i) => (
          <Text key={i} style={styles.reasonLine}>{line}</Text>
        ))}
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>En düşük bakiye</Text>
          <Text style={styles.statValue}>{formatMoney(summary.stats.lowestBalance)}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Yaşanan kriz</Text>
          <Text style={styles.statValue}>{summary.stats.crisisCount}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Atlatılan kriz</Text>
          <Text style={styles.statValue}>{summary.stats.crisisRecoveredCount}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Mobbing olayı</Text>
          <Text style={styles.statValue}>{summary.stats.mobbingEventCount}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Junior'a destek</Text>
          <Text style={styles.statValue}>{summary.stats.juniorSupportCount}</Text>
        </View>
      </View>

      <View style={styles.buttons}>
        <Pressable
          style={styles.button}
          onPress={() => navigation.navigate('CareerReport')}
          accessibilityRole="button"
          testID="btn-career-report"
        >
          <Text style={styles.buttonText}>KARİYER KARNESİNİ GÖR</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleNewGame}
          accessibilityRole="button"
          testID="btn-gameover-new-game"
        >
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>YENİ OYUN</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleMainMenu}
          accessibilityRole="button"
          testID="btn-gameover-main-menu"
        >
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>ANA MENÜ</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 24, paddingVertical: 32 },
  heading: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  subline: { fontSize: 13, color: '#888' },
  reasonCard: { width: '100%', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 16, marginTop: 20, gap: 4 },
  reasonHeading: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  reasonLine: { fontSize: 13, color: '#444', lineHeight: 19 },
  statsGrid: { width: '100%', borderWidth: 1, borderColor: '#f0f0f0', borderRadius: 10, padding: 14, marginTop: 16, gap: 8 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: 12, color: '#999' },
  statValue: { fontSize: 12, fontWeight: '600', color: '#333' },
  buttons: { gap: 12, width: 220, marginTop: 28 },
  button: { backgroundColor: '#222', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  buttonSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#222' },
  buttonText: { color: '#fff', fontWeight: '600', letterSpacing: 0.5 },
  buttonTextSecondary: { color: '#222' },
});
