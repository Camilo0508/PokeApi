import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/theme-context';

interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: colors.text }]}>⚠️ {message}</Text>
      {onRetry && (
        <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={onRetry}>
          <Text style={styles.buttonText}>Reintentar</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 24, gap: 12 },
  text: { textAlign: 'center' },
  button: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
