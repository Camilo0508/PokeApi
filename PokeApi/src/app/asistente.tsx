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
import { preguntar, type Mensaje } from '@/services/chat-api';

// Ejemplos para tocar cuando el chat está vacío
const EJEMPLOS = ['¿Quién es Zoro?', '¿Qué sabes de Pikachu?', '¿Qué fruta del diablo tiene Luffy?', '¿De qué tipo es Charmander?'];

// Una burbuja del chat; las de error se muestran pero no se mandan a la API
interface Burbuja extends Mensaje {
  error?: boolean;
}

export default function AsistenteScreen() {
  const { colors } = useTheme();
  const lista = useRef<FlatList<Burbuja>>(null);
  // Alto real de la barra superior: el teclado debe empujar la pantalla justo debajo de ella
  const altoHeader = useHeaderHeight();

  const [texto, setTexto] = useState('');
  const [burbujas, setBurbujas] = useState<Burbuja[]>([]);
  const [cargando, setCargando] = useState(false);

  async function enviar(preguntaDirecta?: string) {
    const pregunta = (preguntaDirecta ?? texto).trim();
    if (!pregunta || cargando) return;

    const nuevas: Burbuja[] = [...burbujas, { role: 'user', content: pregunta }];
    setBurbujas(nuevas);
    setTexto('');
    setCargando(true);

    try {
      const historial: Mensaje[] = nuevas
        .filter((b) => !b.error)
        .map(({ role, content }) => ({ role, content }));
      const respuesta = await preguntar(historial);
      setBurbujas((antes) => [...antes, { role: 'assistant', content: respuesta }]);
    } catch (e) {
      setBurbujas((antes) => [...antes, { role: 'assistant', content: (e as Error).message, error: true }]);
    } finally {
      setCargando(false);
    }
  }

  const noSePuedeEnviar = cargando || !texto.trim();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      // En Android con edge-to-edge el sistema ya no encoge la pantalla solo: 'padding' en ambos
      behavior={Platform.OS === 'web' ? undefined : 'padding'}
      keyboardVerticalOffset={altoHeader}>
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
              Pregúntame por un pokémon, un personaje de One Piece o un docente.
              {'\n'}Solo respondo si está en nuestra base de datos.
            </Text>
            <View style={styles.ejemplos}>
              {EJEMPLOS.map((e) => (
                <Pressable key={e} onPress={() => enviar(e)} style={[styles.ejemplo, { borderColor: colors.primary }]}>
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>{e}</Text>
                </Pressable>
              ))}
            </View>
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

      {/* Con conversación iniciada: botón para empezar otra */}
      {burbujas.length > 0 && !cargando && (
        <View style={styles.nueva}>
          <Pressable onPress={() => setBurbujas([])} style={[styles.ejemplo, { borderColor: colors.primary }]}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>🗑️ Nueva conversación</Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.barra, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TextInput
          style={[styles.inputPregunta, { color: colors.text }]}
          placeholder="Ej: ¿Quién es Zoro?"
          placeholderTextColor="#8E8E93"
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={() => enviar()}
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
  listaContenido: { padding: 12, gap: 10, flexGrow: 1 },
  vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  vacioEmoji: { fontSize: 48 },
  vacioTexto: { textAlign: 'center', fontSize: 15, lineHeight: 22, opacity: 0.8 },
  ejemplos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  ejemplo: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1 },
  burbuja: { maxWidth: '85%', padding: 12, borderRadius: 16, borderWidth: 1 },
  burbujaMia: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  burbujaIa: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  burbujaTexto: { fontSize: 15, lineHeight: 21 },
  nueva: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8 },
  barra: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 8, borderTopWidth: 1 },
  inputPregunta: { flex: 1, maxHeight: 120, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  enviar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  enviarTexto: { color: '#fff', fontSize: 18 },
});
