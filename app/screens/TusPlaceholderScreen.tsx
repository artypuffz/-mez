import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/RootStack';
import { useGameStore } from '../store/useGameStore';
import { selectCharacterSummary } from '../domain/state/selectors';

type Props = NativeStackScreenProps<RootStackParamList, 'TusPlaceholder'>;

export default function TusPlaceholderScreen({ navigation }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  const resetGame = useGameStore((s) => s.resetGame);
  const summary = gameState ? selectCharacterSummary(gameState) : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TUS</Text>
      {summary && (
        <Text style={styles.subtitle}>
          Dr. {summary.name} — {summary.age} yaş — {summary.hometown}
        </Text>
      )}
      <Text style={styles.note}>TUS akışı Faz 3'te gelecek.</Text>
      <Pressable
        style={styles.link}
        onPress={async () => {
          await resetGame();
          navigation.replace('MainMenu');
        }}
      >
        <Text style={styles.linkText}>Ana menüye dön (test)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 15, color: '#333', textAlign: 'center' },
  note: { fontSize: 13, color: '#888', marginTop: 8 },
  link: { marginTop: 24 },
  linkText: { color: '#2563eb', fontSize: 13 },
});
