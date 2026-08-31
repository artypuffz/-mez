import { Pressable, StyleSheet, Text, View } from 'react-native';

import { buildRequirementContext } from '../domain/events/requirements';
import { getVisibleChoices } from '../domain/events/choices';
import { resolveText } from '../domain/events/variants';
import type { EventDefinition } from '../domain/events/types';
import type { GameState } from '../domain/state/types';

interface Props {
  event: EventDefinition;
  gameState: GameState;
  disabled: boolean;
  onChoose: (choiceId: string) => void;
}

// Only visible resource effects are ever shown here — hidden
// relationship/flag/behaviorTag changes never appear in the UI (§26/27).
export default function EventCard({ event, gameState, disabled, onChoose }: Props) {
  const ctx = buildRequirementContext(gameState);
  const title = resolveText(event.title, event.titleVariants, ctx);
  const description = resolveText(event.description, event.descriptionVariants, ctx);
  const choices = getVisibleChoices(event, ctx);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.choices}>
        {choices.map((choice) => (
          <Pressable
            key={choice.id}
            disabled={disabled}
            accessibilityRole="button"
            style={[styles.choiceButton, disabled && styles.choiceButtonDisabled]}
            onPress={() => onChoose(choice.id)}
          >
            <Text style={styles.choiceText}>{choice.text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 16, gap: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  description: { fontSize: 14, color: '#333', lineHeight: 20 },
  choices: { gap: 8, marginTop: 8 },
  choiceButton: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingVertical: 11, paddingHorizontal: 12 },
  choiceButtonDisabled: { opacity: 0.5 },
  choiceText: { fontSize: 13, color: '#222' },
});
