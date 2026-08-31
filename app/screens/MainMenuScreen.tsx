import { useEffect } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/RootStack';
import { resolveEntryRoute } from '../navigation/RootStack';
import { useGameStore } from '../store/useGameStore';

type Props = NativeStackScreenProps<RootStackParamList, 'MainMenu'>;

export default function MainMenuScreen({ navigation }: Props) {
  const status = useGameStore((s) => s.status);
  const hasSave = useGameStore((s) => s.hasSave);
  const gameState = useGameStore((s) => s.gameState);
  const loadGame = useGameStore((s) => s.loadGame);
  const resetGame = useGameStore((s) => s.resetGame);

  useEffect(() => {
    loadGame();
  }, [loadGame]);

  if (status !== 'ready') {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  const handleContinue = () => {
    navigation.replace(resolveEntryRoute(gameState));
  };

  const startNewGame = () => navigation.replace('CharacterCreation');

  const handleNewGame = () => {
    if (!hasSave) {
      startNewGame();
      return;
    }
    Alert.alert(
      'Yeni Oyun',
      'Mevcut kayıt silinecek. Emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, yeni oyun',
          style: 'destructive',
          onPress: async () => {
            await resetGame();
            startNewGame();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ÇÖMEZ</Text>
      <View style={styles.buttons}>
        <Pressable
          style={[styles.button, !hasSave && styles.buttonDisabled]}
          disabled={!hasSave}
          onPress={handleContinue}
        >
          <Text style={styles.buttonText}>DEVAM ET</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={handleNewGame}>
          <Text style={styles.buttonText}>YENİ OYUN</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  title: { fontSize: 36, fontWeight: '700' },
  buttons: { gap: 12, width: 220 },
  button: { backgroundColor: '#222', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontWeight: '600', letterSpacing: 0.5 },
});
