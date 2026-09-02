import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ProfileScreen from '../screens/ProfileScreen';
import CareerStatisticsScreen from '../screens/CareerStatisticsScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import SettingsScreen from '../screens/SettingsScreen';

// Gameplay Expansion Part B §17/§18/§19/§20 — Profil is a small stack of
// its own (nested inside the Profil tab), so İstatistikler/Başarımlar/
// Ayarlar are real, separately navigable screens rather than one
// overloaded Profile screen — without touching the outer RootStack at all.
export type ProfileStackParamList = {
  ProfileHome: undefined;
  CareerStatistics: undefined;
  Achievements: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} />
      <Stack.Screen name="CareerStatistics" component={CareerStatisticsScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
