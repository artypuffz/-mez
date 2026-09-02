import { StyleSheet, Text, View } from 'react-native';

import type { ScheduleActivity, WeeklySchedule } from '../domain/state/types';
import { colors, spacing } from '../theme/tokens';

const ACTIVITY_LABEL: Record<ScheduleActivity, string> = {
  vizit: 'Vizit',
  servis: 'Servis',
  poliklinik: 'Poliklinik',
  ameliyathane: 'Ameliyathane',
  egitim: 'Eğitim',
  nobet: 'Nöbet',
  nobet_ertesi: 'Nöbet İzni',
  bos: 'Boş',
};

const ACTIVITY_COLOR: Record<ScheduleActivity, string> = {
  vizit: colors.info,
  servis: colors.accent,
  poliklinik: colors.accentAlt,
  ameliyathane: colors.danger,
  egitim: colors.success,
  nobet: colors.warning,
  nobet_ertesi: colors.textMuted,
  bos: colors.border,
};

const DAY_LABEL_FROM_DATE = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

function dayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return DAY_LABEL_FROM_DATE[d.getUTCDay()];
}

interface Props {
  schedule: WeeklySchedule;
  compact?: boolean;
}

// Gameplay Expansion Part B §13 — a real weekly calendar over Part A's own
// WeeklySchedule state (already derived from workload/on-call — this
// component performs zero hour math of its own, purely presentation).
export default function WeeklyScheduleStrip({ schedule, compact }: Props) {
  return (
    <View style={styles.row}>
      {schedule.days.map((day) => {
        // The day's dominant (widest) slot is what gets shown as its chip
        // — a compact single glance, not every slot boundary.
        const dominant = [...day.slots].sort((a, b) => (b.endHour - b.startHour) - (a.endHour - a.startHour))[0];
        const color = ACTIVITY_COLOR[dominant.activity];
        return (
          <View key={day.dayIndex} style={styles.dayCell}>
            <Text style={styles.dayLabel}>{dayLabel(day.date)}</Text>
            <View style={[styles.chip, { backgroundColor: color + '33', borderColor: color }]}>
              <Text style={[styles.chipText, { color }]} numberOfLines={1}>
                {compact ? ACTIVITY_LABEL[dominant.activity].slice(0, 3) : ACTIVITY_LABEL[dominant.activity]}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 4, width: '100%' },
  dayCell: { flex: 1, alignItems: 'center', gap: 4 },
  dayLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  chip: { borderWidth: 1, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 2, width: '100%', alignItems: 'center' },
  chipText: { fontSize: 9, fontWeight: '700' },
});
