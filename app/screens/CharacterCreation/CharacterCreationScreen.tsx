import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootStack';
import { useGameStore } from '../../store/useGameStore';
import { BACKGROUND_DEFINITIONS } from '../../domain/config/backgrounds';
import type { BackgroundId } from '../../domain/state/types';
import type { Gender } from '../../domain/state/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CharacterCreation'>;

const MIN_AGE = 23;
const MAX_AGE = 32;

const GENDER_OPTIONS: { id: Gender; label: string }[] = [
  { id: 'kadın', label: 'Kadın' },
  { id: 'erkek', label: 'Erkek' },
  { id: 'belirtmek_istemiyorum', label: 'Belirtmek istemiyorum' },
];

type Step = 1 | 2 | 3;

export default function CharacterCreationScreen({ navigation }: Props) {
  const createNewGame = useGameStore((s) => s.createNewGame);

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState<Gender>('belirtmek_istemiyorum');
  const [hometown, setHometown] = useState('');
  const [background, setBackground] = useState<BackgroundId | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const trimmedName = name.trim();
  const trimmedHometown = hometown.trim();

  const step1Valid = trimmedName.length > 0 && trimmedHometown.length > 0;
  const step2Valid = background !== null;

  const handleStart = async () => {
    if (!background || submitting) return;
    setSubmitting(true);
    await createNewGame({
      name: trimmedName,
      age,
      gender,
      hometown: trimmedHometown,
      background,
    });
    navigation.replace('TusPrepProfile');
  };

  const selectedBackground = BACKGROUND_DEFINITIONS.find((b) => b.id === background) ?? null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.stepIndicator}>Adım {step}/3</Text>

      {step === 1 && (
        <View style={styles.stepBody}>
          <Text style={styles.heading}>Temel Bilgiler</Text>

          <Text style={styles.label}>İsim</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Adın"
            maxLength={40}
            accessibilityLabel="İsim"
            testID="input-name"
          />

          <Text style={styles.label}>Yaş: {age}</Text>
          <View style={styles.ageRow}>
            <Pressable
              style={styles.stepperButton}
              disabled={age <= MIN_AGE}
              onPress={() => setAge((a) => Math.max(MIN_AGE, a - 1))}
              accessibilityRole="button"
              accessibilityLabel="Yaşı azalt"
            >
              <Text style={styles.stepperButtonText}>−</Text>
            </Pressable>
            <Text style={styles.ageValue}>{age}</Text>
            <Pressable
              style={styles.stepperButton}
              disabled={age >= MAX_AGE}
              onPress={() => setAge((a) => Math.min(MAX_AGE, a + 1))}
              accessibilityRole="button"
              accessibilityLabel="Yaşı artır"
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Cinsiyet</Text>
          <View style={styles.chipRow}>
            {GENDER_OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                style={[styles.chip, gender === opt.id && styles.chipSelected]}
                onPress={() => setGender(opt.id)}
                accessibilityRole="button"
              >
                <Text style={[styles.chipText, gender === opt.id && styles.chipTextSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Memleket</Text>
          <TextInput
            style={styles.input}
            value={hometown}
            onChangeText={setHometown}
            placeholder="Şehir"
            maxLength={40}
            accessibilityLabel="Memleket"
            testID="input-hometown"
          />

          <Pressable
            style={[styles.primaryButton, !step1Valid && styles.buttonDisabled]}
            disabled={!step1Valid}
            onPress={() => setStep(2)}
            accessibilityRole="button"
            testID="btn-step1-next"
          >
            <Text style={styles.primaryButtonText}>İleri</Text>
          </Pressable>
        </View>
      )}

      {step === 2 && (
        <View style={styles.stepBody}>
          <Text style={styles.heading}>Geçmiş</Text>
          {BACKGROUND_DEFINITIONS.map((def) => (
            <Pressable
              key={def.id}
              style={[styles.card, background === def.id && styles.cardSelected]}
              onPress={() => setBackground(def.id)}
              accessibilityRole="button"
              testID={`background-${def.id}`}
            >
              <Text style={styles.cardTitle}>{def.label}</Text>
              <Text style={styles.cardDescription}>{def.shortDescription}</Text>
            </Pressable>
          ))}

          <View style={styles.navRow}>
            <Pressable style={styles.secondaryButton} onPress={() => setStep(1)} accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>Geri</Text>
            </Pressable>
            <Pressable
              style={[styles.primaryButton, !step2Valid && styles.buttonDisabled]}
              disabled={!step2Valid}
              onPress={() => setStep(3)}
              accessibilityRole="button"
              testID="btn-step2-next"
            >
              <Text style={styles.primaryButtonText}>İleri</Text>
            </Pressable>
          </View>
        </View>
      )}

      {step === 3 && selectedBackground && (
        <View style={styles.stepBody}>
          <Text style={styles.heading}>Özet</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryName}>Dr. {trimmedName}</Text>
            <Text style={styles.summaryLine}>{age} yaş</Text>
            <Text style={styles.summaryLine}>{trimmedHometown}</Text>
            <Text style={styles.summaryLine}>{selectedBackground.label}</Text>
          </View>

          <View style={styles.navRow}>
            <Pressable style={styles.secondaryButton} onPress={() => setStep(2)} accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>Geri</Text>
            </Pressable>
            <Pressable
              style={styles.primaryButton}
              onPress={handleStart}
              disabled={submitting}
              accessibilityRole="button"
              testID="btn-start-tus"
            >
              <Text style={styles.primaryButtonText}>
                {submitting ? '...' : "TUS'A GİR"}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 16 },
  stepIndicator: { fontSize: 12, color: '#888' },
  stepBody: { gap: 14 },
  heading: { fontSize: 22, fontWeight: '700' },
  label: { fontSize: 13, color: '#555', marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: { fontSize: 18, fontWeight: '700' },
  ageValue: { fontSize: 16, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  chipSelected: { backgroundColor: '#222', borderColor: '#222' },
  chipText: { fontSize: 13, color: '#333' },
  chipTextSelected: { color: '#fff' },
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 14,
    gap: 4,
  },
  cardSelected: { borderColor: '#222', borderWidth: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardDescription: { fontSize: 13, color: '#666' },
  navRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  primaryButton: {
    backgroundColor: '#222',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  primaryButtonText: { color: '#fff', fontWeight: '600' },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  secondaryButtonText: { color: '#333', fontWeight: '600' },
  buttonDisabled: { backgroundColor: '#ccc' },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 20,
    gap: 6,
    alignItems: 'center',
  },
  summaryName: { fontSize: 18, fontWeight: '700' },
  summaryLine: { fontSize: 14, color: '#444' },
});
