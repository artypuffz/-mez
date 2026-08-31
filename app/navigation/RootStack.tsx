import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainMenuScreen from '../screens/MainMenuScreen';
import CharacterCreationScreen from '../screens/CharacterCreation/CharacterCreationScreen';
import TusPlaceholderScreen from '../screens/TusPlaceholderScreen';
import RootNavigator from './RootNavigator';
import type { GameState } from '../domain/state/types';

export type RootStackParamList = {
  MainMenu: undefined;
  CharacterCreation: undefined;
  TusPlaceholder: undefined;
  Residency: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Phases beyond "tus" (preference/residency/gameover/specialist) don't have
// real screens yet — they fall back to the TUS placeholder until the phase
// that implements them exists.
export function resolveEntryRoute(state: GameState | null): keyof RootStackParamList {
  if (!state) return 'CharacterCreation';
  if (state.career.phase === 'character_creation') return 'CharacterCreation';
  return 'TusPlaceholder';
}

export default function RootStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="MainMenu">
        <Stack.Screen name="MainMenu" component={MainMenuScreen} />
        <Stack.Screen name="CharacterCreation" component={CharacterCreationScreen} />
        <Stack.Screen name="TusPlaceholder" component={TusPlaceholderScreen} />
        <Stack.Screen name="Residency" component={RootNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
