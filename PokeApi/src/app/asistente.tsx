import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useHeaderHeight } from 'expo-router/react-navigation';

import { useTheme } from '@/context/theme-context';
import { getPokemonList } from '@/services/api';
import { preguntar, type Mensaje, type TipoChat } from '@/services/chat-api';
import { getDocentes } from '@/services/docente-offline';
import { getCharacters } from '@/services/onepiece-api';

// Lo que se muestra en la lista para escoger: sale de la base de datos de cada servicio
interface Opcion {
  clave: string;
  nombre: string;
  imagen: string | null;
}

const TIPOS: { valor: TipoChat; texto: string; emoji: string }[] = [
  { valor: 'pokemon', texto: 'Pokémon', emoji: '⚡' },
  { valor: 'onepiece', texto: 'One Piece', emoji: '🏴‍☠️' },
  { valor: 'docente', texto: 'Docente', emoji: '🎓' },
];

// Preguntas listas para tocar, sin escribir
const PREGUNTAS: Record<TipoChat, string[]> = {
  pokemon: ['¿Qué sabes de él?', '¿De qué tipo es?', '¿Qué habilidades tiene?', '¿Cuánto mide y pesa?', '¿Qué movimientos aprende?'],
  onepiece: ['¿Qué sabes de él?', '¿Cuál es su recompensa?', '¿Qué fruta del diablo tiene?', '¿Qué haki tiene?', '¿A qué tripulación pertenece?'],
  docente: ['¿Qué sabes de este docente?', '¿Dónde trabaja?', '¿Qué cargo tiene?', '¿Cuánta experiencia tiene?', '¿Cuál es su correo?'],
};

async function cargarOpciones(tipo: TipoChat): Promise<Opcion[]> {
  if (tipo === 'pokemon') {
    const { results } = await getPokemonList(0, 100);
    return results.map((p) => ({ clave: String(p.id), nombre: p.name, imagen: p.image }));
  }
  if (tipo === 'onepiece') {
    const { results } = await getCharacters(1, 100);
    return results.map((c) => ({ clave: c.id, nombre: c.name, imagen: c.image }));
  }
  const { results } = await getDocentes('');
  return results.map((d) => ({ clave: String(d.id), nombre: d.nombre, imagen: d.foto }));
}

// Una burbuja del chat; las de error se muestran pero no se mandan a la API
interface Burbuja extends Mensaje {
  error?: boolean;
}

export default function AsistenteScreen() {
  const { colors } = useTheme();
  const lista = useRef<FlatList<Burbuja>>(null);
  // Alto real de la barra superior: el teclado debe empujar la pantalla justo debajo de ella
  const altoHeader = useHeaderHeight();

  const [tipo, setTipo] = useState<TipoChat>('pokemon');
  const [opciones, setOpciones] = useState<Opcion[]>([]);
  const [cargandoOpciones, setCargandoOpciones] = useState(true);
  const [errorOpciones, setErrorOpciones] = useState<string | null>(null);
  const [intento, setIntento] = useState(0); // para el botón "Reintentar"

  const [elegido, setElegido] = useState<Opcion | null>(null);
  const [texto, setTexto] = useState('');
  const [burbujas, setBurbujas] = useState<Burbuja[]>([]);
  const [cargando, setCargando] = useState(false);

  // Cada vez que cambia la categoría se trae su lista de la base de datos
  useEffect(() => {
    let vigente = true;
    setCargandoOpciones(true);
    setErrorOpciones(null);
    setOpciones([]);
    cargarOpciones(tipo)
      .then((datos) => vigente && setOpciones(datos))
      .catch((e) => vigente && setErrorOpciones((e as Error).message))
      .finally(() => vigente && setCargandoOpciones(false));
    return () => {
      vigente = false;
    };
  }, [tipo, intento]);

  // Cada conversación es sobre un solo registro: si cambia, se empieza de cero
  function cambiarTipo(valor: TipoChat) {
    if (valor === tipo) return;
    setTipo(valor);
    setElegido(null);
    setBurbujas([]);
  }
  function elegir(opcion: Opcion) {
    setElegido(opcion);
    setBurbujas([]);
  }

  async function enviar(preguntaDirecta?: string) {
    const pregunta = (preguntaDirecta ?? texto).trim();
    if (!pregunta || !elegido || cargando) return;

    const nuevas: Burbuja[] = [...burbujas, { role: 'user', content: pregunta }];
    setBurbujas(nuevas);
    setTexto('');
    setCargando(true);

    try {
      const historial: Mensaje[] = nuevas
        .filter((b) => !b.error)
        .map(({ role, content }) => ({ role, content }));
      const respuesta = await preguntar(tipo, elegido.nombre, historial);
      setBurbujas((antes) => [...antes, { role: 'assistant', content: respuesta }]);
    } catch (e) {
      setBurbujas((antes) => [...antes, { role: 'assistant', content: (e as Error).message, error: true }]);
    } finally {
      setCargando(false);
    }
  }

  const noSePuedeEnviar = cargando || !texto.trim() || !elegido;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      // En Android con edge-to-edge el sistema ya no encoge la pantalla solo: 'padding' en ambos
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
      keyboardVerticalOffset={altoHeader}>
      {/* 1. ¿De dónde? */}
      <View style={styles.chips}>
        {TIPOS.map((t) => {
          const activo = t.valor === tipo;
          return (
            <Pressable
              key={t.valor}
              onPress={() => cambiarTipo(t.valor)}
              style={[
                styles.chip,
                { backgroundColor: activo ? colors.primary : colors.card, borderColor: colors.border },
              ]}>
              <Text style={{ color: activo ? '#fff' : colors.text, fontWeight: '600' }}>
                {t.emoji} {t.texto}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 2. ¿Cuál? Lista que viene de la base de datos */}
      <View style={styles.zonaOpciones}>
        {cargandoOpciones ? (
          <ActivityIndicator color={colors.primary} />
        ) : errorOpciones ? (
          <View style={styles.filaError}>
            <Text style={[styles.textoError, { color: colors.text }]} numberOfLines={2}>
              {errorOpciones}
            </Text>
            <Pressable onPress={() => setIntento((n) => n + 1)} style={[styles.reintentar, { borderColor: colors.primary }]}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Reintentar</Text>
            </Pressable>
          </View>
        ) : opciones.length === 0 ? (
          <Text style={[styles.textoError, { color: colors.text }]}>No hay registros guardados todavía.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.opciones}>
            {opciones.map((o) => {
              const activo = elegido?.clave === o.clave;
              return (
                <Pressable
                  key={o.clave}
                  onPress={() => elegir(o)}
                  style={[
                    styles.opcion,
                    {
                      backgroundColor: activo ? colors.primary : colors.card,
                      borderColor: activo ? colors.primary : colors.border,
                    },
                  ]}>
                  {o.imagen ? (
                    <Image source={o.imagen} style={styles.opcionImagen} contentFit="contain" cachePolicy="disk" />
                  ) : (
                    <View style={[styles.opcionImagen, styles.inicial, { backgroundColor: colors.backgroundElement }]}>
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>
                        {o.nombre.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text
                    style={[styles.opcionNombre, { color: activo ? '#fff' : colors.text }]}
                    numberOfLines={2}>
                    {o.nombre}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* 3. La conversación */}
      <FlatList
        ref={lista}
        style={styles.flex}
        contentContainerStyle={styles.listaContenido}
        data={burbujas}
        keyExtractor={(_, i) => String(i)}
        onContentSizeChange={() => lista.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioEmoji}>🤖</Text>
            <Text style={[styles.vacioTexto, { color: colors.text }]}>
              {elegido
                ? `Toca una pregunta de abajo o escribe la tuya sobre ${elegido.nombre}.`
                : 'Elige de dónde quieres preguntar y toca uno de la lista.'}
              {'\n'}Solo respondo con los datos de nuestra base de datos.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const mio = item.role === 'user';
          return (
            <View
              style={[
                styles.burbuja,
                mio ? styles.burbujaMia : styles.burbujaIa,
                {
                  backgroundColor: item.error ? '#FDECEC' : mio ? colors.primary : colors.card,
                  borderColor: item.error ? '#E5484D' : colors.border,
                },
              ]}>
              <Text style={[styles.burbujaTexto, { color: item.error ? '#B42318' : mio ? '#fff' : colors.text }]}>
                {item.content}
              </Text>
            </View>
          );
        }}
        ListFooterComponent={
          cargando ? (
            <View
              style={[styles.burbuja, styles.burbujaIa, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null
        }
      />

      {/* 4. Preguntas rápidas: se tocan, no se escriben */}
      {elegido && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.zonaRapidas}
          contentContainerStyle={styles.rapidas}>
          {PREGUNTAS[tipo].map((p) => (
            <Pressable
              key={p}
              onPress={() => enviar(p)}
              disabled={cargando}
              style={[styles.rapida, { borderColor: colors.primary, opacity: cargando ? 0.4 : 1 }]}>
              <Text style={{ color: colors.primary, fontWeight: '600' }}>{p}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* 5. O escribir una pregunta propia */}
      <View style={[styles.barra, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[styles.inputPregunta, { color: colors.text }]}
          placeholder={elegido ? `Otra pregunta sobre ${elegido.nombre}...` : 'Primero elige uno de la lista'}
          placeholderTextColor="#8E8E93"
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={() => enviar()}
          editable={!!elegido}
          multiline
        />
        <Pressable
          onPress={() => enviar()}
          disabled={noSePuedeEnviar}
          style={[styles.enviar, { backgroundColor: colors.primary, opacity: noSePuedeEnviar ? 0.4 : 1 }]}>
          <Text style={styles.enviarTexto}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingTop: 12 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1 },
  zonaOpciones: { minHeight: 112, justifyContent: 'center', paddingVertical: 8 },
  opciones: { paddingHorizontal: 12, gap: 8 },
  opcion: { width: 84, alignItems: 'center', gap: 4, padding: 6, borderRadius: 14, borderWidth: 1 },
  opcionImagen: { width: 52, height: 52, borderRadius: 26 },
  inicial: { alignItems: 'center', justifyContent: 'center' },
  opcionNombre: { fontSize: 12, fontWeight: '600', textAlign: 'center', textTransform: 'capitalize' },
  filaError: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12 },
  textoError: { flex: 1, fontSize: 14, opacity: 0.8, paddingHorizontal: 12 },
  reintentar: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1 },
  listaContenido: { padding: 12, gap: 10, flexGrow: 1 },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  vacioEmoji: { fontSize: 48 },
  vacioTexto: { textAlign: 'center', fontSize: 15, lineHeight: 22, opacity: 0.8 },
  burbuja: { maxWidth: '85%', padding: 12, borderRadius: 16, borderWidth: 1 },
  burbujaMia: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  burbujaIa: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  burbujaTexto: { fontSize: 15, lineHeight: 21 },
  zonaRapidas: { flexGrow: 0 },
  rapidas: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  rapida: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1 },
  barra: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 8, borderTopWidth: 1 },
  inputPregunta: { flex: 1, maxHeight: 120, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  enviar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  enviarTexto: { color: '#fff', fontSize: 18 },
});
