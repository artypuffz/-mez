import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useGameStore } from '../store/useGameStore';
import { selectHospitalRoster, selectNpcDetail } from '../domain/npc/rosterSelectors';
import { deriveRelationshipLabel, deriveRelationshipScore } from '../domain/npc/relationshipLabel';
import { selectNpcAvatar } from '../domain/avatar/selectNpcAvatar';
import { selectResidencySummary } from '../domain/state/selectors';
import { getBranchDefinition } from '../domain/config/branches';
import { describeHierarchyPressure, describeOnCallLoad, describeWorkingHours } from '../domain/config/difficultyDescriptors';
import ScreenHeader from '../components/ui/ScreenHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import RelationshipBar from '../components/RelationshipBar';
import AvatarRenderer from '../components/avatar/AvatarRenderer';
import Icon from '../components/ui/Icon';
import { colors, spacing, typography } from '../theme/tokens';

const SENIORITY_LABEL: Record<string, string> = {
  none: 'Aday', comez: 'Çömez', orta: 'Orta Kıdem', kidemli: 'Kıdemli Asistan',
};

const DIRECTION_ICON = { positive: '↑', negative: '↓', neutral: '·' } as const;

export default function HospitalScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  if (!gameState || gameState.career.phase !== 'residency') {
    return (
      <View style={styles.centered}>
        <ScreenHeader title="Hastane" icon="hospital" />
        <EmptyState icon="hospital" text="Asistanlık başladığında çalıştığın hastane burada görünecek." />
      </View>
    );
  }

  const residencySummary = selectResidencySummary(gameState);
  const branch = gameState.career.branch ? getBranchDefinition(gameState.career.branch) : null;
  const groups = selectHospitalRoster(gameState);
  const schedule = gameState.onCall.schedule;
  const detail = selectedNpcId ? selectNpcDetail(gameState, selectedNpcId) : null;

  const query = search.trim().toLocaleLowerCase('tr');
  const filteredGroups = useMemo(() => {
    if (!query) return groups;
    return groups
      .map((g) => ({ ...g, npcs: g.npcs.filter((n) => n.identity.name.toLocaleLowerCase('tr').includes(query)) }))
      .filter((g) => g.npcs.length > 0);
  }, [groups, query]);

  return (
    <ScrollView contentContainerStyle={styles.container} testID="hospital-screen">
      <ScreenHeader title="Hastane" subtitle="Çalıştığın kişiler ve ilişkilerin" icon="hospital" />

      {residencySummary && branch && (
        <Card>
          <Text style={styles.institutionName}>{residencySummary.hospitalName}</Text>
          <Text style={styles.institutionLine}>{residencySummary.branchName} — {SENIORITY_LABEL[gameState.career.seniorityStage]}</Text>
          <View style={styles.badgeRow}>
            <Badge label={`Nöbet Yükü — ${describeOnCallLoad(branch.difficultyBaseline.onCallLoad)}`} tone="warning" icon="schedule" />
            <Badge label={`Çalışma Saatleri — ${describeWorkingHours(branch.difficultyBaseline.workingHours)}`} tone="info" icon="time" />
          </View>
          <View style={styles.badgeRow}>
            <Badge
              label={`Bölüm Kültürü — ${describeHierarchyPressure(gameState.career.hierarchyPressure ?? branch.difficultyBaseline.hierarchyPressure)}`}
              tone="accent"
              icon="relationship"
            />
          </View>
          {/* §3 — this describes THIS PROCEDURAL PLAYTHROUGH's culture, never a claim about the real institution. */}
          <Text style={styles.cultureNote}>Bu kariyerde bölüm kültürü yukarıdaki gibi şekillendi. Bu, gerçek kurum hakkında bir iddia değildir.</Text>
          {schedule && (
            <View style={styles.onCallSummary}>
              <Text style={styles.onCallSummaryLine}>Bu ay {schedule.player.totalShifts} nöbet</Text>
              <Text style={styles.onCallSummaryLine}>{schedule.player.weekendShifts} hafta sonu</Text>
            </View>
          )}
        </Card>
      )}

      <TextInput
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Kişi ara..."
        placeholderTextColor={colors.textMuted}
        accessibilityLabel="Kişi ara"
        testID="input-npc-search"
      />

      {filteredGroups.length === 0 && <EmptyState icon="social" text="Kimse bulunamadı." />}

      {filteredGroups.map((group) => (
        <View key={group.label} style={styles.group}>
          <Text style={styles.groupLabel}>{group.label}</Text>
          {group.npcs.map((npc) => {
            const relationship = gameState.relationships[npc.id] ?? { trust: 0, friendship: 0, grudge: 0 };
            const label = deriveRelationshipLabel(relationship);
            const score = deriveRelationshipScore(relationship);
            const avatar = selectNpcAvatar(gameState, npc.id);
            return (
              <Card key={npc.id} onPress={() => setSelectedNpcId(npc.id)} testID={`npc-row-${npc.id}`}>
                <View style={styles.rowContent}>
                  {avatar && <AvatarRenderer avatar={avatar} expression="normal" size={40} accessibilityLabel={`${npc.identity.name} avatarı`} />}
                  <View style={styles.rowText}>
                    <Text style={styles.rowName}>{npc.identity.name}</Text>
                    <RelationshipBar label={label} score={score} compact />
                  </View>
                  <Icon name="chevronRight" size={16} color={colors.textMuted} />
                </View>
              </Card>
            );
          })}
        </View>
      ))}

      <Modal visible={!!detail} animationType="slide" transparent onRequestClose={() => setSelectedNpcId(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {detail && (
              <>
                {detail.avatar && (
                  <AvatarRenderer avatar={detail.avatar} expression="normal" size={84} accessibilityLabel={`${detail.name} avatarı`} />
                )}
                <Text style={styles.detailName}>{detail.name}</Text>
                <Text style={styles.detailRole}>{detail.roleLabel}</Text>
                <Text style={styles.detailLine}>{detail.tenureLabel}</Text>
                <RelationshipBar label={detail.relationshipLabel} score={detail.relationshipScore} />

                <Text style={styles.historyHeading}>İLİŞKİ GEÇMİŞİ</Text>
                {detail.history.length === 0 ? (
                  <EmptyState text="Henüz kayda değer bir etkileşim yok." />
                ) : (
                  detail.history.map((entry, i) => (
                    <View key={i} style={styles.historyRow}>
                      <Text style={[styles.historyDirection, { color: entry.direction === 'positive' ? colors.success : entry.direction === 'negative' ? colors.danger : colors.textMuted }]}>
                        {DIRECTION_ICON[entry.direction]}
                      </Text>
                      <Text style={styles.historyText}>{entry.summary}</Text>
                    </View>
                  ))
                )}

                <Pressable style={styles.closeButton} onPress={() => setSelectedNpcId(null)} accessibilityRole="button" testID="btn-close-npc-detail">
                  <Text style={styles.closeButtonText}>Kapat</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.bgBase },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xl, backgroundColor: colors.bgBase },
  institutionName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  institutionLine: { fontSize: 13, color: colors.textSecondary, marginBottom: spacing.sm },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  cultureNote: { fontSize: 10, color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic' },
  onCallSummary: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  onCallSummaryLine: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  search: {
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceCard, borderRadius: 10,
    paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.textPrimary, fontSize: 14,
  },
  group: { gap: spacing.sm },
  groupLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },
  rowContent: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: 4 },
  rowName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  modalBackdrop: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bgElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl, gap: spacing.sm, maxHeight: '85%' },
  detailName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.sm },
  detailRole: { fontSize: 13, color: colors.textSecondary },
  detailLine: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm },
  historyHeading: { ...typography.sectionHeading, marginTop: spacing.md },
  historyRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: 6 },
  historyDirection: { fontSize: 14, fontWeight: '700' },
  historyText: { fontSize: 12, color: colors.textSecondary, flex: 1 },
  closeButton: { marginTop: spacing.lg, alignItems: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.borderStrong },
  closeButtonText: { color: colors.textPrimary, fontWeight: '600' },
});
