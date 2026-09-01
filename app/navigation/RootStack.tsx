import { useEffect } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainMenuScreen from '../screens/MainMenuScreen';
import { useGameStore } from '../store/useGameStore';
import CharacterCreationScreen from '../screens/CharacterCreation/CharacterCreationScreen';
import TusPrepProfileScreen from '../screens/Tus/TusPrepProfileScreen';
import TusExamDayScreen from '../screens/Tus/TusExamDayScreen';
import TusResultScreen from '../screens/Tus/TusResultScreen';
import TusPreferenceListScreen from '../screens/Tus/TusPreferenceListScreen';
import TusPreferenceConfirmScreen from '../screens/Tus/TusPreferenceConfirmScreen';
import GameOverScreen from '../screens/GameOverScreen';
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
  GameOver: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Every route except TusPreferenceConfirm (which needs a programId param)
// — resuming a save never lands directly on a program's confirm screen.
export type EntryRouteName = Exclude<keyof RootStackParamList, 'TusPreferenceConfirm'>;

// Resumes to the exact TUS checkpoint the player last reached — see
// tus.step in domain/state/types.ts. "specialist" has no real screen yet
// and falls back to Residency until Phase 10 implements it.
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
    case 'gameover':
      return 'GameOver';
    case 'residency':
    default:
      return 'Residency';
  }
}

// Phase 9 — a resignation/game-over can happen mid-session from any
// screen inside the Residency tab navigator (resolving a crisis choice on
// HomeScreen, most likely). Watching gameState.career.phase here, at the
// top of the whole app, means every such screen gets the transition for
// free instead of each one needing its own navigate-on-gameover logic.
function useGameOverRedirect(navigationRef: ReturnType<typeof useNavigationContainerRef<RootStackParamList>>) {
  const phase = useGameStore((s) => s.gameState?.career.phase);

  useEffect(() => {
    if (phase !== 'gameover') return;
    if (!navigationRef.isReady()) return;
    if (navigationRef.getCurrentRoute()?.name === 'GameOver') return;
    navigationRef.navigate('GameOver');
  }, [phase, navigationRef]);
}

export default function RootStack() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  useGameOverRedirect(navigationRef);

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="MainMenu">
        <Stack.Screen name="MainMenu" component={MainMenuScreen} />
        <Stack.Screen name="CharacterCreation" component={CharacterCreationScreen} />
        <Stack.Screen name="TusPrepProfile" component={TusPrepProfileScreen} />
        <Stack.Screen name="TusExamDay" component={TusExamDayScreen} />
        <Stack.Screen name="TusResult" component={TusResultScreen} />
        <Stack.Screen name="TusPreferenceList" component={TusPreferenceListScreen} />
        <Stack.Screen name="TusPreferenceConfirm" component={TusPreferenceConfirmScreen} />
        <Stack.Screen name="Residency" component={RootNavigator} />
        <Stack.Screen name="GameOver" component={GameOverScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
