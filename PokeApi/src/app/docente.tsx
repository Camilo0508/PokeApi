import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { ErrorMessage } from '@/components/error-message';
import { useDocente } from '@/context/docente-context';
import { useTheme } from '@/context/theme-context';
import { getDocente } from '@/services/docentes-api';
import { Docente } from '@/types/docente';

const AZUL = '#2563EB';

export default function DocenteScreen() {
  // Llega por Context desde la lista...
  const { selected } = useDocente();
  const { colors } = useTheme();
  const router = useRouter();

  // ...y además se pide la ficha completa al microservicio (GET /docentes/{id})
  const [docente, setDocente] = useState<Docente | null>(selected);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!selected);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;

    getDocente(selected.id)
      .then((data) => {
        if (!cancelled) setDocente(data.docente);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected]);

  if (!docente) {
    return (
      <View style={[styles.vacio, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Elige un docente en la lista</Text>
        <Pressable
          style={[styles.boton, { backgroundColor: AZUL }]}
          onPress={() => router.replace('/docentes')}>
          <Text style={styles.botonTexto}>Ir a Docentes</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      {/* Encabezado */}
      <View style={[styles.tarjeta, styles.centrada, { backgroundColor: colors.card, borderColor: AZUL + '55' }]}>
        <View style={[styles.halo, { backgroundColor: AZUL + '1F' }]} />

        {docente.foto ? (
          <Image source={docente.foto} style={styles.foto} contentFit="cover" cachePolicy="disk" />
        ) : (
          <View style={[styles.inicial, { backgroundColor: AZUL + '26', borderColor: AZUL + '55' }]}>
            <Text style={[styles.inicialTexto, { color: AZUL }]}>
              {docente.nombre.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <Text style={[styles.nombre, { color: colors.text }]}>{docente.nombre}</Text>
        {docente.profesion && (
          <Text style={[styles.profesion, { color: AZUL }]}>{docente.profesion}</Text>
        )}
        {docente.titulo && (
          <Text style={[styles.titulo, { color: colors.textSecondary }]}>{docente.titulo}</Text>
        )}

        <Text style={[styles.universidad, { backgroundColor: AZUL + '1A', color: AZUL, borderColor: AZUL + '40' }]}>
          🎓 {docente.universidad}
        </Text>
      </View>

      {loading && <ActivityIndicator color={AZUL} style={styles.loader} />}
      {error && <ErrorMessage message={error} />}

      {/* Ficha */}
      <View style={[styles.tarjeta, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.tituloFila}>
          <View style={[styles.barrita, { backgroundColor: AZUL }]} />
          <Text style={[styles.seccion, { color: colors.text }]}>Información</Text>
        </View>

        <Fila etiqueta="Facultad" valor={docente.facultad} />
        <Fila etiqueta="Cargo" valor={docente.cargo} />
        <Fila etiqueta="Correo" valor={docente.correo} />
        <Fila
          etiqueta="Experiencia"
          valor={docente.experiencia != null ? `${docente.experiencia} años` : null}
        />
      </View>

      {/* Texto largo */}
      {docente.resumen && (
        <View style={[styles.tarjeta, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.tituloFila}>
            <View style={[styles.barrita, { backgroundColor: AZUL }]} />
            <Text style={[styles.seccion, { color: colors.text }]}>Reseña</Text>
          </View>
          <Text style={[styles.resumen, { color: colors.textSecondary }]}>{docente.resumen}</Text>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [styles.boton, { backgroundColor: AZUL, opacity: pressed ? 0.85 : 1 }]}
        onPress={() => router.back()}>
        <Text style={styles.botonTexto}>Volver a la lista</Text>
      </Pressable>
    </ScrollView>
  );
}

// Componente con props: una fila de "etiqueta: valor"
function Fila({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  const { colors } = useTheme();
  return (
    <View style={styles.fila}>
      <Text style={[styles.filaEtiqueta, { color: colors.textSecondary }]}>{etiqueta}</Text>
      <Text style={[styles.filaValor, { color: colors.text }]}>{valor ?? 'Sin registrar'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, gap: 12, paddingBottom: 32 },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },

  tarjeta: { borderRadius: 18, borderWidth: 1, padding: 16, overflow: 'hidden' },
  centrada: { alignItems: 'center' },
  halo: { position: 'absolute', top: -60, right: -40, width: 170, height: 170, borderRadius: 85 },

  foto: { width: 120, height: 120, borderRadius: 60 },
  inicial: { width: 120, height: 120, borderRadius: 60, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  inicialTexto: { fontSize: 46, fontWeight: '800' },

  nombre: { fontSize: 22, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  profesion: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  titulo: { fontSize: 12, marginTop: 4, textAlign: 'center' },
  universidad: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    textAlign: 'center',
  },

  tituloFila: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  barrita: { width: 4, height: 18, borderRadius: 2 },
  seccion: { fontSize: 16, fontWeight: '700' },

  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7 },
  filaEtiqueta: { fontSize: 13 },
  filaValor: { fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  resumen: { fontSize: 13, lineHeight: 20 },

  loader: { marginVertical: 8 },
  boton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  botonTexto: { color: '#fff', fontWeight: 'bold' },
});
