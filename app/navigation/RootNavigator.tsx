import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import HospitalScreen from '../screens/HospitalScreen';
import SpendingScreen from '../screens/SpendingScreen';
import ProfileStackNavigator from './ProfileStackNavigator';
import Icon, { type IconName } from '../components/ui/Icon';
import { colors } from '../theme/tokens';

// Gameplay Expansion Part B §1 — final primary navigation: Ana Sayfa /
// Hastane / Harcamalar / Profil. The standalone İlişkiler destination is
// gone — its functionality now lives inside Hastane (see HospitalScreen).
export type RootTabParamList = {
  AnaSayfa: undefined;
  Hastane: undefined;
  Harcamalar: undefined;
  Profil: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICON: Record<keyof RootTabParamList, IconName> = {
  AnaSayfa: 'home',
  Hastane: 'hospital',
  Harcamalar: 'spending',
  Profil: 'profile',
};

// Nested inside RootStack's "Residency" screen — must not render its own
// NavigationContainer, react-navigation only allows one for the whole app.
export default function RootNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.bgElevated, borderTopColor: colors.border, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => <Icon name={TAB_ICON[route.name as keyof RootTabParamList]} color={color} size={size ?? 20} />,
      })}
    >
      <Tab.Screen name="AnaSayfa" component={HomeScreen} options={{ title: 'Ana Sayfa' }} />
      <Tab.Screen name="Hastane" component={HospitalScreen} options={{ title: 'Hastane' }} />
      <Tab.Screen name="Harcamalar" component={SpendingScreen} options={{ title: 'Harcamalar' }} />
      <Tab.Screen name="Profil" component={ProfileStackNavigator} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}
