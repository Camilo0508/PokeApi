import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ErrorMessage } from '@/components/error-message';
import { PokemonCard } from '@/components/pokemon-card';
import { estiloDeTipo } from '@/constants/pokemon-types';
import { useTheme } from '@/context/theme-context';
import { getPokemonList } from '@/services/api';
import { DataSource, Pokemon } from '@/types/pokemon';

const PAGE_SIZE = 20;
const TODOS = 'todos';

export default function PokedexScreen() {
  const { colors } = useTheme();
  // State: datos que cambian y hacen que la pantalla se vuelva a dibujar
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [source, setSource] = useState<DataSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState(TODOS);

  // Cada vez que cambia "offset" (o se reintenta) se pide una página al backend
  useEffect(() => {
    let cancelled = false;
    getPokemonList(offset, PAGE_SIZE)
      .then((data) => {
        if (cancelled) return;
        setPokemons((prev) => [...prev, ...data.results]);
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
  }, [offset, attempt]);

  // Los tipos que de verdad existen entre los pokémon cargados
  const tiposDisponibles = useMemo(() => {
    const vistos = new Set<string>();
    pokemons.forEach((p) => p.types.forEach((t) => vistos.add(t)));
    return [...vistos];
  }, [pokemons]);

  const visibles = filtro === TODOS ? pokemons : pokemons.filter((p) => p.types.includes(filtro));

  function loadMore() {
    if (loading || !hasMore || error) return;
    setLoading(true);
    setOffset((prev) => prev + PAGE_SIZE);
  }

  function retry() {
    setError(null);
    setLoading(true);
    setAttempt((prev) => prev + 1);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Filtros por tipo, en una fila que se desliza */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtrosScroll}
        contentContainerStyle={styles.filtros}>
        <Chip
          texto="Todos"
          color={colors.primary}
          activo={filtro === TODOS}
          onPress={() => setFiltro(TODOS)}
        />
        {tiposDisponibles.map((tipo) => {
          const t = estiloDeTipo(tipo);
          return (
            <Chip
              key={tipo}
              texto={`${t.icono} ${t.nombre}`}
              color={t.color}
              activo={filtro === tipo}
              onPress={() => setFiltro(tipo)}
            />
          );
        })}
      </ScrollView>

      {/* Resumen: de dónde salen los datos y cuántos hay */}
      <View style={styles.resumen}>
        <Text style={[styles.resumenTexto, { color: colors.textSecondary }]}>
          {source === 'api' ? '🌐 API externa' : '💾 Base de datos'}
        </Text>
        <Text style={[styles.resumenTexto, { color: colors.primary }]}>
          {visibles.length} {visibles.length === 1 ? 'registro' : 'registros'}
        </Text>
      </View>

      {error && <ErrorMessage message={error} onRetry={retry} />}

      <FlatList
        data={visibles}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <PokemonCard pokemon={item} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color={colors.primary} />
          ) : (
            <Text style={[styles.pie, { color: colors.textSecondary }]}>
              {hasMore ? 'Desliza para cargar más' : 'No hay más registros en la base'}
            </Text>
          )
        }
      />
    </View>
  );
}

// Componente con props: un botón redondeado para filtrar
function Chip({
  texto,
  color,
  activo,
  onPress,
}: {
  texto: string;
  color: string;
  activo: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: activo ? color : colors.card,
          borderColor: activo ? color : colors.border,
        },
      ]}>
      <Text style={[styles.chipTexto, { color: activo ? '#fff' : colors.textSecondary }]}>{texto}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // flexGrow 0: si no, el ScrollView horizontal se queda sin altura y los chips se aplastan
  filtrosScroll: { flexGrow: 0, paddingVertical: 10 },
  filtros: { gap: 6, paddingHorizontal: 12, alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  chipTexto: { fontSize: 12, fontWeight: '600' },
  resumen: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 6 },
  resumenTexto: { fontSize: 11, fontWeight: '600' },
  list: { paddingHorizontal: 6, paddingBottom: 24 },
  loader: { margin: 20 },
  pie: { textAlign: 'center', fontSize: 11, marginVertical: 18 },
});
