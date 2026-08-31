import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import HomeScreen from '../screens/HomeScreen';
import HospitalScreen from '../screens/HospitalScreen';
import RelationshipsScreen from '../screens/RelationshipsScreen';
import ProfileScreen from '../screens/ProfileScreen';

export type RootTabParamList = {
  AnaSayfa: undefined;
  Hastane: undefined;
  Iliskiler: undefined;
  Profil: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

// Nested inside RootStack's "Residency" screen — must not render its own
// NavigationContainer, react-navigation only allows one for the whole app.
export default function RootNavigator() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="AnaSayfa" component={HomeScreen} options={{ title: 'Ana Sayfa' }} />
      <Tab.Screen name="Hastane" component={HospitalScreen} options={{ title: 'Hastane' }} />
      <Tab.Screen name="Iliskiler" component={RelationshipsScreen} options={{ title: 'İlişkiler' }} />
      <Tab.Screen name="Profil" component={ProfileScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}
