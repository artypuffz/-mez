import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useGameStore } from '../store/useGameStore';
import { selectCharacterSummary, selectResidencySummary, selectUpcomingHint } from '../domain/state/selectors';
import { getEventRepository } from '../domain/events/content';
import { formatMonthLabel } from '../domain/oncall/monthLabel';
import type { MonthlyEconomyBreakdown, OnCallSchedule, ResolvedResourceDelta } from '../domain/state/types';
import { resolveOutfitContext } from '../domain/avatar/outfitResolver';
import { resolveExpression } from '../domain/avatar/expressionResolver';
import ResourceBar from '../components/ResourceBar';
import EventCard from '../components/EventCard';
import WeeklyScheduleStrip from '../components/WeeklyScheduleStrip';
import AvatarRenderer from '../components/avatar/AvatarRenderer';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import { colors, spacing, typography } from '../theme/tokens';

function formatMoney(amount: number): string {
  return `${amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} TL`;
}

function formatDelta(value: number): string {
  if (value > 0) return `+${value}`;
  if (value < 0) return `${value}`;
  return '±0';
}

const RESOURCE_LABELS: Record<'stress' | 'fatigue' | 'burnout' | 'health' | 'social' | 'money', string> = {
  stress: 'Stres',
  fatigue: 'Yorgunluk',
  burnout: 'Tükenmişlik',
  health: 'Sağlık',
  social: 'Sosyal Hayat',
  money: 'Para',
};

const SENIORITY_LABEL: Record<string, string> = {
  none: 'Aday',
  comez: 'Çömez',
  orta: 'Orta Kıdem',
  kidemli: 'Kıdemli Asistan',
};

function formatVisibleEffects(delta: ResolvedResourceDelta): string[] {
  return (Object.keys(delta) as (keyof ResolvedResourceDelta)[])
    .filter((key) => delta[key] !== undefined && delta[key] !== 0)
    .map((key) => `${RESOURCE_LABELS[key]} ${key === 'money' ? formatMoney(delta[key]!) : formatDelta(delta[key]!)}`);
}

function formatSigned(amount: number): string {
  return amount >= 0 ? `+${formatMoney(amount)}` : `-${formatMoney(Math.abs(amount))}`;
}

// §8 — a read-only info card, not a choice event. Shown once, the week
// the month actually changes (see the render call site below).
function OnCallCard({ schedule }: { schedule: OnCallSchedule }) {
  const gotWorse =
    schedule.clinicSummary.previousActiveResidents !== undefined &&
    schedule.clinicSummary.activeResidents < schedule.clinicSummary.previousActiveResidents;

  return (
    <Card>
      <Text style={styles.cardHeading}>{formatMonthLabel(schedule.monthKey)} NÖBET LİSTESİ</Text>
      <Text style={styles.cardBody}>Bu ay {schedule.player.totalShifts} nöbetin var.</Text>
      {schedule.player.weekendShifts > 0 && (
        <Text style={styles.cardBody}>{schedule.player.weekendShifts}'i hafta sonu.</Text>
      )}
      {gotWorse && (
        <Text style={styles.cardBody}>Klinikte aktif asistan sayısı geçen aya göre azaldı.</Text>
      )}
    </Card>
  );
}

function EconomyCard({ breakdown, balance }: { breakdown: MonthlyEconomyBreakdown; balance: number }) {
  return (
    <Card>
      <Text style={styles.cardHeading}>AYLIK DURUM</Text>
      <Text style={styles.cardBody}>Maaş: {formatSigned(breakdown.income.salary)}</Text>
      <Text style={styles.cardBody}>Nöbet ödemesi: {formatSigned(breakdown.income.onCallPay)}</Text>
      <Text style={styles.cardBody}>Kira: -{formatMoney(breakdown.expenses.rent)}</Text>
      <Text style={styles.cardBody}>Yemek: -{formatMoney(breakdown.expenses.food)}</Text>
      <Text style={styles.cardBody}>Ulaşım: -{formatMoney(breakdown.expenses.transport)}</Text>
      <Text style={styles.cardBody}>Faturalar: -{formatMoney(breakdown.expenses.utilities)}</Text>
      <Text style={styles.cardBody}>Diğer: -{formatMoney(breakdown.expenses.fixedOther)}</Text>
      <Text style={styles.cardNet}>Bu ay net: {formatSigned(breakdown.net)}</Text>
      <Text style={styles.cardBody}>Yeni bakiye: {formatMoney(balance)}</Text>
    </Card>
  );
}

export default function HomeScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const advanceWeek = useGameStore((s) => s.advanceWeek);
  const resolveActiveEventChoice = useGameStore((s) => s.resolveActiveEventChoice);
  const isAdvancingWeek = useGameStore((s) => s.isAdvancingWeek);
  const isResolvingEvent = useGameStore((s) => s.isResolvingEvent);
  const lastWeekSummary = useGameStore((s) => s.lastWeekSummary);
  const lastChoiceEffects = useGameStore((s) => s.lastChoiceEffects);
  const lastRelationshipFeedback = useGameStore((s) => s.lastRelationshipFeedback);

  const characterSummary = gameState ? selectCharacterSummary(gameState) : null;
  const residencySummary = gameState ? selectResidencySummary(gameState) : null;
  const resources = gameState?.resources;
  const isExam = gameState?.career.phase === 'specialist_exam';

  if (!gameState || !characterSummary || !residencySummary || !resources) {
    return (
      <View style={styles.container}>
        <Text style={typography.screenTitle}>ÇÖMEZ</Text>
        <Text style={styles.subtitle}>Ana Sayfa — event feed buraya gelecek</Text>
      </View>
    );
  }

  const activeInstance = gameState.weeklyEventQueue[0];
  const activeEvent = activeInstance ? getEventRepository().getEventById(activeInstance.eventId) : undefined;
  const effectLines = lastChoiceEffects ? formatVisibleEffects(lastChoiceEffects) : [];
  const upcomingHint = selectUpcomingHint(gameState);

  const outfit = resolveOutfitContext({ phase: gameState.career.phase, schedule: gameState.schedule });
  const expression = resolveExpression(resources);
  const remainingFreeTime = Math.max(0, gameState.freeTime.totalHours - gameState.freeTime.usedHours);

  const showMonthlyCards =
    !!lastWeekSummary &&
    lastWeekSummary.week === residencySummary.residencyWeek &&
    !!lastWeekSummary.transitions.monthChanged;

  return (
    <ScrollView contentContainerStyle={styles.container} testID="home-screen">
      {/* Identity header */}
      <Card variant="profile" style={styles.identityCard}>
        <View style={styles.identityRow}>
          <AvatarRenderer avatar={characterSummary.avatar} outfit={outfit} expression={expression} size={56} accessibilityLabel={`${characterSummary.name} avatarı`} />
          <View style={styles.identityText}>
            <Text style={styles.name}>Dr. {characterSummary.name}</Text>
            <Text style={styles.line}>{SENIORITY_LABEL[gameState.career.seniorityStage]} — {residencySummary.branchName}</Text>
            <Text style={styles.lineMuted}>{residencySummary.hospitalName}</Text>
          </View>
        </View>
        <Text style={styles.weekLine} testID="week-line">
          Yıl {residencySummary.residencyYear} — Hafta {residencySummary.residencyWeek}
        </Text>
      </Card>

      {/* Resource panel */}
      <Card>
        <Text style={styles.sectionHeading}>KAYNAKLARIM</Text>
        <View style={styles.resources}>
          <ResourceBar kind="stress" label="Stres" value={resources.stress} />
          <ResourceBar kind="fatigue" label="Yorgunluk" value={resources.fatigue} />
          <ResourceBar kind="burnout" label="Tükenmişlik" value={resources.burnout} />
          <ResourceBar kind="health" label="Sağlık" value={resources.health} />
          <ResourceBar kind="social" label="Sosyal Hayat" value={resources.social} />
        </View>
      </Card>

      {/* Finance / free-time summary */}
      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <Icon name="money" size={18} color={colors.accent} />
          <Text style={styles.summaryValue}>{formatMoney(resources.money)}</Text>
          <Text style={styles.summaryLabel}>Bakiye</Text>
        </Card>
        <Card style={styles.summaryCard}>
          <Icon name="time" size={18} color={colors.accent} />
          <Text style={styles.summaryValue}>{Math.round(remainingFreeTime)} saat</Text>
          <Text style={styles.summaryLabel}>Boş Zaman</Text>
        </Card>
      </View>

      {/* This week */}
      {gameState.schedule && (
        <Card>
          <Text style={styles.sectionHeading}>BU HAFTA</Text>
          <WeeklyScheduleStrip schedule={gameState.schedule} compact />
        </Card>
      )}

      {/* Upcoming */}
      {upcomingHint && (
        <Card variant="warning">
          <View style={styles.upcomingRow}>
            <Icon name="schedule" size={16} color={colors.warning} />
            <Text style={styles.upcomingText}>{upcomingHint}</Text>
          </View>
        </Card>
      )}

      {lastRelationshipFeedback.length > 0 && (
        <View style={styles.feedbackBox}>
          {lastRelationshipFeedback.map((f) => (
            <Text key={f.npcId} style={[styles.feedbackLine, { color: f.direction === 'positive' ? colors.success : colors.danger }]}>
              {f.text}
            </Text>
          ))}
        </View>
      )}

      {effectLines.length > 0 && (
        <View style={styles.effectBox}>
          {effectLines.map((line) => (
            <Text key={line} style={styles.effectLine}>{line}</Text>
          ))}
        </View>
      )}

      {showMonthlyCards && gameState.onCall.schedule && (
        <OnCallCard schedule={gameState.onCall.schedule} />
      )}
      {showMonthlyCards && gameState.economy.lastBreakdown && (
        <EconomyCard breakdown={gameState.economy.lastBreakdown} balance={resources.money} />
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
          <Card>
            <Text style={styles.sectionHeading}>DURUM</Text>
            {isExam ? (
              <Text style={styles.cardBody}>Uzmanlık sınavı yaklaşıyor.</Text>
            ) : lastWeekSummary && lastWeekSummary.week === residencySummary.residencyWeek ? (
              <>
                <Text style={styles.cardHeading}>HAFTA {lastWeekSummary.week}</Text>
                <Text style={styles.cardBody}>Bu hafta olağan bir tempoda geçti.</Text>
                <Text style={styles.cardBodyMuted}>Stres {formatDelta(lastWeekSummary.resourceDelta.stress)}</Text>
                <Text style={styles.cardBodyMuted}>Yorgunluk {formatDelta(lastWeekSummary.resourceDelta.fatigue)}</Text>
                <Text style={styles.cardBodyMuted}>
                  Tükenmişlik {formatDelta(lastWeekSummary.resourceDelta.burnout)}
                </Text>
              </>
            ) : (
              <Text style={styles.cardBody}>Bu hafta henüz olağan dışı bir olay yok.</Text>
            )}
          </Card>

          <Button
            label={isExam ? 'DEVAM ET' : 'HAFTAYI GEÇ'}
            onPress={advanceWeek}
            disabled={isAdvancingWeek}
            loading={isAdvancingWeek}
            testID="btn-advance-week"
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.bgBase },
  subtitle: { fontSize: 14, color: colors.textSecondary },
  identityCard: { gap: spacing.sm },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityText: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  line: { fontSize: 13, color: colors.textSecondary },
  lineMuted: { fontSize: 12, color: colors.textMuted },
  weekLine: { fontSize: 12, color: colors.textMuted },
  sectionHeading: { ...typography.sectionHeading, marginBottom: spacing.xs },
  resources: { gap: spacing.md },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  summaryLabel: { fontSize: 11, color: colors.textMuted },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  upcomingText: { fontSize: 13, color: colors.warning, flexShrink: 1 },
  feedbackBox: { width: '100%', gap: 2 },
  feedbackLine: { fontSize: 13, fontWeight: '600' },
  effectBox: { width: '100%', gap: 2 },
  effectLine: { fontSize: 13, color: colors.accent },
  cardHeading: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  cardBody: { fontSize: 13, color: colors.textSecondary },
  cardBodyMuted: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  cardNet: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginTop: 4 },
});
