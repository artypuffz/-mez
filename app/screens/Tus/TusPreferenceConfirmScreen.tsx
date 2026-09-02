import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootStack';
import { useGameStore } from '../../store/useGameStore';
import { getResidencyProgram, getProgramHospitalName } from '../../domain/config/residencyPrograms';
import { getBranchDefinition, getBranchOverallDifficulty } from '../../domain/config/branches';
import { getCityDefinition } from '../../domain/config/cities';

type Props = NativeStackScreenProps<RootStackParamList, 'TusPreferenceConfirm'>;

export default function TusPreferenceConfirmScreen({ route, navigation }: Props) {
  const chooseResidencyProgram = useGameStore((s) => s.chooseResidencyProgram);
  const program = getResidencyProgram(route.params.programId);
  const branch = getBranchDefinition(program.branchId);
  const city = getCityDefinition(program.cityId);
  const overallDifficulty = getBranchOverallDifficulty(branch);

  const handleConfirm = async () => {
    await chooseResidencyProgram(program);
    navigation.replace('Residency');
  };

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <Text style={styles.branch}>{branch.name}</Text>
        <Text style={styles.line}>{getProgramHospitalName(program)}</Text>
        <Text style={styles.line}>{city.name}</Text>
        <Text style={styles.line}>Asistanlık zorluğu: {overallDifficulty.toFixed(1)} / 5</Text>
        <Text style={styles.line}>Hiyerarşik yapı: Branşa bağlı</Text>
      </View>
      <Text style={styles.note}>Bu tercihle asistanlığa başlayacaksın.</Text>
      {program.sourceType === 'real' && (
        <Text style={styles.disclaimer}>
          Gerçek kurum ve uzmanlık dalı adı kullanılıyor. Çalışma koşulları, servis kültürü, NPC'ler ve olaylar oyun
          mekaniği amacıyla kurgulanmıştır; gerçek kişi/kurum değerlendirmesi değildir.
        </Text>
      )}
      <View style={styles.buttons}>
        <Pressable
          style={styles.confirmButton}
          onPress={handleConfirm}
          accessibilityRole="button"
          testID="btn-confirm-program"
        >
          <Text style={styles.confirmButtonText}>EMİNİM</Text>
        </Pressable>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} accessibilityRole="button">
          <Text style={styles.backButtonText}>GERİ DÖN</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  summary: { alignItems: 'center', gap: 4, marginBottom: 12 },
  branch: { fontSize: 20, fontWeight: '700' },
  line: { fontSize: 14, color: '#444' },
  note: { fontSize: 13, color: '#666', marginBottom: 12, textAlign: 'center' },
  disclaimer: { fontSize: 11, color: '#999', marginBottom: 24, textAlign: 'center', lineHeight: 15, paddingHorizontal: 8 },
  buttons: { gap: 10, width: 220 },
  confirmButton: { backgroundColor: '#222', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  confirmButtonText: { color: '#fff', fontWeight: '600', letterSpacing: 0.5 },
  backButton: {
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  backButtonText: { color: '#333', fontWeight: '600' },
});
