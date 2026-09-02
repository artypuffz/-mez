import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootStack';
import { useGameStore } from '../../store/useGameStore';
import { BACKGROUND_DEFINITIONS } from '../../domain/config/backgrounds';
import type { BackgroundId, Gender } from '../../domain/state/types';
import type { PlayerAvatar } from '../../domain/avatar/types';
import { DEFAULT_PLAYER_AVATAR } from '../../domain/avatar/options';
import {
  EYEBROW_STYLE_OPTIONS, EYE_STYLE_OPTIONS, FACE_SHAPE_OPTIONS, FACIAL_HAIR_OPTIONS,
  GLASSES_OPTIONS, HAIR_COLOR_OPTIONS, HAIR_STYLE_OPTIONS, DETAIL_OPTIONS, SKIN_TONE_OPTIONS,
} from '../../domain/avatar/options';
import { randomizePlayerAvatar } from '../../domain/avatar/randomize';
import { createScopedRng, generateRandomSeed } from '../../domain/rng/seededRng';
import AvatarRenderer from '../../components/avatar/AvatarRenderer';
import Button from '../../components/ui/Button';
import { colors, radius, spacing } from '../../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'CharacterCreation'>;

const MIN_AGE = 23;
const MAX_AGE = 32;

const GENDER_OPTIONS: { id: Gender; label: string }[] = [
  { id: 'kadın', label: 'Kadın' },
  { id: 'erkek', label: 'Erkek' },
  { id: 'belirtmek_istemiyorum', label: 'Belirtmek istemiyorum' },
];

type Step = 1 | 2 | 3 | 4;

// §26 — one compact swatch-row per avatar category, color chips for
// skin/hair, label chips otherwise. Visual/touch-friendly rather than a
// dropdown form.
function SwatchRow<T extends string>({
  title, options, value, onChange, colorSwatches,
}: {
  title: string;
  options: { id: T; label: string; hex?: string }[];
  value: T;
  onChange: (id: T) => void;
  colorSwatches?: boolean;
}) {
  return (
    <View style={styles.swatchBlock}>
      <Text style={styles.swatchTitle}>{title}</Text>
      <View style={styles.swatchRow}>
        {options.map((opt) => {
          const selected = opt.id === value;
          if (colorSwatches && opt.hex) {
            return (
              <Pressable
                key={opt.id}
                onPress={() => onChange(opt.id)}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                testID={`avatar-${title}-${opt.id}`}
                style={[styles.colorSwatch, { backgroundColor: opt.hex }, selected && styles.colorSwatchSelected]}
              />
            );
          }
          return (
            <Pressable
              key={opt.id}
              onPress={() => onChange(opt.id)}
              accessibilityRole="button"
              style={[styles.chip, selected && styles.chipSelected]}
              testID={`avatar-${title}-${opt.id}`}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function CharacterCreationScreen({ navigation }: Props) {
  const createNewGame = useGameStore((s) => s.createNewGame);

  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState<Gender>('belirtmek_istemiyorum');
  const [hometown, setHometown] = useState('');
  const [background, setBackground] = useState<BackgroundId | null>(null);
  const [avatar, setAvatar] = useState<PlayerAvatar>(DEFAULT_PLAYER_AVATAR);
  const [submitting, setSubmitting] = useState(false);

  // §28 — one root entropy point (same pattern as the save's own
  // generateRandomSeed), then every subsequent Randomize press derives
  // from it via createScopedRng — deterministic from that point on, never
  // a raw Math.random() per press. Only ever used pre-career-start; once
  // createNewGame runs, this avatar is frozen into the save.
  const [rerollSeed] = useState(() => generateRandomSeed());
  const [rerollCount, setRerollCount] = useState(0);

  const trimmedName = name.trim();
  const trimmedHometown = hometown.trim();

  const step1Valid = trimmedName.length > 0 && trimmedHometown.length > 0;
  const step2Valid = background !== null;

  const handleRandomize = () => {
    const rng = createScopedRng(rerollSeed, `avatar:randomize:${rerollCount}`);
    setAvatar(randomizePlayerAvatar(rng));
    setRerollCount((c) => c + 1);
  };

  const set = <K extends keyof PlayerAvatar>(key: K, value: PlayerAvatar[K]) => setAvatar((a) => ({ ...a, [key]: value }));

  const handleStart = async () => {
    if (!background || submitting) return;
    setSubmitting(true);
    await createNewGame({
      name: trimmedName,
      age,
      gender,
      hometown: trimmedHometown,
      background,
      avatar,
    });
    navigation.replace('TusPrepProfile');
  };

  const selectedBackground = BACKGROUND_DEFINITIONS.find((b) => b.id === background) ?? null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.stepIndicator}>Adım {step}/4</Text>

      {step === 1 && (
        <View style={styles.stepBody}>
          <Text style={styles.heading}>Temel Bilgiler</Text>

          <Text style={styles.label}>İsim</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Adın"
            placeholderTextColor={colors.textMuted}
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
            placeholderTextColor={colors.textMuted}
            maxLength={40}
            accessibilityLabel="Memleket"
            testID="input-hometown"
          />

          <Button label="İleri" onPress={() => setStep(2)} disabled={!step1Valid} testID="btn-step1-next" />
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
            <View style={{ flex: 1 }}>
              <Button label="İleri" onPress={() => setStep(3)} disabled={!step2Valid} testID="btn-step2-next" />
            </View>
          </View>
        </View>
      )}

      {step === 3 && (
        <View style={styles.stepBody}>
          <Text style={styles.heading}>Görünüş</Text>

          <View style={styles.avatarPreviewRow}>
            <AvatarRenderer avatar={avatar} size={110} accessibilityLabel="Karakter önizlemesi" />
            <View style={{ flex: 1 }}>
              <Button label="🎲 Rastgele Görünüş" variant="secondary" onPress={handleRandomize} testID="btn-randomize-avatar" />
            </View>
          </View>

          <SwatchRow title="Ten Rengi" options={SKIN_TONE_OPTIONS} value={avatar.skinTone} onChange={(v) => set('skinTone', v)} colorSwatches />
          <SwatchRow title="Yüz Şekli" options={FACE_SHAPE_OPTIONS} value={avatar.faceShape} onChange={(v) => set('faceShape', v)} />
          <SwatchRow title="Saç Modeli" options={HAIR_STYLE_OPTIONS} value={avatar.hairStyle} onChange={(v) => set('hairStyle', v)} />
          <SwatchRow title="Saç Rengi" options={HAIR_COLOR_OPTIONS} value={avatar.hairColor} onChange={(v) => set('hairColor', v)} colorSwatches />
          <SwatchRow title="Kaş" options={EYEBROW_STYLE_OPTIONS} value={avatar.eyebrowStyle} onChange={(v) => set('eyebrowStyle', v)} />
          <SwatchRow title="Göz" options={EYE_STYLE_OPTIONS} value={avatar.eyeStyle} onChange={(v) => set('eyeStyle', v)} />
          <SwatchRow title="Sakal" options={FACIAL_HAIR_OPTIONS} value={avatar.facialHair} onChange={(v) => set('facialHair', v)} />
          <SwatchRow title="Gözlük" options={GLASSES_OPTIONS} value={avatar.glasses} onChange={(v) => set('glasses', v)} />
          <SwatchRow title="Detay" options={DETAIL_OPTIONS} value={avatar.detail} onChange={(v) => set('detail', v)} />

          <View style={styles.navRow}>
            <Pressable style={styles.secondaryButton} onPress={() => setStep(2)} accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>Geri</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Button label="İleri" onPress={() => setStep(4)} testID="btn-step3-next" />
            </View>
          </View>
        </View>
      )}

      {step === 4 && selectedBackground && (
        <View style={styles.stepBody}>
          <Text style={styles.heading}>Özet</Text>
          <View style={styles.summaryCard}>
            <AvatarRenderer avatar={avatar} size={80} accessibilityLabel="Karakter önizlemesi" />
            <Text style={styles.summaryName}>Dr. {trimmedName}</Text>
            <Text style={styles.summaryLine}>{age} yaş</Text>
            <Text style={styles.summaryLine}>{trimmedHometown}</Text>
            <Text style={styles.summaryLine}>{selectedBackground.label}</Text>
          </View>

          <View style={styles.navRow}>
            <Pressable style={styles.secondaryButton} onPress={() => setStep(3)} accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>Geri</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Button label={submitting ? '...' : "TUS'A GİR"} onPress={handleStart} disabled={submitting} testID="btn-start-tus" />
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.xl, gap: spacing.lg, backgroundColor: colors.bgBase },
  stepIndicator: { fontSize: 12, color: colors.textMuted },
  stepBody: { gap: spacing.md },
  heading: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  label: { fontSize: 13, color: colors.textSecondary, marginTop: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
  },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  stepperButton: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceCardAlt,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border,
  },
  stepperButtonText: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  ageValue: { fontSize: 16, fontWeight: '600', minWidth: 24, textAlign: 'center', color: colors.textPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceCard,
    borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 10, minHeight: 40, justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 13, color: colors.textSecondary },
  chipTextSelected: { color: colors.textOnAccent, fontWeight: '700' },
  card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceCard, borderRadius: radius.lg, padding: spacing.md, gap: 4 },
  cardSelected: { borderColor: colors.accent, borderWidth: 2, backgroundColor: colors.accentMuted },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  cardDescription: { fontSize: 13, color: colors.textSecondary },
  navRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, alignItems: 'center' },
  secondaryButton: {
    paddingVertical: 14, paddingHorizontal: 20, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center',
  },
  secondaryButtonText: { color: colors.textPrimary, fontWeight: '600' },
  summaryCard: {
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceCard, borderRadius: radius.lg,
    padding: spacing.xl, gap: spacing.xs, alignItems: 'center',
  },
  summaryName: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.sm },
  summaryLine: { fontSize: 14, color: colors.textSecondary },
  avatarPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  swatchBlock: { gap: spacing.xs },
  swatchTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.3 },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  colorSwatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchSelected: { borderColor: colors.accent },
});
