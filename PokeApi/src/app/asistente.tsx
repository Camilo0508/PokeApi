import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useHeaderHeight } from 'expo-router/react-navigation';

import { useTheme } from '@/context/theme-context';
import { preguntar, type Mensaje, type TipoChat } from '@/services/chat-api';

const TIPOS: { valor: TipoChat; texto: string; emoji: string; ejemplo: string }[] = [
  { valor: 'pokemon', texto: 'Pokémon', emoji: '⚡', ejemplo: 'pikachu' },
  { valor: 'onepiece', texto: 'One Piece', emoji: '🏴‍☠️', ejemplo: 'luffy' },
  { valor: 'docente', texto: 'Docente', emoji: '🎓', ejemplo: 'nombre del docente' },
];

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
  const [nombre, setNombre] = useState('');
  const [texto, setTexto] = useState('');
  const [burbujas, setBurbujas] = useState<Burbuja[]>([]);
  const [cargando, setCargando] = useState(false);

  const actual = TIPOS.find((t) => t.valor === tipo)!;
  const sinNombre = nombre.trim() === '';

  // Cada conversación es sobre un solo registro: si cambia el tipo o el nombre, se empieza de cero
  function cambiarTipo(valor: TipoChat) {
    setTipo(valor);
    setBurbujas([]);
  }
  function cambiarNombre(valor: string) {
    setNombre(valor);
    setBurbujas([]);
  }

  async function enviar(preguntaDirecta?: string) {
    const pregunta = (preguntaDirecta ?? texto).trim();
    if (!pregunta || sinNombre || cargando) return;

    const nuevas: Burbuja[] = [...burbujas, { role: 'user', content: pregunta }];
    setBurbujas(nuevas);
    setTexto('');
    setCargando(true);

    try {
      const historial: Mensaje[] = nuevas
        .filter((b) => !b.error)
        .map(({ role, content }) => ({ role, content }));
      const respuesta = await preguntar(tipo, nombre.trim(), historial);
      setBurbujas((antes) => [...antes, { role: 'assistant', content: respuesta }]);
    } catch (e) {
      setBurbujas((antes) => [...antes, { role: 'assistant', content: (e as Error).message, error: true }]);
    } finally {
      setCargando(false);
    }
  }

  const noSePuedeEnviar = cargando || !texto.trim() || sinNombre;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      // En Android con edge-to-edge el sistema ya no encoge la pantalla solo: 'padding' en ambos
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
      keyboardVerticalOffset={altoHeader}>
      {/* 1. ¿Sobre qué se pregunta? */}
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

      {/* 2. ¿De quién? */}
      <TextInput
        style={[styles.inputNombre, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
        placeholder={`Nombre (ej: ${actual.ejemplo})`}
        placeholderTextColor="#8E8E93"
        value={nombre}
        onChangeText={cambiarNombre}
        autoCapitalize="none"
        autoCorrect={false}
      />

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
              Elige una categoría, escribe un nombre y pregúntame lo que quieras.
              {'\n'}Solo respondo con los datos de nuestra base de datos.
            </Text>
            {!sinNombre && (
              <Pressable
                onPress={() => enviar(`¿Qué sabes de ${nombre.trim()}?`)}
                style={[styles.sugerencia, { borderColor: colors.primary }]}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>¿Qué sabes de {nombre.trim()}?</Text>
              </Pressable>
            )}
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

      {/* 4. Escribir la pregunta */}
      <View style={[styles.barra, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[styles.inputPregunta, { color: colors.text }]}
          placeholder={sinNombre ? 'Primero escribe un nombre' : `Pregunta sobre ${nombre.trim()}...`}
          placeholderTextColor="#8E8E93"
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={() => enviar()}
          editable={!sinNombre}
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
  inputNombre: { margin: 12, padding: 12, borderRadius: 12, borderWidth: 1, fontSize: 16 },
  listaContenido: { padding: 12, gap: 10, flexGrow: 1 },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  vacioEmoji: { fontSize: 48 },
  vacioTexto: { textAlign: 'center', fontSize: 15, lineHeight: 22, opacity: 0.8 },
  sugerencia: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
  burbuja: { maxWidth: '85%', padding: 12, borderRadius: 16, borderWidth: 1 },
  burbujaMia: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  burbujaIa: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  burbujaTexto: { fontSize: 15, lineHeight: 21 },
  barra: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 8, borderTopWidth: 1 },
  inputPregunta: { flex: 1, maxHeight: 120, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  enviar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  enviarTexto: { color: '#fff', fontSize: 18 },
});
