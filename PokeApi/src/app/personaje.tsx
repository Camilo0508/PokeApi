import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { useCharacter } from '@/context/character-context';
import { useTheme } from '@/context/theme-context';

const ORO = '#F0B400'; // el color de las recompensas

export default function PersonajeScreen() {
  // Los datos llegan por Context desde la lista de One Piece
  const { selected } = useCharacter();
  const { colors } = useTheme();
  const router = useRouter();

  if (!selected) {
    return (
      <View style={[styles.vacio, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>Elige un personaje en la lista</Text>
        <Pressable
          style={[styles.boton, { backgroundColor: colors.primary }]}
          onPress={() => router.replace('/onepiece')}>
          <Text style={styles.botonTexto}>Ir a One Piece</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      {/* Encabezado: la imagen es de cuerpo completo, por eso va con contentFit "contain" */}
      <View style={[styles.tarjeta, { backgroundColor: colors.card }]}>
        <Image source={selected.image} style={styles.imagen} contentFit="contain" cachePolicy="disk" />
        <Text style={[styles.nombre, { color: colors.text }]}>{selected.name}</Text>
        {selected.japones && (
          <Text style={[styles.japones, { color: colors.textSecondary }]}>{selected.japones}</Text>
        )}
        {selected.job && <Text style={[styles.job, { color: colors.textSecondary }]}>{selected.job}</Text>}
        {selected.bounty && (
          <Text style={[styles.bounty, { backgroundColor: ORO + '26', color: ORO, borderColor: ORO + '55' }]}>
            💰 {selected.bounty.toLocaleString('es-CO')} berries
          </Text>
        )}
      </View>

      {/* Fruta del diablo */}
      <Tarjeta titulo="🍎 Fruta del diablo">
        {selected.fruit ? (
          <>
            <Text style={[styles.destacado, { color: colors.text }]}>{selected.fruit}</Text>
            {selected.fruit_type && (
              <Text style={[styles.chip, { backgroundColor: colors.primary }]}>{selected.fruit_type}</Text>
            )}
          </>
        ) : (
          <Text style={{ color: colors.textSecondary }}>No tiene fruta del diablo</Text>
        )}
      </Tarjeta>

      {/* Haki: los que tiene y cuáles están despertados */}
      <Tarjeta titulo="⚡ Haki">
        {selected.haki.length > 0 ? (
          <View style={styles.hakis}>
            {selected.haki.map((haki) => (
              <View
                key={haki.name}
                style={[styles.haki, { backgroundColor: haki.awaken ? colors.primary : colors.background }]}>
                <Text style={[styles.hakiNombre, { color: haki.awaken ? '#fff' : colors.text }]}>
                  {haki.name}
                </Text>
                <Text style={[styles.hakiEstado, { color: haki.awaken ? '#fff' : colors.textSecondary }]}>
                  {haki.awaken ? '★ Despertado' : 'Sin despertar'}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ color: colors.textSecondary }}>Sin haki registrado</Text>
        )}
      </Tarjeta>

      {/* Ficha con el resto de los datos */}
      <Tarjeta titulo="📋 Ficha">
        <Fila etiqueta="Tripulación" valor={selected.crew} />
        <Fila etiqueta="Estado" valor={selected.status} />
        <Fila etiqueta="Edad" valor={selected.age ? `${selected.age} años` : null} />
        <Fila etiqueta="Estatura" valor={selected.height ? `${selected.height / 100} m` : null} />
        <Fila etiqueta="Tipo de sangre" valor={selected.blood_type} />
        <Fila etiqueta="Cumpleaños" valor={selected.birthday} />
      </Tarjeta>

      <Pressable style={[styles.boton, { backgroundColor: colors.primary }]} onPress={() => router.navigate('/onepiece')}>
        <Text style={styles.botonTexto}>Volver a la lista</Text>
      </Pressable>
    </ScrollView>
  );
}

// Componentes con props
function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tarjeta, styles.tarjetaIzquierda, { backgroundColor: colors.card }]}>
      <Text style={[styles.titulo, { color: colors.text }]}>{titulo}</Text>
      {children}
    </View>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  const { colors } = useTheme();
  return (
    <View style={styles.fila}>
      <Text style={[styles.filaEtiqueta, { color: colors.textSecondary }]}>{etiqueta}</Text>
      <Text style={[styles.filaValor, { color: colors.text }]} numberOfLines={2}>
        {valor ?? 'Desconocido'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 12, gap: 12, paddingBottom: 32 },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  encabezado: { borderWidth: 1 },
  tarjeta: {
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tarjetaIzquierda: { alignItems: 'stretch' },
  imagen: { width: '100%', height: 260 },
  nombre: { fontSize: 24, fontWeight: 'bold', marginTop: 12, textAlign: 'center' },
  japones: { fontSize: 14, marginTop: 2 },
  job: { fontSize: 14, marginTop: 6, fontStyle: 'italic' },
  bounty: {
    fontWeight: '800',
    fontSize: 15,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },

  titulo: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  destacado: { fontSize: 15, fontWeight: '600' },
  chip: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },

  hakis: { gap: 8 },
  haki: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  hakiNombre: { fontWeight: '700' },
  hakiEstado: { fontSize: 12, marginTop: 2 },

  fila: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8 },
  filaEtiqueta: { fontSize: 13 },
  filaValor: { fontSize: 15, fontWeight: '600', flexShrink: 1, textAlign: 'right' },

  boton: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  botonTexto: { color: '#fff', fontWeight: 'bold' },
});
