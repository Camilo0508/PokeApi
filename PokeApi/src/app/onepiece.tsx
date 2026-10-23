import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { ErrorMessage } from '@/components/error-message';
import { useCharacter } from '@/context/character-context';
import { useTheme } from '@/context/theme-context';
import { getCharacters, searchCharacters } from '@/services/onepiece-api';
import { Character } from '@/types/onepiece';
import { DataSource } from '@/types/pokemon';

const PAGE_SIZE = 20;
const ORO = '#F0B400'; // el color de las recompensas

type Filtro = 'todos' | 'recompensa' | 'sin-recompensa' | 'sombrero';

const FILTROS: { id: Filtro; texto: string }[] = [
  { id: 'todos', texto: 'Todos' },
  { id: 'recompensa', texto: '💰 Con recompensa' },
  { id: 'sombrero', texto: '🏴‍☠️ Sombrero de Paja' },
  { id: 'sin-recompensa', texto: 'Sin recompensa' },
];

export default function OnePieceScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { selectCharacter } = useCharacter();

  const [query, setQuery] = useState('');
  const [buscado, setBuscado] = useState(''); // el texto con el que se pidió al backend
  const [characters, setCharacters] = useState<Character[]>([]);
  const [page, setPage] = useState(1);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [source, setSource] = useState<DataSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Se pide al backend cuando cambia la página o cuando se busca algo nuevo
  useEffect(() => {
    let cancelled = false;
    const peticion = buscado ? searchCharacters(buscado, PAGE_SIZE) : getCharacters(page, PAGE_SIZE);

    peticion
      .then((data) => {
        if (cancelled) return;
        // en una búsqueda se reemplaza la lista; al pasar de página se agrega
        setCharacters((prev) => (page === 1 || buscado ? data.results : [...prev, ...data.results]));
        setSource(data.source);
        if (data.results.length < PAGE_SIZE) setHasMore(false);
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
  }, [page, buscado]);

  // El filtro trabaja sobre lo que ya se trajo, sin pedir nada más
  const visibles = useMemo(() => {
    if (filtro === 'recompensa') return characters.filter((c) => c.bounty);
    if (filtro === 'sin-recompensa') return characters.filter((c) => !c.bounty);
    if (filtro === 'sombrero') return characters.filter((c) => c.crew?.includes('Chapeau de Paille'));
    return characters;
  }, [characters, filtro]);

  function buscar() {
    setError(null);
    setLoading(true);
    setHasMore(false); // los resultados de una búsqueda no se paginan
    setPage(1);
    setBuscado(query.trim());
  }

  function limpiar() {
    setError(null);
    setLoading(true);
    setQuery('');
    setBuscado('');
    setFiltro('todos');
    setHasMore(true);
    setPage(1);
  }

  function loadMore() {
    if (loading || !hasMore || error || buscado) return;
    setLoading(true);
    setPage((prev) => prev + 1);
  }

  function abrir(character: Character) {
    selectCharacter(character); // queda en el Context para la pantalla de detalle
    router.push('./personaje');
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Buscador */}
      <View style={styles.filaBusqueda}>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Buscar personaje (ej: luffy)"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={buscar}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable onPress={buscar} style={({ pressed }) => (pressed ? styles.presionado : null)}>
          <LinearGradient
            colors={[colors.primary, '#B91C1C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.botonBuscar, { shadowColor: colors.primary }]}>
            <Text style={styles.botonTexto}>Buscar</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Filtros rápidos sobre lo ya cargado */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtrosScroll}
        contentContainerStyle={styles.filtros}>
        {FILTROS.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => setFiltro(f.id)}
            style={[
              styles.chip,
              {
                backgroundColor: filtro === f.id ? colors.primary : colors.card,
                borderColor: filtro === f.id ? colors.primary : colors.border,
              },
            ]}>
            <Text style={[styles.chipTexto, { color: filtro === f.id ? '#fff' : colors.textSecondary }]}>
              {f.texto}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* De dónde salen los datos */}
      {source && (
        <View style={styles.insigniaFila}>
          <Text
            style={[
              styles.insignia,
              { backgroundColor: colors.online + '1F', color: colors.online, borderColor: colors.online + '40' },
            ]}>
            {source === 'api' ? '🌐 Datos de la API externa' : '💾 Datos de la base de datos'}
          </Text>
        </View>
      )}

      {error && <ErrorMessage message={error} onRetry={limpiar} />}

      <FlatList
        data={visibles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={!loading && !error ? <Vacio buscado={buscado} onReset={limpiar} /> : undefined}
        ListFooterComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : visibles.length > 0 ? (
            <Text style={[styles.pie, { color: colors.textSecondary }]}>
              {visibles.length} de {characters.length} personajes · base de datos
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => abrir(item)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
              pressed ? styles.presionado : null,
            ]}>
            {/* Foto del personaje */}
            <View style={[styles.marcoImagen, { backgroundColor: colors.backgroundElement }]}>
              <Image source={item.image} style={styles.imagen} contentFit="contain" cachePolicy="disk" />
            </View>

            {/* Nombre, trabajo y recompensa */}
            <View style={styles.info}>
              <Text style={[styles.nombre, { color: colors.text }]} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={[styles.trabajo, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.job ?? 'Miembro de tripulación'}
              </Text>

              {item.bounty ? (
                <Text style={[styles.recompensa, { color: ORO }]} numberOfLines={1}>
                  💰 {item.bounty.toLocaleString('es-CO')} berries
                </Text>
              ) : (
                <Text style={[styles.sinRecompensa, { color: colors.textSecondary }]}>🚫 Sin recompensa</Text>
              )}
            </View>

            <Text style={[styles.flecha, { color: colors.textSecondary }]}>›</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

// Componente con props: lo que se ve cuando no hay resultados
function Vacio({ buscado, onReset }: { buscado: string; onReset: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.vacio, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={styles.vacioIcono}>🔍</Text>
      <Text style={[styles.vacioTitulo, { color: colors.text }]}>No se encontraron piratas</Text>
      <Text style={[styles.vacioTexto, { color: colors.textSecondary }]}>
        {buscado
          ? `"${buscado}" no está en la base de datos.`
          : 'La base de datos no tiene personajes todavía.'}
      </Text>
      <Pressable
        onPress={onReset}
        style={[styles.vacioBoton, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        <Text style={[styles.vacioBotonTexto, { color: colors.text }]}>Restablecer lista</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 14 },

  filaBusqueda: { flexDirection: 'row', gap: 10, paddingTop: 14 },
  input: { flex: 1, height: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
  botonBuscar: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 14 },
  presionado: { opacity: 0.85, transform: [{ scale: 0.99 }] },

  // flexGrow 0: si no, el ScrollView horizontal se queda sin altura y los chips se aplastan
  filtrosScroll: { flexGrow: 0, marginVertical: 10 },
  filtros: { gap: 6, alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  chipTexto: { fontSize: 11, fontWeight: '700' },

  insigniaFila: { alignItems: 'center', paddingBottom: 10 },
  insignia: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },

  list: { gap: 10, paddingBottom: 28 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  marcoImagen: {
    width: 66,
    height: 74,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagen: { width: 58, height: 70 },
  info: { flex: 1, gap: 2 },
  nombre: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  trabajo: { fontSize: 12 },
  recompensa: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  sinRecompensa: { fontSize: 11, marginTop: 2 },
  flecha: { fontSize: 26, fontWeight: '300' },

  loader: { margin: 24 },
  pie: { textAlign: 'center', fontSize: 11, marginVertical: 16 },

  vacio: { alignItems: 'center', borderRadius: 18, borderWidth: 1, padding: 24, marginTop: 20, gap: 6 },
  vacioIcono: { fontSize: 34 },
  vacioTitulo: { fontSize: 16, fontWeight: '700' },
  vacioTexto: { fontSize: 12, textAlign: 'center' },
  vacioBoton: { marginTop: 10, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  vacioBotonTexto: { fontSize: 13, fontWeight: '700' },
});
