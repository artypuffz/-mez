import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootStack';
import { useGameStore } from '../../store/useGameStore';

type Props = NativeStackScreenProps<RootStackParamList, 'TusResult'>;

const DEADPAN_COMMENTS = [
  'Telefonu üç kez yeniledin. Puan değişmedi.',
  'Bu rakamla ilgili kimseye bir şey kanıtlamana gerek yok.',
  'Sonuç bu. Yorum kısmı kapalı.',
  'Bu senin puanın. Tartışmaya açık değil.',
  'Şimdi ekranda. Bir daha değişmeyecek.',
];

export default function TusResultScreen({ navigation }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  const generateTusResultIfNeeded = useGameStore((s) => s.generateTusResultIfNeeded);
  const goToPreferenceList = useGameStore((s) => s.goToPreferenceList);

  const tusScore = gameState?.career.tusScore;

  useEffect(() => {
    if (tusScore === undefined) {
      generateTusResultIfNeeded();
    }
  }, [tusScore, generateTusResultIfNeeded]);

  if (tusScore === undefined) {
    return <View style={styles.container} />;
  }

  const comment = DEADPAN_COMMENTS[Math.floor(tusScore) % DEADPAN_COMMENTS.length];

  const handleContinue = async () => {
    await goToPreferenceList();
    navigation.replace('TusPreferenceList');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>TUS SONUCUN AÇIKLANDI</Text>
      <Text style={styles.label}>Puanın</Text>
      <Text style={styles.score}>{tusScore.toFixed(2)}</Text>
      <Text style={styles.comment}>{comment}</Text>
      <Pressable style={styles.button} onPress={handleContinue} accessibilityRole="button" testID="btn-go-to-preferences">
        <Text style={styles.buttonText}>TERCİHLERE GİT</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  heading: { fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  label: { fontSize: 13, color: '#888', marginTop: 12 },
  score: { fontSize: 48, fontWeight: '800' },
  comment: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 6, marginBottom: 24 },
  button: { backgroundColor: '#222', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600', letterSpacing: 0.5 },
});
