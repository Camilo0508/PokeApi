import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { ErrorMessage } from '@/components/error-message';
import { estiloDeTipo } from '@/constants/pokemon-types';
import { usePokemon } from '@/context/pokemon-context';
import { useTheme } from '@/context/theme-context';
import { getPokemon } from '@/services/api';
import { DataSource, Pokemon } from '@/types/pokemon';

// Qué es cada una de las tres imágenes que manda el backend
const ETIQUETAS_IMAGEN = ['Animado', 'Artwork', 'Sprite'];

export default function BuscarScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  // Context: aquí se guarda el pokémon para que lo lea la pantalla de información
  const { selectPokemon } = usePokemon();

  const [query, setQuery] = useState('');
  const [pokemon, setPokemon] = useState<Pokemon | null>(null);
  const [source, setSource] = useState<DataSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setPokemon(null);
    try {
      const data = await getPokemon(query);
      setPokemon(data.pokemon);
      setSource(data.source);
      selectPokemon(data.pokemon); // queda disponible para la otra pantalla
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const tipo = estiloDeTipo(pokemon?.types[0]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled">
      {/* Buscador */}
      <View style={styles.filaBusqueda}>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
          ]}
          placeholder="Nombre o número (ej: ditto, 25)"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Pressable onPress={search} style={({ pressed }) => (pressed ? styles.presionado : null)}>
          <LinearGradient
            colors={[colors.primary, '#B91C1C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.botonBuscar, { shadowColor: colors.primary }]}>
            <Text style={styles.botonTexto}>Buscar</Text>
          </LinearGradient>
        </Pressable>
      </View>

      {loading && <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />}
      {error && <ErrorMessage message={error} />}

      {pokemon && source && (
        <View style={styles.resultado}>
          {/* De dónde salieron los datos */}
          <Text
            style={[
              styles.insignia,
              { backgroundColor: colors.online + '26', color: colors.online, borderColor: colors.online + '4D' },
            ]}>
            {source === 'api' ? '🌐 Datos de la API externa' : '💾 Datos de la base de datos'}
          </Text>

          <Text style={[styles.nombre, { color: colors.text }]}>{pokemon.name}</Text>
          <Text style={[styles.numero, { color: colors.textSecondary }]}>
            #{String(pokemon.id).padStart(3, '0')}
          </Text>

          {/* Tipos, cada uno con su color e icono */}
          <View style={styles.tipos}>
            {pokemon.types.map((nombreTipo) => {
              const t = estiloDeTipo(nombreTipo);
              return (
                <Text
                  key={nombreTipo}
                  style={[
                    styles.tipo,
                    { backgroundColor: t.color + '26', color: t.color, borderColor: t.color + '55' },
                  ]}>
                  {t.icono} {t.nombre}
                </Text>
              );
            })}
          </View>

          {/* Las tres imágenes, grandes, sobre una tarjeta del color del tipo */}
          <View
            style={[
              styles.tarjetaImagenes,
              { backgroundColor: colors.card, borderColor: tipo.color + '55', shadowColor: tipo.color },
            ]}>
            <Text style={styles.marcaAgua}>{tipo.icono}</Text>
            <View style={[styles.halo, { backgroundColor: tipo.color + '1F' }]} />

            {pokemon.images.map((url, i) => (
              <View key={url} style={styles.columnaImagen}>
                <Image source={url} style={styles.imagen} contentFit="contain" cachePolicy="disk" />
                <Text style={[styles.etiquetaImagen, { color: colors.textSecondary }]}>
                  {ETIQUETAS_IMAGEN[i]}
                </Text>
              </View>
            ))}
          </View>

          {/* Resumen rápido antes de entrar al detalle */}
          <View style={[styles.medidas, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Medida valor={`${pokemon.height / 10} m`} etiqueta="Altura" />
            <View style={[styles.separador, { backgroundColor: colors.border }]} />
            <Medida valor={`${pokemon.weight / 10} kg`} etiqueta="Peso" />
            <View style={[styles.separador, { backgroundColor: colors.border }]} />
            <Medida valor={String(pokemon.moves.length)} etiqueta="Movimientos" />
          </View>

          <Pressable
            onPress={() => router.push('./habilidades')}
            style={({ pressed }) => [styles.anchoCompleto, pressed ? styles.presionado : null]}>
            <LinearGradient
              colors={[colors.primary, '#B91C1C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.botonGrande, { shadowColor: colors.primary }]}>
              <Text style={styles.botonTexto}>Ver toda la información</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

// Componente con props: un dato suelto con su etiqueta
function Medida({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.medida}>
      <Text style={[styles.medidaValor, { color: colors.text }]}>{valor}</Text>
      <Text style={[styles.medidaEtiqueta, { color: colors.textSecondary }]}>{etiqueta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },

  filaBusqueda: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  botonBuscar: {
    height: 46,
    paddingHorizontal: 22,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },
  presionado: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  loader: { marginTop: 40 },

  resultado: { alignItems: 'center', marginTop: 20 },
  insignia: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  nombre: {
    fontSize: 28,
    fontWeight: '800',
    textTransform: 'capitalize',
    letterSpacing: -0.5,
    marginTop: 12,
  },
  numero: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  tipos: { flexDirection: 'row', gap: 6, marginTop: 10 },
  tipo: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },

  tarjetaImagenes: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    alignSelf: 'stretch',
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 10,
    marginTop: 18,
    overflow: 'hidden',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  marcaAgua: { position: 'absolute', right: -10, bottom: -22, fontSize: 110, opacity: 0.1 },
  halo: { position: 'absolute', top: -50, left: '25%', width: 180, height: 180, borderRadius: 90 },
  columnaImagen: { alignItems: 'center', gap: 8 },
  imagen: { width: 98, height: 98 },
  etiquetaImagen: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },

  medidas: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    marginTop: 14,
  },
  medida: { flex: 1, alignItems: 'center' },
  medidaValor: { fontSize: 16, fontWeight: '700' },
  medidaEtiqueta: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 2 },
  separador: { width: 1, alignSelf: 'stretch' },

  anchoCompleto: { alignSelf: 'stretch', marginTop: 18 },
  botonGrande: {
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
});
