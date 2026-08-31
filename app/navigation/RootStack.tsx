import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainMenuScreen from '../screens/MainMenuScreen';
import CharacterCreationScreen from '../screens/CharacterCreation/CharacterCreationScreen';
import TusPrepProfileScreen from '../screens/Tus/TusPrepProfileScreen';
import TusExamDayScreen from '../screens/Tus/TusExamDayScreen';
import TusResultScreen from '../screens/Tus/TusResultScreen';
import TusPreferenceListScreen from '../screens/Tus/TusPreferenceListScreen';
import TusPreferenceConfirmScreen from '../screens/Tus/TusPreferenceConfirmScreen';
import RootNavigator from './RootNavigator';
import type { GameState } from '../domain/state/types';

export type RootStackParamList = {
  MainMenu: undefined;
  CharacterCreation: undefined;
  TusPrepProfile: undefined;
  TusExamDay: undefined;
  TusResult: undefined;
  TusPreferenceList: undefined;
  TusPreferenceConfirm: { programId: string };
  Residency: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Every route except TusPreferenceConfirm (which needs a programId param)
// — resuming a save never lands directly on a program's confirm screen.
export type EntryRouteName = Exclude<keyof RootStackParamList, 'TusPreferenceConfirm'>;

// Resumes to the exact TUS checkpoint the player last reached — see
// tus.step in domain/state/types.ts. Phases without a real screen yet
// (gameover/specialist) fall back to Residency until they're implemented.
export function resolveEntryRoute(state: GameState | null): EntryRouteName {
  if (!state) return 'CharacterCreation';

  switch (state.career.phase) {
    case 'character_creation':
      return 'CharacterCreation';
    case 'tus':
      switch (state.tus.step) {
        case 'prep':
          return 'TusPrepProfile';
        case 'exam':
          return 'TusExamDay';
        case 'result':
          return 'TusResult';
        default:
          return 'TusPrepProfile';
      }
    case 'preference':
      return 'TusPreferenceList';
    case 'residency':
    default:
      return 'Residency';
  }
}

export default function RootStack() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="MainMenu">
        <Stack.Screen name="MainMenu" component={MainMenuScreen} />
        <Stack.Screen name="CharacterCreation" component={CharacterCreationScreen} />
        <Stack.Screen name="TusPrepProfile" component={TusPrepProfileScreen} />
        <Stack.Screen name="TusExamDay" component={TusExamDayScreen} />
        <Stack.Screen name="TusResult" component={TusResultScreen} />
        <Stack.Screen name="TusPreferenceList" component={TusPreferenceListScreen} />
        <Stack.Screen name="TusPreferenceConfirm" component={TusPreferenceConfirmScreen} />
        <Stack.Screen name="Residency" component={RootNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
