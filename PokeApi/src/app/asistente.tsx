import { useEffect, useRef, useState } from "react";
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
} from "react-native";
import { useHeaderHeight } from "expo-router/react-navigation";

import { useTheme } from "@/context/theme-context";
import {
  guardarAjusteAsistente,
  leerAjusteAsistente,
} from "@/services/ajustes-asistente";
import {
  listarIas,
  preguntar,
  TIEMPOS_ESPERA,
  type Mensaje,
  type OpcionIa,
  type TiempoEspera,
} from "@/services/chat-api";

// Azul que se ve bien en el tema claro y en el oscuro (el primary del oscuro casi no se ve sobre negro)
const ACENTO = "#2563EB";

// Ejemplos para tocar cuando el chat está vacío
const EJEMPLOS = [
  "¿Quién es Zoro?",
  "¿Qué sabes de Pikachu?",
  "¿Qué fruta del diablo tiene Luffy?",
  "¿De qué tipo es Charmander?",
];

// Una burbuja del chat; las de error se muestran pero no se mandan a la API
interface Burbuja extends Mensaje {
  error?: boolean;
  ia?: string; // qué IA respondió, para mostrarlo debajo de la burbuja
}

export default function AsistenteScreen() {
  const { colors } = useTheme();
  const lista = useRef<FlatList<Burbuja>>(null);
  // Alto real de la barra superior: el teclado debe empujar la pantalla justo debajo de ella
  const altoHeader = useHeaderHeight();

  const [texto, setTexto] = useState("");
  const [burbujas, setBurbujas] = useState<Burbuja[]>([]);
  const [cargando, setCargando] = useState(false);

  // Ajustes que se escogen desde la app: con qué IA hablar y cuánto esperar al backend
  const [ias, setIas] = useState<OpcionIa[]>([]);
  const [ia, setIa] = useState("groq");
  const [espera, setEspera] = useState<TiempoEspera>(40);
  const [verAjustes, setVerAjustes] = useState(false);
  const [errorIas, setErrorIas] = useState<string | null>(null);

  // Al abrir: se leen los ajustes guardados y se pide al backend la lista de IAs
  useEffect(() => {
    leerAjusteAsistente("asistente_espera").then((v) => {
      const n = Number(v);
      if ((TIEMPOS_ESPERA as readonly number[]).includes(n))
        setEspera(n as TiempoEspera);
    });
    cargarIas();
  }, []);

  async function cargarIas() {
    setErrorIas(null);
    try {
      const lista = await listarIas();
      setIas(lista);
      // Si la guardada ya no tiene clave, se usa la del backend por defecto
      const guardada = await leerAjusteAsistente("asistente_ia");
      const valida = lista.find((o) => o.id === guardada && o.disponible);
      const porDefecto =
        lista.find((o) => o.porDefecto && o.disponible) ??
        lista.find((o) => o.disponible);
      const elegida = valida ?? porDefecto;
      if (elegida) setIa(elegida.id);
    } catch (e) {
      setErrorIas((e as Error).message);
    }
  }

  function cambiarIa(id: string) {
    setIa(id);
    guardarAjusteAsistente("asistente_ia", id);
  }

  function cambiarEspera(segundos: TiempoEspera) {
    setEspera(segundos);
    guardarAjusteAsistente("asistente_espera", String(segundos));
  }

  const nombreIa = ias.find((o) => o.id === ia)?.nombre ?? ia;

  async function enviar(preguntaDirecta?: string) {
    const pregunta = (preguntaDirecta ?? texto).trim();
    if (!pregunta || cargando) return;

    const nuevas: Burbuja[] = [
      ...burbujas,
      { role: "user", content: pregunta },
    ];
    setBurbujas(nuevas);
    setTexto("");
    setCargando(true);

    try {
      const historial: Mensaje[] = nuevas
        .filter((b) => !b.error)
        .map(({ role, content }) => ({ role, content }));
      const respuesta = await preguntar(historial, ia, espera);
      setBurbujas((antes) => [
        ...antes,
        { role: "assistant", content: respuesta, ia: nombreIa },
      ]);
    } catch (e) {
      setBurbujas((antes) => [
        ...antes,
        { role: "assistant", content: (e as Error).message, error: true },
      ]);
    } finally {
      setCargando(false);
    }
  }

  const noSePuedeEnviar = cargando || !texto.trim();

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      // En Android con edge-to-edge el sistema ya no encoge la pantalla solo: 'padding' en ambos
      behavior={Platform.OS === "web" ? undefined : "padding"}
      keyboardVerticalOffset={altoHeader}
    >
      {/* Barra de ajustes: muestra la IA y la espera actuales, y al tocarla se despliegan las opciones */}
      <Pressable
        onPress={() => setVerAjustes((v) => !v)}
        style={[
          styles.barraAjustes,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Text style={{ color: colors.text, fontWeight: "600" }}>
          🧠 {nombreIa} · ⏱️ {espera} s
        </Text>
        <Text style={{ color: ACENTO, fontWeight: "700" }}>
          {verAjustes ? "Cerrar ▲" : "⚙️ Ajustes ▼"}
        </Text>
      </Pressable>

      {verAjustes && (
        <View
          style={[
            styles.panel,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.tituloPanel, { color: colors.text }]}>
            Inteligencia artificial
          </Text>
          {errorIas ? (
            <Pressable onPress={cargarIas}>
              <Text style={{ color: "#E5484D" }}>
                {errorIas} Toca para reintentar.
              </Text>
            </Pressable>
          ) : (
            <View style={styles.opciones}>
              {ias.map((o) => {
                const activa = o.id === ia;
                return (
                  <Pressable
                    key={o.id}
                    onPress={() => cambiarIa(o.id)}
                    disabled={!o.disponible}
                    style={[
                      styles.opcion,
                      { borderColor: ACENTO, opacity: o.disponible ? 1 : 0.4 },
                      activa && { backgroundColor: ACENTO },
                    ]}
                  >
                    <Text
                      style={{
                        color: activa ? "#fff" : ACENTO,
                        fontWeight: "700",
                      }}
                    >
                      {o.nombre}
                      {!o.disponible ? " (sin clave)" : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Text style={[styles.tituloPanel, { color: colors.text }]}>
            Tiempo de espera del backend
          </Text>
          <View style={styles.opciones}>
            {TIEMPOS_ESPERA.map((s) => {
              const activo = s === espera;
              return (
                <Pressable
                  key={s}
                  onPress={() => cambiarEspera(s)}
                  style={[
                    styles.opcion,
                    { borderColor: ACENTO },
                    activo && { backgroundColor: ACENTO },
                  ]}
                >
                  <Text
                    style={{
                      color: activo ? "#fff" : ACENTO,
                      fontWeight: "700",
                    }}
                  >
                    {s} s
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <FlatList
        ref={lista}
        style={styles.flex}
        contentContainerStyle={styles.listaContenido}
        data={burbujas}
        keyExtractor={(_, i) => String(i)}
        onContentSizeChange={() =>
          lista.current?.scrollToEnd({ animated: true })
        }
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioEmoji}>🤖</Text>
            <Text style={[styles.vacioTexto, { color: colors.text }]}>
              Pregúntame por un pokémon, un personaje de One Piece o un docente.
              {"\n"}Solo respondo si está en nuestra base de datos.
            </Text>
            <View style={styles.ejemplos}>
              {EJEMPLOS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => enviar(e)}
                  style={[styles.ejemplo, { borderColor: ACENTO }]}
                >
                  <Text style={{ color: ACENTO, fontWeight: "600" }}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const mio = item.role === "user";
          return (
            <View style={mio ? styles.filaMia : styles.filaIa}>
              <View
                style={[
                  styles.burbuja,
                  mio ? styles.burbujaMia : styles.burbujaIa,
                  {
                    backgroundColor: item.error
                      ? "#FDECEC"
                      : mio
                        ? colors.primary
                        : colors.card,
                    borderColor: item.error ? "#E5484D" : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.burbujaTexto,
                    {
                      color: item.error
                        ? "#B42318"
                        : mio
                          ? "#fff"
                          : colors.text,
                    },
                  ]}
                >
                  {item.content}
                </Text>
              </View>
              {item.ia && (
                <Text style={styles.etiquetaIa}>Respondió {item.ia}</Text>
              )}
            </View>
          );
        }}
        ListFooterComponent={
          cargando ? (
            <View
              style={[
                styles.burbuja,
                styles.burbujaIa,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <ActivityIndicator color={ACENTO} />
            </View>
          ) : undefined
        }
      />

      {/* Con conversación iniciada: botón para empezar otra */}
      {burbujas.length > 0 && !cargando && (
        <View style={styles.nueva}>
          <Pressable
            onPress={() => setBurbujas([])}
            style={[styles.ejemplo, { borderColor: ACENTO }]}
          >
            <Text style={{ color: ACENTO, fontWeight: "600" }}>
              🗑️ Nueva conversación
            </Text>
          </Pressable>
        </View>
      )}

      <View
        style={[
          styles.barra,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
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
          style={[
            styles.enviar,
            { backgroundColor: ACENTO, opacity: noSePuedeEnviar ? 0.4 : 1 },
          ]}
        >
          <Text style={styles.enviarTexto}>➤</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listaContenido: { padding: 12, gap: 10, flexGrow: 1 },
  vacio: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  vacioEmoji: { fontSize: 48 },
  vacioTexto: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.8,
  },
  ejemplos: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  ejemplo: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  barraAjustes: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  panel: { padding: 14, gap: 10, borderBottomWidth: 1 },
  tituloPanel: { fontSize: 14, fontWeight: "700" },
  opciones: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  opcion: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  filaMia: { alignSelf: "flex-end", maxWidth: "85%" },
  filaIa: { alignSelf: "flex-start", maxWidth: "85%" },
  etiquetaIa: { fontSize: 11, color: "#8E8E93", marginTop: 4, marginLeft: 6 },
  burbuja: { maxWidth: "100%", padding: 12, borderRadius: 16, borderWidth: 1 },
  burbujaMia: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  burbujaIa: { alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  burbujaTexto: { fontSize: 15, lineHeight: 21 },
  nueva: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8 },
  barra: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 8,
    borderTopWidth: 1,
  },
  inputPregunta: {
    flex: 1,
    maxHeight: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  enviar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  enviarTexto: { color: "#fff", fontSize: 18 },
});
