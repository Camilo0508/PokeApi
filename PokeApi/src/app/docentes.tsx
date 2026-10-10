import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { ErrorMessage } from '@/components/error-message';
import { useDocente } from '@/context/docente-context';
import { useTheme } from '@/context/theme-context';
import { eliminarDocente, getDocentes } from '@/services/docente-offline';
import { Docente } from '@/types/docente';
import { confirmar } from '@/utils/confirmar';

const AZUL = '#2563EB'; // el color institucional de esta sección
const ROJO = '#DC2626'; // para eliminar

export default function DocentesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { selectDocente, version, recargar, pendientes } = useDocente();

  const [query, setQuery] = useState('');
  const [buscado, setBuscado] = useState('');
  const [docentes, setDocentes] = useState<Docente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<number | null>(null);

  // Se consulta al microservicio cada vez que cambia la búsqueda
  // o que se crea, edita o elimina un docente (version: se recarga sin spinner)
  useEffect(() => {
    let cancelled = false;
    getDocentes(buscado)
      .then((data) => {
        if (!cancelled) setDocentes(data.results);
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
  }, [buscado, version]);

  function buscar() {
    setError(null);
    setLoading(true);
    setBuscado(query.trim());
  }

  function verMas(docente: Docente) {
    selectDocente(docente); // viaja por Context a la pantalla de detalle
    router.push('./docente');
  }

  // ---------- CRUD ----------

  function nuevo() {
    router.push({ pathname: '/docente-form', params: { id: 'nuevo' } });
  }

  function editar(docente: Docente) {
    router.push({ pathname: '/docente-form', params: { id: String(docente.id) } });
  }

  async function eliminar(docente: Docente) {
    const seguro = await confirmar(
      'Eliminar docente',
      `¿Seguro que quieres eliminar a ${docente.nombre}? No se puede deshacer.`
    );
    if (!seguro) return;

    setBorrando(docente.id);
    try {
      await eliminarDocente(docente.id);
      setError(null);
      recargar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBorrando(null);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Encabezado de la sección */}
      <View style={[styles.encabezado, { backgroundColor: AZUL + '1A', borderColor: AZUL + '40' }]}>
        <Text style={styles.escudo}>🎓</Text>
        <View style={styles.encabezadoTexto}>
          <Text style={[styles.titulo, { color: colors.text }]}>Docentes</Text>
          <Text style={[styles.subtitulo, { color: colors.textSecondary }]}>
            Fundación Universitaria Uninpahu
          </Text>
        </View>
      </View>

      {/* Buscador: el microservicio lo recibe como query param */}
      <View style={styles.filaBusqueda}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Buscar por nombre, profesión o facultad"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={buscar}
          autoCapitalize="none"
        />
        <Pressable onPress={buscar} style={({ pressed }) => (pressed ? styles.presionado : null)}>
          <LinearGradient
            colors={[AZUL, '#1E40AF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.botonBuscar, { shadowColor: AZUL }]}>
            <Text style={styles.botonTexto}>Buscar</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Crear: abre el formulario vacío (POST /docentes) */}
      <Pressable
        onPress={nuevo}
        style={({ pressed }) => [
          styles.botonNuevo,
          { borderColor: AZUL },
          pressed ? styles.presionado : null,
        ]}>
        <Text style={[styles.botonNuevoTexto, { color: AZUL }]}>➕ Nuevo docente</Text>
      </Pressable>

      {/* Cambios guardados en SQLite que aún no llegan al microservicio */}
      {pendientes > 0 && (
        <Text style={[styles.aviso, { color: colors.text }]}>
          📴 {pendientes} cambio(s) guardado(s) en el teléfono. Se enviarán cuando el servidor vuelva.
        </Text>
      )}

      {error && <ErrorMessage message={error} onRetry={buscar} />}

      <FlatList
        data={docentes}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading && !error ? (
            <Text style={[styles.vacio, { color: colors.textSecondary }]}>
              {buscado
                ? `"${buscado}" no está en la base de datos`
                : 'Todavía no hay docentes registrados'}
            </Text>
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color={AZUL} />
          ) : docentes.length > 0 ? (
            <Text style={[styles.pie, { color: colors.textSecondary }]}>
              {docentes.length} {docentes.length === 1 ? 'docente' : 'docentes'} · base de datos
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.filaCard}>
              {/* Foto, o la inicial si no tiene */}
              {item.foto ? (
                <Image source={item.foto} style={styles.foto} contentFit="cover" cachePolicy="disk" />
              ) : (
                <View style={[styles.inicial, { backgroundColor: AZUL + '26', borderColor: AZUL + '55' }]}>
                  <Text style={[styles.inicialTexto, { color: AZUL }]}>
                    {item.nombre.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={styles.info}>
                <Text style={[styles.nombre, { color: colors.text }]} numberOfLines={1}>
                  {item.nombre}
                </Text>
                {item.profesion && (
                  <Text style={[styles.profesion, { color: AZUL }]} numberOfLines={1}>
                    {item.profesion}
                  </Text>
                )}
                {item.facultad && (
                  <Text style={[styles.dato, { color: colors.textSecondary }]} numberOfLines={1}>
                    🏛️ {item.facultad}
                  </Text>
                )}
                {item.cargo && (
                  <Text style={[styles.dato, { color: colors.textSecondary }]} numberOfLines={1}>
                    💼 {item.cargo}
                  </Text>
                )}
              </View>
            </View>

            {/* El botón que pediste */}
            <Pressable
              onPress={() => verMas(item)}
              style={({ pressed }) => [
                styles.botonVerMas,
                { backgroundColor: AZUL + '1A', borderColor: AZUL + '55' },
                pressed ? styles.presionado : null,
              ]}>
              <Text style={[styles.botonVerMasTexto, { color: AZUL }]}>Ver más información →</Text>
            </Pressable>

            {/* Editar (PUT) y eliminar (DELETE) */}
            <View style={styles.filaAcciones}>
              <Pressable
                onPress={() => editar(item)}
                style={({ pressed }) => [
                  styles.botonAccion,
                  { borderColor: colors.border },
                  pressed ? styles.presionado : null,
                ]}>
                <Text style={[styles.botonAccionTexto, { color: colors.text }]}>✏️ Editar</Text>
              </Pressable>
              <Pressable
                onPress={() => eliminar(item)}
                disabled={borrando === item.id}
                style={({ pressed }) => [
                  styles.botonAccion,
                  { borderColor: ROJO + '55', backgroundColor: ROJO + '12' },
                  pressed ? styles.presionado : null,
                ]}>
                {borrando === item.id ? (
                  <ActivityIndicator color={ROJO} size="small" />
                ) : (
                  <Text style={[styles.botonAccionTexto, { color: ROJO }]}>🗑️ Eliminar</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14 },

  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginTop: 14,
  },
  aviso: { marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 8, backgroundColor: '#F59E0B33' },
  escudo: { fontSize: 30 },
  encabezadoTexto: { flex: 1 },
  titulo: { fontSize: 18, fontWeight: '800' },
  subtitulo: { fontSize: 12, marginTop: 2 },

  filaBusqueda: { flexDirection: 'row', gap: 10, marginTop: 12 },
  input: { flex: 1, height: 44, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 14 },
  botonBuscar: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  presionado: { opacity: 0.85, transform: [{ scale: 0.99 }] },

  list: { gap: 10, paddingVertical: 12, paddingBottom: 28 },
  card: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 10 },
  filaCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  foto: { width: 62, height: 62, borderRadius: 14 },
  inicial: {
    width: 62,
    height: 62,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inicialTexto: { fontSize: 26, fontWeight: '800' },
  info: { flex: 1, gap: 1 },
  nombre: { fontSize: 16, fontWeight: '800' },
  profesion: { fontSize: 12, fontWeight: '700' },
  dato: { fontSize: 11 },

  botonVerMas: { borderRadius: 12, borderWidth: 1, paddingVertical: 9, alignItems: 'center' },
  botonVerMasTexto: { fontSize: 13, fontWeight: '700' },

  botonNuevo: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 10,
  },
  botonNuevoTexto: { fontSize: 14, fontWeight: '800' },
  filaAcciones: { flexDirection: 'row', gap: 8 },
  botonAccion: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  botonAccionTexto: { fontSize: 13, fontWeight: '700' },

  loader: { margin: 24 },
  pie: { textAlign: 'center', fontSize: 11, marginVertical: 14 },
  vacio: { textAlign: 'center', marginTop: 30, fontSize: 13 },
});
