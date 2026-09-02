import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { ProfileStackParamList } from '../navigation/ProfileStackNavigator';
import { useGameStore } from '../store/useGameStore';
import { selectAchievements } from '../domain/achievements/selectors';
import Card from '../components/ui/Card';
import ScreenHeader from '../components/ui/ScreenHeader';
import Badge from '../components/ui/Badge';
import Icon from '../components/ui/Icon';
import EmptyState from '../components/ui/EmptyState';
import { colors, spacing } from '../theme/tokens';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Achievements'>;

// Gameplay Expansion Part B §19 — never a scoring system (no "X/12", no
// points). Just cards: unlocked or not, real requirement, restrained
// serious/deadpan tone content.
export default function AchievementsScreen({ navigation }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  const achievements = gameState ? selectAchievements(gameState) : [];

  return (
    <ScrollView contentContainerStyle={styles.container} testID="achievements-screen">
      <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.backRow} testID="btn-back-achievements">
        <Icon name="back" size={18} color={colors.accent} />
        <Text style={styles.backText}>Profil</Text>
      </Pressable>
      <ScreenHeader title="Başarımlar" icon="achievements" />

      {achievements.length === 0 ? (
        <EmptyState icon="achievements" text="Henüz bir başarım yok." />
      ) : (
        achievements.map(({ def, unlocked }) => (
          <Card key={def.id} variant={unlocked ? 'success' : 'standard'} testID={`achievement-${def.id}`}>
            <View style={styles.row}>
              <Icon name="achievements" size={22} color={unlocked ? colors.success : colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, !unlocked && styles.titleLocked]}>{def.title}</Text>
                <Text style={styles.description}>{def.description}</Text>
              </View>
              {!unlocked && <Badge label="Kilitli" tone="neutral" />}
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.bgBase },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  titleLocked: { color: colors.textMuted },
  description: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
});
