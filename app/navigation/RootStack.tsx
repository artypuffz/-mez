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
import SpecialistEndingScreen from '../screens/SpecialistEndingScreen';
import CareerReportScreen from '../screens/CareerReportScreen';
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
  SpecialistEnding: undefined;
  CareerReport: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Every route except TusPreferenceConfirm (which needs a programId param)
// — resuming a save never lands directly on a program's confirm screen.
export type EntryRouteName = Exclude<keyof RootStackParamList, 'TusPreferenceConfirm'>;

// Resumes to the exact TUS checkpoint the player last reached — see
// tus.step in domain/state/types.ts. "specialist_exam" resumes to
// Residency (its own weekly-advance loop lives on HomeScreen, same as
// residency) rather than a dedicated screen — there's nothing else to
// show between exam stages.
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
    case 'specialist':
      return 'SpecialistEnding';
    case 'specialist_exam':
    case 'residency':
    default:
      return 'Residency';
  }
}

// Phase 9, extended Phase 10 — a resignation/game-over OR a successful
// specialist ending can happen mid-session from any screen inside the
// Residency tab navigator (resolving a crisis or exam-result choice on
// HomeScreen, most likely). Watching gameState.career.phase here, at the
// top of the whole app, means every such screen gets the transition for
// free instead of each one needing its own navigate-on-ending logic.
function useEndingRedirect(navigationRef: ReturnType<typeof useNavigationContainerRef<RootStackParamList>>) {
  const phase = useGameStore((s) => s.gameState?.career.phase);

  useEffect(() => {
    if (phase !== 'gameover' && phase !== 'specialist') return;
    if (!navigationRef.isReady()) return;
    const target = phase === 'gameover' ? 'GameOver' : 'SpecialistEnding';
    if (navigationRef.getCurrentRoute()?.name === target) return;
    // RC2 (RC-IMP-003) — a plain .navigate() left the Residency stack
    // entry (and its nested tab state) sitting right below this one in
    // history: Android back from here popped back into a HomeScreen that
    // rendered as if gameplay were still live (branch/hospital/city stay
    // set after a career ends), even though advanceWeek's own phase guard
    // silently no-ops there. A full reset makes this the only entry —
    // nothing left to back into.
    navigationRef.reset({ index: 0, routes: [{ name: target }] });
  }, [phase, navigationRef]);
}

// RC2 (§6/§19) — a dev-only navigation inspection bridge, same pattern
// and same safety guarantee as the store's __COMEZ_DEBUG__ (see
// store/useGameStore.ts): `__DEV__` is false in a release build, so this
// is a no-op there. Lets the E2E harness assert on the actual
// react-navigation stack shape (route count, current route name) after a
// terminal transition, since there's no real Android hardware back
// button to press in this environment and the web build doesn't sync to
// browser history — goBack() here calls react-navigation's own
// dispatcher directly, the same thing Android's hardware back would.
function useNavigationDebugBridge(navigationRef: ReturnType<typeof useNavigationContainerRef<RootStackParamList>>) {
  useEffect(() => {
    if (!__DEV__ || typeof window === 'undefined') return;
    const existing = (window as unknown as { __COMEZ_DEBUG__?: Record<string, unknown> }).__COMEZ_DEBUG__ ?? {};
    (window as unknown as { __COMEZ_DEBUG__: Record<string, unknown> }).__COMEZ_DEBUG__ = {
      ...existing,
      getNavigationState: () => navigationRef.getRootState(),
      navigationGoBack: () => {
        if (navigationRef.canGoBack()) {
          navigationRef.goBack();
          return true;
        }
        return false;
      },
    };
  }, [navigationRef]);
}

export default function RootStack() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  useEndingRedirect(navigationRef);
  useNavigationDebugBridge(navigationRef);

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
        <Stack.Screen name="SpecialistEnding" component={SpecialistEndingScreen} />
        <Stack.Screen name="CareerReport" component={CareerReportScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
