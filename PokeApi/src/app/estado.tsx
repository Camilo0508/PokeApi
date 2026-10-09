import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { API_URL, DOCENTES_API_URL, ONEPIECE_API_URL } from '@/constants/config';
import { useTheme } from '@/context/theme-context';
import { getHealth } from '@/services/api';
import { getDocentesHealth } from '@/services/docentes-api';
import { getOnePieceHealth } from '@/services/onepiece-api';

// Estado de cada microservicio: el de pokémon (8000) y el de One Piece (8001)
interface EstadoServicio {
  internet: boolean;
  guardados: number;
  database: string;
  error?: string;
}

export default function EstadoScreen() {
  const { colors } = useTheme();
  const [pokemon, setPokemon] = useState<EstadoServicio | null>(null);
  const [onepiece, setOnepiece] = useState<EstadoServicio | null>(null);
  const [docentes, setDocentes] = useState<EstadoServicio | null>(null);

  const load = useCallback(() => {
    getHealth()
      .then((h) => setPokemon({ internet: h.internet, guardados: h.saved_pokemon, database: h.database }))
      .catch((e: Error) => setPokemon({ internet: false, guardados: 0, database: '—', error: e.message }));

    getOnePieceHealth()
      .then((h) => setOnepiece({ internet: h.internet, guardados: h.saved_characters, database: h.database }))
      .catch((e: Error) => setOnepiece({ internet: false, guardados: 0, database: '—', error: e.message }));

    getDocentesHealth()
      .then((h) => setDocentes({ internet: true, guardados: h.saved_docentes, database: h.database }))
      .catch((e: Error) => setDocentes({ internet: false, guardados: 0, database: '—', error: e.message }));
  }, []);

  // Se vuelve a consultar cada vez que el usuario entra a esta pestaña
  useFocusEffect(load);

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <Servicio
        titulo="🔴 Pokémon · Node + Express"
        url={API_URL}
        estado={pokemon}
        etiqueta="Pokémon guardados"
      />
      <Servicio
        titulo="🏴‍☠️ One Piece · Python + FastAPI"
        url={ONEPIECE_API_URL}
        estado={onepiece}
        etiqueta="Personajes guardados"
      />
      <Servicio
        titulo="🎓 Docentes · Node sin Express"
        url={DOCENTES_API_URL}
        estado={docentes}
        etiqueta="Docentes guardados"
      />
    </ScrollView>
  );
}

function Servicio({
  titulo,
  url,
  estado,
  etiqueta,
}: {
  titulo: string;
  url: string;
  estado: EstadoServicio | null;
  etiqueta: string;
}) {
  const { colors } = useTheme();

  return (
    <View style={[styles.tarjeta, { backgroundColor: colors.card }]}>
      <Text style={[styles.titulo, { color: colors.text }]}>{titulo}</Text>
      <Row label="Dirección" value={url} />
      {!estado && <Row label="Estado" value="Consultando..." />}
      {estado?.error && <Row label="Estado" value={`⚠️ ${estado.error}`} />}
      {estado && !estado.error && (
        <>
          <Row
            label="Internet en el backend"
            value={estado.internet ? '🟢 Conectado (usa la API)' : '🟠 Sin conexión (usa base local)'}
          />
          <Row label="Base de datos" value={estado.database} />
          <Row label={etiqueta} value={String(estado.guardados)} />
        </>
      )}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  tarjeta: { borderRadius: 14, padding: 14, gap: 4 },
  titulo: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  row: { paddingVertical: 4 },
  label: { fontSize: 12 },
  value: { fontSize: 15, fontWeight: '600', marginTop: 2 },
});
