import { StyleSheet, Text, View } from 'react-native';

export default function HospitalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hastane</Text>
      <Text style={styles.subtitle}>Branş, hastane ve nöbet özeti buraya gelecek</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#666' },
});
