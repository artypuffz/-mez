import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/RootStack';
import { resolveEntryRoute } from '../navigation/RootStack';
import { useGameStore } from '../store/useGameStore';
import { DEBUG_SCENARIO_IDS, DEBUG_SCENARIO_LABELS } from '../domain/debug/debugScenarios';

type Props = NativeStackScreenProps<RootStackParamList, 'MainMenu'>;

// Phase 10 §30 — a dev-only debug scenario panel. `__DEV__` is false in a
// release/production RN bundle, so this entire block (and the debug menu
// button that reveals it) never renders outside a dev server — this is
// the same gate the store's debugLoadScenario action uses, and the E2E
// harness relies on it being present when driven against `expo start
// --web` (which always runs in dev mode).
function DebugScenarioPanel({ navigation }: { navigation: Props['navigation'] }) {
  const debugLoadScenario = useGameStore((s) => s.debugLoadScenario);
  const gameState = useGameStore((s) => s.gameState);

  const handlePick = async (scenarioId: (typeof DEBUG_SCENARIO_IDS)[number]) => {
    await debugLoadScenario(scenarioId);
    const next = useGameStore.getState().gameState ?? gameState;
    navigation.replace(resolveEntryRoute(next));
  };

  return (
    <View style={styles.debugPanel} testID="debug-scenario-panel">
      <Text style={styles.debugHeading}>DEBUG SENARYOLARI</Text>
      {DEBUG_SCENARIO_IDS.map((id) => (
        <Pressable
          key={id}
          style={styles.debugButton}
          testID={`btn-debug-${id}`}
          onPress={() => handlePick(id)}
        >
          <Text style={styles.debugButtonText}>{DEBUG_SCENARIO_LABELS[id]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function MainMenuScreen({ navigation }: Props) {
  const status = useGameStore((s) => s.status);
  const hasSave = useGameStore((s) => s.hasSave);
  const gameState = useGameStore((s) => s.gameState);
  const loadGame = useGameStore((s) => s.loadGame);
  const resetGame = useGameStore((s) => s.resetGame);
  const loadError = useGameStore((s) => s.loadError);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);

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
      {loadError && (
        <Text style={styles.loadErrorText} testID="load-error-text">
          Kaydedilmiş oyun yüklenemedi.
        </Text>
      )}
      <View style={styles.buttons}>
        <Pressable
          style={[styles.button, !hasSave && styles.buttonDisabled]}
          disabled={!hasSave}
          onPress={handleContinue}
          accessibilityRole="button"
          testID="btn-continue"
        >
          <Text style={styles.buttonText}>DEVAM ET</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={handleNewGame} accessibilityRole="button" testID="btn-new-game">
          <Text style={styles.buttonText}>YENİ OYUN</Text>
        </Pressable>
      </View>

      {__DEV__ && (
        <>
          <Pressable
            style={styles.debugToggle}
            onPress={() => setDebugPanelOpen((v) => !v)}
            testID="btn-debug-menu"
          >
            <Text style={styles.debugToggleText}>
              {debugPanelOpen ? 'Debug menüsünü kapat' : 'Debug menüsü'}
            </Text>
          </Pressable>
          {debugPanelOpen && <DebugScenarioPanel navigation={navigation} />}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  title: { fontSize: 36, fontWeight: '700' },
  loadErrorText: { fontSize: 13, color: '#a83a3a', textAlign: 'center', maxWidth: 260 },
  buttons: { gap: 12, width: 220 },
  button: { backgroundColor: '#222', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontWeight: '600', letterSpacing: 0.5 },
  debugToggle: { marginTop: 28 },
  debugToggleText: { color: '#999', fontSize: 12, textDecorationLine: 'underline' },
  debugPanel: { marginTop: 12, gap: 8, width: 260 },
  debugHeading: { fontSize: 11, color: '#999', letterSpacing: 0.5, textAlign: 'center' },
  debugButton: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10 },
  debugButtonText: { fontSize: 12, color: '#444', textAlign: 'center' },
});
