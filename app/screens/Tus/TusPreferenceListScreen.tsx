import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootStack';
import { useGameStore } from '../../store/useGameStore';
import { selectCuratedTusOffer } from '../../domain/state/selectors';
import { getProgramHospitalName, type ResidencyProgram } from '../../domain/config/residencyPrograms';
import { getHospitalDefinition } from '../../domain/config/hospitals';
import { getBranchDefinition, getBranchOverallDifficulty } from '../../domain/config/branches';
import { getCityDefinition } from '../../domain/config/cities';
import { resolveEntryThreshold } from '../../domain/tus/resolveEntryThreshold';
import {
  PROFILE_DIMENSION_LABELS,
  getProfileLevelLabel,
  type ProfileDimension,
} from '../../domain/config/programProfileLabels';

type Props = NativeStackScreenProps<RootStackParamList, 'TusPreferenceList'>;

const DIMENSIONS: ProfileDimension[] = [
  'education',
  'workload',
  'onCallDensity',
  'academicEnvironment',
  'cityCost',
];

function difficultyLabel(program: ResidencyProgram): string {
  const overall = getBranchOverallDifficulty(getBranchDefinition(program.branchId));
  return `${overall.toFixed(1)} / 5`;
}

// TUS System Redesign §22 — real, structured, already-official-source
// institution info (HospitalDefinition.kind), safe to surface as-is; NOT
// a competitiveness signal, just what kind of institution it is.
function institutionKindLabel(program: ResidencyProgram): string | null {
  const kind = getHospitalDefinition(program.hospitalId).kind;
  if (kind === 'university') return 'Üniversite Hastanesi';
  if (kind === 'training_research_hospital') return 'Eğitim ve Araştırma Hastanesi';
  return null;
}

function ProgramCard({ program, onPick }: { program: ResidencyProgram; onPick: () => void }) {
  const branch = getBranchDefinition(program.branchId);
  const city = getCityDefinition(program.cityId);
  const kindLabel = institutionKindLabel(program);

  return (
    <View style={styles.card}>
      <Text style={styles.cardBranch}>{branch.name}</Text>
      <Text style={styles.cardTitle}>{getProgramHospitalName(program)}</Text>
      <Text style={styles.cardCity}>{city.name}{kindLabel ? ` · ${kindLabel}` : ''}</Text>

      <View style={styles.statRow}>
        {/* Android Device QA Hotfix 1, Issue 2 — neither minScore (Phase 3
            fictional-program balance numbers) nor gameplayEntryThreshold
            (deriveGameplayEntryThreshold) is official ÖSYM taban puanı, so
            this must never read "20XX ÖSYM taban puanı" or similar. Never
            expose the internal specialty/hospital/city tier machinery here
            (TUS System Redesign §22) — development/balancing data only. */}
        <Text style={styles.statLine}>
          Gerekli oyun puanı: {resolveEntryThreshold(program) !== undefined ? resolveEntryThreshold(program)!.toFixed(2) : 'Belirtilmemiş'}
        </Text>
        <Text style={styles.statLine}>Asistanlık: {difficultyLabel(program)}</Text>
      </View>

      <View style={styles.profileRows}>
        {DIMENSIONS.map((dim) => (
          <Text key={dim} style={styles.profileRow}>
            {PROFILE_DIMENSION_LABELS[dim]}: {getProfileLevelLabel(dim, program.visibleProfile[dim])}
          </Text>
        ))}
        {/* Phase 11 §27 — deliberately vague pre-selection: the procedural
            hospital culture modifier hasn't been rolled into a displayed
            number yet from the player's point of view, and showing an
            exact figure here would both misrepresent a real institution
            and spoil the per-playthrough randomization (§12). */}
        <Text style={styles.profileRow}>Hiyerarşik yapı: Branşa bağlı</Text>
      </View>

      {program.hintText && <Text style={styles.hint}>"Asistan yorumları: {program.hintText}"</Text>}

      <Pressable
        style={styles.pickButton}
        onPress={onPick}
        accessibilityRole="button"
        testID={`pick-program-${program.id}`}
      >
        <Text style={styles.pickButtonText}>TERCİH ET</Text>
      </Pressable>
    </View>
  );
}

export default function TusPreferenceListScreen({ navigation }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  // TUS System Redesign §13-23 — the player never sees the full eligible
  // pool; this is the curated, deterministic (per save + score) offer of
  // up to 7 real placement options. Curation only ever selects FROM the
  // authoritative eligible pool (selectAvailablePrograms) — it can never
  // surface a program the player doesn't actually qualify for.
  const programs = useMemo(() => (gameState ? selectCuratedTusOffer(gameState) : []), [gameState]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.heading}>TUS Tercihlerin</Text>
        {gameState?.career.tusScore !== undefined && (
          <Text style={styles.scoreLine}>TUS puanın: {gameState.career.tusScore.toFixed(2)}</Text>
        )}
        <Text style={styles.explanation} testID="tus-offer-explanation">
          Puanın ve kariyer seçeneklerine göre sana {programs.length} yerleştirme seçeneği sunuldu.
        </Text>
        <Text style={styles.disclaimer}>
          Bazı programlarda gerçek kurum, şehir ve uzmanlık dalı adları kullanılır. Çalışma koşulları, servis kültürü,
          NPC'ler ve olaylar oyun mekaniği amacıyla kurgulanmıştır; gerçek kişi veya kurumlara ilişkin bir
          değerlendirme değildir.
        </Text>
      </View>

      <FlatList
        data={programs}
        keyExtractor={(program) => program.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ProgramCard program={item} onPick={() => navigation.navigate('TusPreferenceConfirm', { programId: item.id })} />
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Şu anda uygun bir yerleştirme seçeneği bulunamadı.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 24, gap: 6 },
  heading: { fontSize: 22, fontWeight: '700' },
  scoreLine: { fontSize: 13, color: '#666' },
  explanation: { fontSize: 13, color: '#444', marginTop: 2, lineHeight: 18 },
  disclaimer: { fontSize: 11, color: '#888', marginTop: 4, marginBottom: 4, lineHeight: 15 },
  list: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 14 },
  emptyText: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 24 },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, gap: 4 },
  cardBranch: { fontSize: 13, color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardCity: { fontSize: 13, color: '#666', marginBottom: 4 },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  statLine: { fontSize: 12, color: '#333', fontWeight: '600' },
  profileRows: { gap: 2, marginBottom: 6 },
  profileRow: { fontSize: 12, color: '#444' },
  hint: { fontSize: 12, color: '#888', fontStyle: 'italic', marginBottom: 8 },
  pickButton: { backgroundColor: '#222', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  pickButtonText: { color: '#fff', fontWeight: '600', fontSize: 12, letterSpacing: 0.5 },
});
