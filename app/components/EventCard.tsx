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
  // The active QueuedEventInstance's already-resolved NPC bindings (§16)
  // — never re-selected here, just read.
  boundNpcIds?: Record<string, string>;
}

// Only visible resource effects are ever shown here — hidden
// relationship/flag/behaviorTag changes never appear in the UI (§26/27).
export default function EventCard({ event, gameState, disabled, onChoose, boundNpcIds = {} }: Props) {
  const ctx = buildRequirementContext(gameState, boundNpcIds);
  const title = resolveText(event.title, event.titleVariants, ctx);
  const description = resolveText(event.description, event.descriptionVariants, ctx);
  const choices = getVisibleChoices(event, ctx);

  const isCrisis = event.triggerMode === 'crisis' || event.category === 'CRISIS';

  return (
    <View style={[styles.card, isCrisis && styles.cardCrisis]}>
      {isCrisis && <Text style={styles.crisisTag}>KRİTİK HAFTA</Text>}
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
  // Phase 9 §34 — a small text tag is enough distinction; deliberately no
  // red flashing/alarm treatment, matching ÇÖMEZ's deadpan tone.
  cardCrisis: { borderColor: '#a87438', borderWidth: 1.5 },
  crisisTag: { fontSize: 11, fontWeight: '700', color: '#a87438', letterSpacing: 0.5 },
  title: { fontSize: 16, fontWeight: '700' },
  description: { fontSize: 14, color: '#333', lineHeight: 20 },
  choices: { gap: 8, marginTop: 8 },
  choiceButton: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingVertical: 11, paddingHorizontal: 12 },
  choiceButtonDisabled: { opacity: 0.5 },
  choiceText: { fontSize: 13, color: '#222' },
});
