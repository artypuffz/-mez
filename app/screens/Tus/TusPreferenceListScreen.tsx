import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootStack';
import { useGameStore } from '../../store/useGameStore';
import { selectAvailablePrograms } from '../../domain/state/selectors';
import { getProgramHospitalName, type ResidencyProgram } from '../../domain/config/residencyPrograms';
import { getBranchDefinition, getBranchOverallDifficulty } from '../../domain/config/branches';
import { getCityDefinition } from '../../domain/config/cities';
import { filterPrograms, sortPrograms, type ProgramSortKey } from '../../domain/tus/sortPrograms';
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

const SORT_LABELS: Record<ProgramSortKey, string> = {
  score: 'TUS puanına göre',
  difficulty: 'Asistanlık zorluğuna göre',
  city: 'Şehre göre',
};

function difficultyLabel(program: ResidencyProgram): string {
  const overall = getBranchOverallDifficulty(getBranchDefinition(program.branchId));
  return `${overall.toFixed(1)} / 5`;
}

function ProgramCard({ program, onPick }: { program: ResidencyProgram; onPick: () => void }) {
  const branch = getBranchDefinition(program.branchId);
  const city = getCityDefinition(program.cityId);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        {getProgramHospitalName(program)} — {branch.name}
      </Text>
      <Text style={styles.cardCity}>{city.name}</Text>

      <View style={styles.statRow}>
        <Text style={styles.statLine}>TUS: {program.minScore !== undefined ? program.minScore.toFixed(2) : 'Puan sınırı yok'}</Text>
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

function FilterChip({ label, active, onPress, testID }: { label: string; active: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      testID={testID}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function TusPreferenceListScreen({ navigation }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  const allPrograms = gameState ? selectAvailablePrograms(gameState) : [];

  const [cityId, setCityId] = useState<string | undefined>(undefined);
  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [sortKey, setSortKey] = useState<ProgramSortKey>('score');

  // Only offer filter chips for cities/branches that actually have an
  // available program right now — a 62-city, 26-branch chip row with
  // mostly-empty options would just be noise.
  const cityOptions = useMemo(() => {
    const ids = new Set(allPrograms.map((p) => p.cityId));
    return Array.from(ids)
      .map((id) => getCityDefinition(id))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [allPrograms]);

  const branchOptions = useMemo(() => {
    const ids = new Set(allPrograms.map((p) => p.branchId));
    return Array.from(ids)
      .map((id) => getBranchDefinition(id))
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [allPrograms]);

  const programs = useMemo(
    () => sortPrograms(filterPrograms(allPrograms, { cityId, branchId }), sortKey),
    [allPrograms, cityId, branchId, sortKey]
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.heading}>Tercihlerin</Text>
        {gameState?.career.tusScore !== undefined && (
          <Text style={styles.scoreLine}>TUS puanın: {gameState.career.tusScore.toFixed(2)}</Text>
        )}
        <Text style={styles.disclaimer}>
          Bazı programlarda gerçek kurum, şehir ve uzmanlık dalı adları kullanılır. Çalışma koşulları, servis kültürü,
          NPC'ler ve olaylar oyun mekaniği amacıyla kurgulanmıştır; gerçek kişi veya kurumlara ilişkin bir
          değerlendirme değildir.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterRowContent}>
          <FilterChip label="Tüm şehirler" active={!cityId} onPress={() => setCityId(undefined)} testID="filter-city-all" />
          {cityOptions.map((city) => (
            <FilterChip key={city.id} label={city.name} active={cityId === city.id} onPress={() => setCityId(city.id)} testID={`filter-city-${city.id}`} />
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterRowContent}>
          <FilterChip label="Tüm branşlar" active={!branchId} onPress={() => setBranchId(undefined)} testID="filter-branch-all" />
          {branchOptions.map((branch) => (
            <FilterChip key={branch.id} label={branch.name} active={branchId === branch.id} onPress={() => setBranchId(branch.id)} testID={`filter-branch-${branch.id}`} />
          ))}
        </ScrollView>

        <View style={styles.sortRow}>
          {(Object.keys(SORT_LABELS) as ProgramSortKey[]).map((key) => (
            <FilterChip key={key} label={SORT_LABELS[key]} active={sortKey === key} onPress={() => setSortKey(key)} testID={`sort-${key}`} />
          ))}
        </View>

        <Text style={styles.resultCount} testID="tus-result-count">
          {programs.length} program
        </Text>
      </View>

      <FlatList
        data={programs}
        keyExtractor={(program) => program.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ProgramCard program={item} onPick={() => navigation.navigate('TusPreferenceConfirm', { programId: item.id })} />
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>Bu filtrelerle uygun program bulunamadı.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 24, gap: 6 },
  heading: { fontSize: 22, fontWeight: '700' },
  scoreLine: { fontSize: 13, color: '#666' },
  disclaimer: { fontSize: 11, color: '#888', marginTop: 4, marginBottom: 4, lineHeight: 15 },
  filterRow: { marginTop: 4, flexGrow: 0 },
  filterRowContent: { gap: 6, paddingRight: 12 },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipActive: { backgroundColor: '#222', borderColor: '#222' },
  chipText: { fontSize: 12, color: '#444' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  resultCount: { fontSize: 11, color: '#999', marginTop: 6, marginBottom: 4 },
  list: { paddingHorizontal: 24, paddingBottom: 24, gap: 14 },
  emptyText: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 24 },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, gap: 4 },
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
