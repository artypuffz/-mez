import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootStack from './navigation/RootStack';

export default function App() {
  return (
    <SafeAreaProvider>
      <RootStack />
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
