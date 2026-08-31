import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootStack';
import { useGameStore } from '../../store/useGameStore';
import { selectAvailablePrograms } from '../../domain/state/selectors';
import { getProgramHospitalName, type ResidencyProgram } from '../../domain/config/residencyPrograms';
import { getBranchDefinition } from '../../domain/config/branches';
import { getCityDefinition } from '../../domain/config/cities';
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

function ProgramCard({ program, onPick }: { program: ResidencyProgram; onPick: () => void }) {
  const branch = getBranchDefinition(program.branchId);
  const city = getCityDefinition(program.cityId);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>
        {getProgramHospitalName(program)} — {branch.name}
      </Text>
      <Text style={styles.cardCity}>{city.name}</Text>

      <View style={styles.profileRows}>
        {DIMENSIONS.map((dim) => (
          <Text key={dim} style={styles.profileRow}>
            {PROFILE_DIMENSION_LABELS[dim]}: {getProfileLevelLabel(dim, program.visibleProfile[dim])}
          </Text>
        ))}
      </View>

      {program.hintText && <Text style={styles.hint}>"Asistan yorumları: {program.hintText}"</Text>}

      <Pressable style={styles.pickButton} onPress={onPick}>
        <Text style={styles.pickButtonText}>TERCİH ET</Text>
      </Pressable>
    </View>
  );
}

export default function TusPreferenceListScreen({ navigation }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  const programs = gameState ? selectAvailablePrograms(gameState) : [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Tercihlerin</Text>
      {gameState?.career.tusScore !== undefined && (
        <Text style={styles.scoreLine}>TUS puanın: {gameState.career.tusScore.toFixed(2)}</Text>
      )}
      <View style={styles.list}>
        {programs.map((program) => (
          <ProgramCard
            key={program.id}
            program={program}
            onPick={() => navigation.navigate('TusPreferenceConfirm', { programId: program.id })}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 12 },
  heading: { fontSize: 22, fontWeight: '700' },
  scoreLine: { fontSize: 13, color: '#666', marginBottom: 8 },
  list: { gap: 14 },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, gap: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardCity: { fontSize: 13, color: '#666', marginBottom: 6 },
  profileRows: { gap: 2, marginBottom: 6 },
  profileRow: { fontSize: 12, color: '#444' },
  hint: { fontSize: 12, color: '#888', fontStyle: 'italic', marginBottom: 8 },
  pickButton: { backgroundColor: '#222', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  pickButtonText: { color: '#fff', fontWeight: '600', fontSize: 12, letterSpacing: 0.5 },
});
