import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';

import type { ProfileStackParamList } from '../navigation/ProfileStackNavigator';
import { useGameStore } from '../store/useGameStore';
import Card from '../components/ui/Card';
import ScreenHeader from '../components/ui/ScreenHeader';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import { colors, spacing } from '../theme/tokens';
import packageJson from '../package.json';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Settings'>;

// Gameplay Expansion Part B §20 — only real, working controls. No sound,
// notification, or difficulty system exists yet, so no toggle for any of
// those appears here — the only real action available is resetting the
// save (which resetGame() genuinely does), plus static build info.
export default function SettingsScreen({ navigation }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  const resetGame = useGameStore((s) => s.resetGame);

  const handleReset = () => {
    Alert.alert(
      'Kaydı Sıfırla',
      'Mevcut kariyerin kalıcı olarak silinecek. Emin misin?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, sil',
          style: 'destructive',
          onPress: async () => {
            await resetGame();
            // Settings is nested two levels below the outer app stack
            // (ProfileStack -> tab navigator -> RootStack's "Residency"
            // screen) — walk up to the root navigator to reset all the
            // way back to MainMenu, the same full-reset pattern
            // RootStack.tsx's own ending redirect uses.
            const tabNav = navigation.getParent();
            const rootNav = tabNav?.getParent();
            rootNav?.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'MainMenu' }] }));
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} testID="settings-screen">
      <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" style={styles.backRow} testID="btn-back-settings">
        <Icon name="back" size={18} color={colors.accent} />
        <Text style={styles.backText}>Profil</Text>
      </Pressable>
      <ScreenHeader title="Ayarlar" icon="settings" />

      <Card>
        <Text style={styles.sectionHeading}>KAYIT</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Kayıt sürümü</Text>
          <Text style={styles.infoValue}>{gameState?.meta.saveVersion ?? '—'}</Text>
        </View>
        <Button label="Kaydı Sıfırla" variant="destructive" onPress={handleReset} testID="btn-reset-save" />
      </Card>

      <Card>
        <Text style={styles.sectionHeading}>UYGULAMA</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Sürüm</Text>
          <Text style={styles.infoValue}>{packageJson.version}</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.bgBase },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  sectionHeading: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, letterSpacing: 0.4, marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontSize: 13, color: colors.textSecondary },
  infoValue: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
});
