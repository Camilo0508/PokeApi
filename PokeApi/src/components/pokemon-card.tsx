import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { estiloDeTipo } from '@/constants/pokemon-types';
import { useTheme } from '@/context/theme-context';
import { Pokemon } from '@/types/pokemon';

const MAX_MOVES = 2; // cuántos movimientos se muestran en la tarjeta

// Props: el componente recibe el pokémon desde la pantalla que lo usa
interface Props {
  pokemon: Pokemon;
  large?: boolean;
}

export function PokemonCard({ pokemon, large = false }: Props) {
  const { colors, tema } = useTheme();
  const tipo = estiloDeTipo(pokemon.types[0]);
  const size = large ? 150 : 86;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: tipo.color + '55', // el borde toma el color del tipo
          shadowColor: tipo.color,
        },
      ]}>
      {/* Marca de agua: el icono del tipo, grande y casi transparente */}
      <Text style={[styles.marcaAgua, { opacity: tema === 'oscuro' ? 0.1 : 0.07 }]}>{tipo.icono}</Text>

      {/* Resplandor del color del tipo en la esquina */}
      <View style={[styles.resplandor, { backgroundColor: tipo.color + '22' }]} />

      <View style={styles.filaSuperior}>
        <Text style={[styles.numero, { color: colors.textSecondary, borderColor: colors.border }]}>
          #{String(pokemon.id).padStart(3, '0')}
        </Text>
        <View style={[styles.punto, { backgroundColor: tipo.color }]} />
      </View>

      {/* Imagen sobre un halo del color del tipo */}
      <View style={styles.zonaImagen}>
        <View style={[styles.halo, { backgroundColor: tipo.color + '26', width: size + 18, height: size + 18 }]} />
        <Image
          source={pokemon.image}
          style={{ width: size, height: size }}
          contentFit="contain"
          cachePolicy="disk"
        />
      </View>

      <Text style={[styles.nombre, large && styles.nombreGrande, { color: colors.text }]}>
        {pokemon.name}
      </Text>

      {/* Tipos, con su icono y su color */}
      <View style={styles.tipos}>
        {pokemon.types.map((nombreTipo) => {
          const t = estiloDeTipo(nombreTipo);
          return (
            <Text
              key={nombreTipo}
              style={[styles.tipo, { backgroundColor: t.color + '26', color: t.color, borderColor: t.color + '55' }]}>
              {t.icono} {t.nombre}
            </Text>
          );
        })}
      </View>

      {/* Altura y peso, en una cajita con separador */}
      <View style={[styles.medidas, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        <Medida valor={`${pokemon.height / 10} m`} etiqueta="Altura" />
        <View style={[styles.separador, { backgroundColor: colors.border }]} />
        <Medida valor={`${pokemon.weight / 10} kg`} etiqueta="Peso" />
      </View>

      {/* Dos movimientos y cuántos faltan */}
      <View style={styles.movimientos}>
        {pokemon.moves.slice(0, MAX_MOVES).map((move) => (
          <Text
            key={move}
            style={[styles.movimiento, { backgroundColor: colors.primary + '26', color: colors.primary, borderColor: colors.primary + '55' }]}>
            {move.replaceAll('-', ' ')}
          </Text>
        ))}
      </View>
      {pokemon.moves.length > MAX_MOVES && (
        <Text style={[styles.masMovimientos, { color: colors.textSecondary }]}>
          +{pokemon.moves.length - MAX_MOVES} movimientos
        </Text>
      )}
    </View>
  );
}

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
  card: {
    flex: 1,
    margin: 6,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    overflow: 'hidden',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  marcaAgua: { position: 'absolute', right: -14, bottom: -18, fontSize: 96 },
  resplandor: { position: 'absolute', top: -34, right: -34, width: 110, height: 110, borderRadius: 55 },

  filaSuperior: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  numero: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  punto: { width: 8, height: 8, borderRadius: 4 },

  zonaImagen: { alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  halo: { position: 'absolute', borderRadius: 999 },

  nombre: { fontSize: 16, fontWeight: 'bold', textTransform: 'capitalize', letterSpacing: -0.3 },
  nombreGrande: { fontSize: 26 },

  tipos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4, marginTop: 6 },
  tipo: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },

  medidas: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    marginTop: 10,
  },
  medida: { flex: 1, alignItems: 'center' },
  medidaValor: { fontSize: 13, fontWeight: '700' },
  medidaEtiqueta: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 1 },
  separador: { width: 1, alignSelf: 'stretch' },

  movimientos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 4, marginTop: 8 },
  movimiento: {
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
    textTransform: 'capitalize',
  },
  masMovimientos: { fontSize: 10, fontWeight: '600', marginTop: 5 },
});
