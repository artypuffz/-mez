import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/RootStack';
import { useGameStore } from '../store/useGameStore';
import { buildCareerReport } from '../domain/careerReport/buildCareerReport';

type Props = NativeStackScreenProps<RootStackParamList, 'CareerReport'>;

function formatMoney(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}${Math.abs(amount).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} TL`;
}

// §8/§58 — the "reward screen": not just uzman oldun/olmadın, but the
// shape of the whole career. Shown from BOTH the specialist ending and
// every gameover reason (§7) — same builder, same screen.
export default function CareerReportScreen({ navigation }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  const resetGame = useGameStore((s) => s.resetGame);

  if (!gameState) {
    return <View style={styles.container} />;
  }

  const report = buildCareerReport(gameState);

  const handleNewCareer = async () => {
    await resetGame();
    navigation.replace('CharacterCreation');
  };
  const handleMainMenu = () => navigation.replace('MainMenu');

  return (
    <ScrollView contentContainerStyle={styles.container} testID="career-report-screen">
      <Text style={styles.heading}>ASİSTANLIK KARNESİ</Text>
      <Text style={styles.name}>Dr. {report.identity.name}</Text>
      {report.career.branchName && <Text style={styles.subline}>{report.career.branchName}</Text>}
      {report.career.hospitalName && <Text style={styles.subline}>{report.career.hospitalName}</Text>}
      <Text style={styles.subline}>Asistanlık süresi: {report.career.durationLabel}</Text>

      <View style={styles.card}>
        <Text style={styles.cardHeading}>{report.hierarchyBehavior.title}</Text>
        <Text style={styles.cardBody}>{report.hierarchyBehavior.body}</Text>
      </View>

      {report.social.flavorTags.length > 0 && (
        <View style={styles.tagRow}>
          {report.social.flavorTags.map((t) => (
            <View key={t.tag} style={styles.tag}>
              <Text style={styles.tagText}>{t.label}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.statsGrid}>
        <StatRow label="Toplam nöbet" value={String(report.onCall.lifetimeShifts)} />
        <StatRow label="Hafta sonu nöbeti" value={String(report.onCall.lifetimeWeekendShifts)} />
        <StatRow label="Ek nöbet" value={String(report.onCall.lifetimeExtraShifts)} />
        <StatRow label="En düşük bakiye" value={formatMoney(report.economy.lowestBalance)} />
        <StatRow label="Yaşanan kriz" value={String(report.crisis.total)} />
        <StatRow label="Atlatılan kriz" value={String(report.crisis.recovered)} />
        {report.social.missedSocialEvents > 0 && (
          <StatRow label="Kaçırılan sosyal etkinlik" value={String(report.social.missedSocialEvents)} />
        )}
      </View>

      {report.absurdStats.length > 0 && (
        <View style={styles.statsGrid}>
          {report.absurdStats.map((s) => (
            <StatRow key={s.label} label={s.label} value={String(s.count)} />
          ))}
        </View>
      )}

      {report.relationships.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardHeading}>İLİŞKİLER</Text>
          {report.relationships.map((r) => (
            <Text key={r.npcId} style={styles.cardBody}>{r.name} — {r.line}</Text>
          ))}
        </View>
      )}

      {report.notableEvents.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardHeading}>ÖNE ÇIKANLAR</Text>
          {report.notableEvents.map((e, i) => (
            <Text key={i} style={styles.cardBody}>Hafta {e.week} — {e.title}</Text>
          ))}
        </View>
      )}

      <View style={styles.resultCard}>
        <Text style={styles.resultTitle}>{report.finalTitle}</Text>
        <Text style={styles.resultLine}>ÇÖMEZ</Text>
        {report.career.branchName && <Text style={styles.resultLine}>{report.career.branchName}</Text>}
        <Text style={styles.resultLine}>{report.career.durationLabel}</Text>
        <Text style={styles.resultLine}>{report.onCall.lifetimeShifts} nöbet</Text>
        <Text style={styles.resultBadge}>{report.hierarchyBehavior.title}</Text>
      </View>

      <View style={styles.buttons}>
        <Pressable
          style={styles.button}
          onPress={handleNewCareer}
          accessibilityRole="button"
          testID="btn-new-career"
        >
          <Text style={styles.buttonText}>YENİ KARİYER</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleMainMenu}
          accessibilityRole="button"
          testID="btn-main-menu"
        >
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>ANA MENÜ</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', padding: 24, paddingBottom: 48, gap: 6 },
  heading: { fontSize: 18, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  subline: { fontSize: 13, color: '#888' },
  card: { width: '100%', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 16, marginTop: 16, gap: 4 },
  cardHeading: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  cardBody: { fontSize: 13, color: '#444', lineHeight: 19 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  tag: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 11, color: '#555' },
  statsGrid: { width: '100%', borderWidth: 1, borderColor: '#f0f0f0', borderRadius: 10, padding: 14, marginTop: 12, gap: 8 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: 12, color: '#999' },
  statValue: { fontSize: 12, fontWeight: '600', color: '#333' },
  resultCard: { width: '100%', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 18, marginTop: 20, alignItems: 'center', gap: 3 },
  resultTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  resultLine: { fontSize: 12, color: '#555' },
  resultBadge: { fontSize: 12, fontWeight: '700', marginTop: 8, letterSpacing: 0.5 },
  buttons: { gap: 12, width: 220, marginTop: 28 },
  button: { backgroundColor: '#222', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  buttonSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#222' },
  buttonText: { color: '#fff', fontWeight: '600', letterSpacing: 0.5 },
  buttonTextSecondary: { color: '#222' },
});
