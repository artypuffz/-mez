import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/tokens';

// Gameplay Expansion Part D section 40 — ONE semantic name per gameplay
// concept, mapped to a real Ionicons glyph here. Screens/nav ask for
// "health" or "schedule", never an Ionicons name directly — swapping the
// underlying icon set later is a one-file change.
export type IconName =
  | 'home' | 'hospital' | 'spending' | 'profile' | 'money' | 'time'
  | 'health' | 'social' | 'stress' | 'fatigue' | 'burnout'
  | 'schedule' | 'relationship' | 'settings' | 'achievements'
  | 'back' | 'search' | 'close' | 'chevronRight' | 'lifestyle' | 'ownership'
  | 'add' | 'checkmark';

const ICON_MAP: Record<IconName, keyof typeof Ionicons.glyphMap> = {
  home: 'home',
  hospital: 'business',
  spending: 'wallet',
  profile: 'person-circle',
  money: 'cash',
  time: 'time',
  health: 'fitness',
  social: 'people',
  stress: 'flame',
  fatigue: 'battery-half',
  burnout: 'flash-off',
  schedule: 'calendar',
  relationship: 'heart',
  settings: 'settings',
  achievements: 'ribbon',
  back: 'chevron-back',
  search: 'search',
  close: 'close',
  chevronRight: 'chevron-forward',
  lifestyle: 'restaurant',
  ownership: 'phone-portrait',
  add: 'add-circle',
  checkmark: 'checkmark-circle',
};

interface Props {
  name: IconName;
  size?: number;
  color?: string;
}

export default function Icon({ name, size = 20, color = colors.textPrimary }: Props) {
  return <Ionicons name={ICON_MAP[name]} size={size} color={color} />;
}
