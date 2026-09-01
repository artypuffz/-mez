import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootStack';
import { useGameStore } from '../../store/useGameStore';
import { getTusExamEvent } from '../../domain/config/tusExamEvents';

type Props = NativeStackScreenProps<RootStackParamList, 'TusExamDay'>;

// Driven entirely by tus.examLog.length as the "current event" pointer —
// resuming after a refresh just re-derives the same position, no local
// screen state to lose.
export default function TusExamDayScreen({ navigation }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  const submitTusExamChoice = useGameStore((s) => s.submitTusExamChoice);
  const tus = gameState?.tus;

  useEffect(() => {
    if (tus?.step === 'result') {
      navigation.replace('TusResult');
    }
  }, [tus?.step, navigation]);

  if (!tus || tus.step !== 'exam') {
    return <View style={styles.container} />;
  }

  const currentIndex = tus.examLog.length;
  const currentEventId = tus.examEventIds[currentIndex];
  if (!currentEventId) {
    return <View style={styles.container} />;
  }
  const event = getTusExamEvent(currentEventId);

  return (
    <View style={styles.container} testID="tus-exam-screen">
      <Text style={styles.progress}>
        {currentIndex + 1}/{tus.examEventIds.length}
      </Text>
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.description}>{event.description}</Text>
      <View style={styles.choices}>
        {event.choices.map((choice) => (
          <Pressable
            key={choice.id}
            style={styles.choiceButton}
            onPress={() => submitTusExamChoice(event.id, choice.id)}
            accessibilityRole="button"
            testID={`tus-exam-choice-${choice.id}`}
          >
            <Text style={styles.choiceText}>{choice.text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 14, justifyContent: 'center' },
  progress: { fontSize: 12, color: '#888' },
  title: { fontSize: 20, fontWeight: '700' },
  description: { fontSize: 15, color: '#333', lineHeight: 21 },
  choices: { gap: 10, marginTop: 12 },
  choiceButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  choiceText: { fontSize: 14, color: '#222' },
});
