import { StyleSheet, Text, View } from 'react-native';

interface Props {
  label: string;
  value: number;
  max?: number;
}

// Text label is always visible alongside the bar — never color/bar-only,
// per the design bible's accessibility note.
export default function ResourceBar({ label, value, max = 100 }: Props) {
  const ratio = Math.max(0, Math.min(1, value / max));
  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label} {value}/{max}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 3, width: '100%' },
  label: { fontSize: 13, color: '#333' },
  track: { height: 6, borderRadius: 3, backgroundColor: '#e5e5e5', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#555', borderRadius: 3 },
});
