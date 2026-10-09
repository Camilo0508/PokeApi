import { StyleSheet, Text } from 'react-native';

import { useTheme } from '@/context/theme-context';
import { DataSource } from '@/types/pokemon';

// Los datos SIEMPRE salen de la base de datos del microservicio
export function SourceBadge({ source }: { source: DataSource }) {
  const { colors } = useTheme();

  return (
    <Text style={[styles.badge, { backgroundColor: colors.online }]}>
      {source === 'api' ? '🌐 Datos de la API externa' : '💾 Datos de la base de datos'}
    </Text>
  );
}

// En StyleSheet solo va lo que NO cambia con el tema
const styles = StyleSheet.create({
  badge: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: 'center',
    marginVertical: 8,
    overflow: 'hidden',
  },
});
