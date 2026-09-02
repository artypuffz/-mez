import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { View } from 'react-native';

import type { ExpressionState, OutfitContext, PlayerAvatar } from '../../domain/avatar/types';
import { buildAvatarLayers } from './avatarVisuals';

interface Props {
  avatar: PlayerAvatar;
  outfit?: OutfitContext;
  expression?: ExpressionState;
  size?: number;
  accessibilityLabel?: string;
}

// Gameplay Expansion Part C §21/§32 — the ONE renderer, used for both the
// player (Character Creation, Home, Profile) and every NPC (Hastane, NPC
// Detail). It only ever consumes a PlayerAvatar + outfit/expression
// context; it never reads gameplay state itself, which is what makes
// "avatar never affects gameplay" (§29) structurally true rather than a
// convention someone could violate later.
export default function AvatarRenderer({ avatar, outfit = 'casual', expression = 'normal', size = 64, accessibilityLabel }: Props) {
  const layers = buildAvatarLayers(avatar, outfit, expression);
  return (
    <View
      style={{ width: size, height: size * 1.2, borderRadius: size / 2, overflow: 'hidden' }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel ?? 'Avatar'}
    >
      <Svg width={size} height={size * 1.2} viewBox="0 0 100 120">
        {layers.map((layer, i) => {
          switch (layer.shape) {
            case 'ellipse':
              return <Ellipse key={i} cx={layer.cx} cy={layer.cy} rx={layer.rx} ry={layer.ry} fill={layer.fill} opacity={layer.opacity} stroke={layer.stroke} strokeWidth={layer.strokeWidth} />;
            case 'circle':
              return <Circle key={i} cx={layer.cx} cy={layer.cy} r={layer.r} fill={layer.fill} opacity={layer.opacity} />;
            case 'rect':
              return <Rect key={i} x={layer.x} y={layer.y} width={layer.width} height={layer.height} rx={layer.rx} fill={layer.fill} opacity={layer.opacity} stroke={layer.stroke} strokeWidth={layer.strokeWidth} />;
            case 'path':
              return <Path key={i} d={layer.d} fill={layer.fill} stroke={layer.stroke} strokeWidth={layer.strokeWidth} strokeLinecap="round" />;
            case 'line':
              return <Line key={i} x1={layer.x1} y1={layer.y1} x2={layer.x2} y2={layer.y2} stroke={layer.stroke} strokeWidth={layer.strokeWidth} strokeLinecap="round" />;
            default:
              return null;
          }
        })}
      </Svg>
    </View>
  );
}
