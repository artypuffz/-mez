import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootStack';
import { useGameStore } from '../../store/useGameStore';
import { TUS_PREP_PROFILE_DEFINITIONS } from '../../domain/config/tusPrepProfiles';

type Props = NativeStackScreenProps<RootStackParamList, 'TusPrepProfile'>;

export default function TusPrepProfileScreen({ navigation }: Props) {
  const selectTusPrepProfile = useGameStore((s) => s.selectTusPrepProfile);

  const handleSelect = async (profileId: (typeof TUS_PREP_PROFILE_DEFINITIONS)[number]['id']) => {
    await selectTusPrepProfile(profileId);
    navigation.replace('TusExamDay');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>TUS</Text>
      <Text style={styles.question}>Son altı ay TUS'a nasıl hazırlandın?</Text>
      <View style={styles.list}>
        {TUS_PREP_PROFILE_DEFINITIONS.map((profile) => (
          <Pressable key={profile.id} style={styles.card} onPress={() => handleSelect(profile.id)}>
            <Text style={styles.cardTitle}>{profile.title}</Text>
            <Text style={styles.cardDescription}>{profile.description}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 16 },
  heading: { fontSize: 26, fontWeight: '700' },
  question: { fontSize: 15, color: '#444' },
  list: { gap: 10, marginTop: 8 },
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardDescription: { fontSize: 13, color: '#666' },
});
