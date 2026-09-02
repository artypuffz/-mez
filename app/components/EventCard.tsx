import { Pressable, StyleSheet, Text, View } from 'react-native';

import { buildRequirementContext } from '../domain/events/requirements';
import { getVisibleChoices } from '../domain/events/choices';
import { resolveText } from '../domain/events/variants';
import type { EventDefinition } from '../domain/events/types';
import type { GameState } from '../domain/state/types';
import { colors, radius, spacing } from '../theme/tokens';
import Badge from './ui/Badge';

interface Props {
  event: EventDefinition;
  gameState: GameState;
  disabled: boolean;
  onChoose: (choiceId: string) => void;
  // The active QueuedEventInstance's already-resolved NPC bindings (§16)
  // — never re-selected here, just read.
  boundNpcIds?: Record<string, string>;
}

// Gameplay Expansion Part D §45/§46 — visually integrated with the new
// dark theme; content/engine untouched. Crisis events stay restrained
// (a border + badge, per the existing "KRİTİK HAFTA" philosophy) — never
// flashing/horror treatment.
export default function EventCard({ event, gameState, disabled, onChoose, boundNpcIds = {} }: Props) {
  const ctx = buildRequirementContext(gameState, boundNpcIds);
  const title = resolveText(event.title, event.titleVariants, ctx);
  const description = resolveText(event.description, event.descriptionVariants, ctx);
  const choices = getVisibleChoices(event, ctx);

  const isCrisis = event.triggerMode === 'crisis' || event.category === 'CRISIS';

  return (
    <View style={[styles.card, isCrisis && styles.cardCrisis]} testID={`event-card-${event.id}`}>
      {isCrisis && <Badge label="KRİTİK HAFTA" tone="warning" icon="stress" />}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.choices}>
        {choices.map((choice) => (
          <Pressable
            key={choice.id}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={choice.text}
            style={({ pressed }) => [styles.choiceButton, disabled && styles.choiceButtonDisabled, pressed && !disabled && styles.choiceButtonPressed]}
            onPress={() => onChoose(choice.id)}
            testID={`choice-${choice.id}`}
          >
            <Text style={styles.choiceText}>{choice.text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceCard, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  cardCrisis: { borderColor: colors.warning, borderWidth: 1.5, backgroundColor: colors.warningMuted },
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  description: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  choices: { gap: spacing.sm, marginTop: spacing.xs },
  choiceButton: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: spacing.md, backgroundColor: colors.surfaceCardAlt },
  choiceButtonPressed: { backgroundColor: colors.accentMuted, borderColor: colors.accent },
  choiceButtonDisabled: { opacity: 0.5 },
  choiceText: { fontSize: 13, color: colors.textPrimary },
});
