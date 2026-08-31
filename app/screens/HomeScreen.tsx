import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useGameStore } from '../store/useGameStore';
import { selectCharacterSummary, selectResidencySummary } from '../domain/state/selectors';
import { getEventRepository } from '../domain/events/content';
import type { ResolvedResourceDelta } from '../domain/state/types';
import ResourceBar from '../components/ResourceBar';
import EventCard from '../components/EventCard';

function formatMoney(amount: number): string {
  return `${amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} TL`;
}

function formatDelta(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return '±0';
}

const RESOURCE_LABELS: Record<'stress' | 'fatigue' | 'burnout' | 'money', string> = {
  stress: 'Stres',
  fatigue: 'Yorgunluk',
  burnout: 'Tükenmişlik',
  money: 'Para',
};

function formatVisibleEffects(delta: ResolvedResourceDelta): string[] {
  return (Object.keys(delta) as (keyof ResolvedResourceDelta)[])
    .filter((key) => delta[key] !== undefined && delta[key] !== 0)
    .map((key) => `${RESOURCE_LABELS[key]} ${key === 'money' ? formatMoney(delta[key]!) : formatDelta(delta[key]!)}`);
}

export default function HomeScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const advanceWeek = useGameStore((s) => s.advanceWeek);
  const resolveActiveEventChoice = useGameStore((s) => s.resolveActiveEventChoice);
  const isAdvancingWeek = useGameStore((s) => s.isAdvancingWeek);
  const isResolvingEvent = useGameStore((s) => s.isResolvingEvent);
  const lastWeekSummary = useGameStore((s) => s.lastWeekSummary);
  const lastChoiceEffects = useGameStore((s) => s.lastChoiceEffects);

  const characterSummary = gameState ? selectCharacterSummary(gameState) : null;
  const residencySummary = gameState ? selectResidencySummary(gameState) : null;
  const resources = gameState?.resources;
  const isComplete = gameState?.career.phase === 'residency_complete';

  if (!gameState || !characterSummary || !residencySummary || !resources) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>ÇÖMEZ</Text>
        <Text style={styles.subtitle}>Ana Sayfa — event feed buraya gelecek</Text>
      </View>
    );
  }

  const activeInstance = gameState.weeklyEventQueue[0];
  const activeEvent = activeInstance ? getEventRepository().getEventById(activeInstance.eventId) : undefined;
  const effectLines = lastChoiceEffects ? formatVisibleEffects(lastChoiceEffects) : [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>ÇÖMEZ</Text>
      <Text style={styles.name}>Dr. {characterSummary.name}</Text>
      <Text style={styles.line}>{residencySummary.branchName}</Text>
      <Text style={styles.line}>{residencySummary.hospitalName}</Text>
      <Text style={styles.weekLine}>
        Yıl {residencySummary.residencyYear} — Hafta {residencySummary.residencyWeek}
      </Text>

      <View style={styles.resources}>
        <ResourceBar label="Stres" value={resources.stress} />
        <ResourceBar label="Yorgunluk" value={resources.fatigue} />
        <ResourceBar label="Tükenmişlik" value={resources.burnout} />
      </View>
      <Text style={styles.money}>Para: {formatMoney(resources.money)}</Text>

      {effectLines.length > 0 && (
        <View style={styles.effectBox}>
          {effectLines.map((line) => (
            <Text key={line} style={styles.effectLine}>{line}</Text>
          ))}
        </View>
      )}

      {activeEvent ? (
        <EventCard
          event={activeEvent}
          gameState={gameState}
          disabled={isResolvingEvent}
          boundNpcIds={activeInstance?.boundNpcIds}
          onChoose={(choiceId) => resolveActiveEventChoice(activeEvent.id, choiceId)}
        />
      ) : (
        <>
          <View style={styles.weekBox}>
            <Text style={styles.weekBoxHeading}>BU HAFTA</Text>
            {isComplete ? (
              <Text style={styles.weekBoxBody}>
                Asistanlık süren tamamlandı. Uzmanlık sınavı sistemi sonraki fazlarda eklenecek.
              </Text>
            ) : lastWeekSummary && lastWeekSummary.week === residencySummary.residencyWeek ? (
              <>
                <Text style={styles.weekBoxTitle}>HAFTA {lastWeekSummary.week}</Text>
                <Text style={styles.weekBoxBody}>Bu hafta olağan bir tempoda geçti.</Text>
                <Text style={styles.weekBoxDelta}>Stres {formatDelta(lastWeekSummary.resourceDelta.stress)}</Text>
                <Text style={styles.weekBoxDelta}>Yorgunluk {formatDelta(lastWeekSummary.resourceDelta.fatigue)}</Text>
                <Text style={styles.weekBoxDelta}>
                  Tükenmişlik {formatDelta(lastWeekSummary.resourceDelta.burnout)}
                </Text>
              </>
            ) : (
              <Text style={styles.weekBoxBody}>Bu hafta henüz olağan dışı bir olay yok.</Text>
            )}
          </View>

          {!isComplete && (
            <Pressable
              style={[styles.button, isAdvancingWeek && styles.buttonDisabled]}
              disabled={isAdvancingWeek}
              onPress={advanceWeek}
            >
              <Text style={styles.buttonText}>HAFTAYI GEÇ</Text>
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', padding: 24, gap: 4 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666' },
  name: { fontSize: 16, fontWeight: '600', marginTop: 4 },
  line: { fontSize: 14, color: '#444' },
  weekLine: { fontSize: 13, color: '#666', marginTop: 6, marginBottom: 14 },
  resources: { width: '100%', gap: 8, marginBottom: 10 },
  money: { fontSize: 14, color: '#333', marginBottom: 18 },
  effectBox: { width: '100%', gap: 2, marginBottom: 16 },
  effectLine: { fontSize: 13, color: '#2563eb' },
  weekBox: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    gap: 3,
    marginBottom: 16,
  },
  weekBoxHeading: { fontSize: 11, color: '#999', letterSpacing: 0.5, marginBottom: 4 },
  weekBoxTitle: { fontSize: 13, fontWeight: '700' },
  weekBoxBody: { fontSize: 13, color: '#444' },
  weekBoxDelta: { fontSize: 12, color: '#666', marginTop: 2 },
  button: { backgroundColor: '#222', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8, width: '100%', alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontWeight: '600', letterSpacing: 0.5 },
});
