import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { useDocente } from '@/context/docente-context';
import { useTheme } from '@/context/theme-context';
import { actualizarDocente, crearDocente, getDocente } from '@/services/docentes-api';
import { Docente, DocenteDatos } from '@/types/docente';

const AZUL = '#2563EB';

// En el formulario todo es texto; al guardar se convierte (experiencia a número)
type Formulario = Record<keyof DocenteDatos, string>;

const VACIO: Formulario = {
  nombre: '',
  profesion: '',
  titulo: '',
  universidad: 'Fundación Universitaria Uninpahu',
  facultad: '',
  cargo: '',
  correo: '',
  experiencia: '',
  resumen: '',
  foto: '',
};

function desdeDocente(docente: Docente): Formulario {
  return {
    nombre: docente.nombre,
    profesion: docente.profesion ?? '',
    titulo: docente.titulo ?? '',
    universidad: docente.universidad ?? '',
    facultad: docente.facultad ?? '',
    cargo: docente.cargo ?? '',
    correo: docente.correo ?? '',
    experiencia: docente.experiencia != null ? String(docente.experiencia) : '',
    resumen: docente.resumen ?? '',
    foto: docente.foto ?? '',
  };
}

// Las mismas reglas del microservicio, para avisar antes de enviar
function validar(form: Formulario): string | null {
  if (!form.nombre.trim()) return 'El nombre es obligatorio';
  if (form.correo.trim() && !form.correo.includes('@')) return 'El correo no es válido';
  if (form.experiencia.trim() && !/^\d+$/.test(form.experiencia.trim())) {
    return 'La experiencia debe ser un número entero de años';
  }
  return null;
}

function aDatos(form: Formulario): DocenteDatos {
  const texto = (valor: string) => valor.trim() || null;
  return {
    nombre: form.nombre.trim(),
    profesion: texto(form.profesion),
    titulo: texto(form.titulo),
    universidad: form.universidad.trim(),
    facultad: texto(form.facultad),
    cargo: texto(form.cargo),
    correo: texto(form.correo),
    experiencia: form.experiencia.trim() ? Number(form.experiencia.trim()) : null,
    resumen: texto(form.resumen),
    foto: texto(form.foto),
  };
}

/**
 * Una sola pantalla para crear y para editar:
 *   /docente-form?id=nuevo  -> crear (POST /docentes)
 *   /docente-form?id=5      -> editar (PUT /docentes/5)
 */
export default function DocenteFormScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { selectDocente, recargar } = useDocente();

  const idDocente = id && id !== 'nuevo' ? Number(id) : null;
  const editando = idDocente != null;

  const [form, setForm] = useState<Formulario>(VACIO);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Las pestañas no se desmontan: cada vez que se abre la pantalla se deja
  // el formulario limpio (crear) o con los datos actuales del docente (editar)
  useFocusEffect(
    useCallback(() => {
      setError(null);
      setGuardando(false);
      if (idDocente == null) {
        setForm(VACIO);
        return;
      }

      let cancelled = false;
      setCargando(true);
      getDocente(idDocente)
        .then((data) => {
          if (!cancelled) setForm(desdeDocente(data.docente));
        })
        .catch((e: Error) => {
          if (!cancelled) setError(e.message);
        })
        .finally(() => {
          if (!cancelled) setCargando(false);
        });
      return () => {
        cancelled = true;
      };
    }, [idDocente])
  );

  function cambiar(campo: keyof Formulario) {
    return (valor: string) => setForm((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardar() {
    const problema = validar(form);
    if (problema) return setError(problema);

    setError(null);
    setGuardando(true);
    try {
      const { docente } = editando
        ? await actualizarDocente(idDocente, aDatos(form))
        : await crearDocente(aDatos(form));

      recargar(); // la lista se vuelve a pedir
      selectDocente(docente); // y se abre la ficha ya actualizada
      router.replace('/docente');
    } catch (e) {
      setError((e as Error).message);
      setGuardando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={[styles.encabezado, { backgroundColor: AZUL + '1A', borderColor: AZUL + '40' }]}>
          <Text style={styles.escudo}>{editando ? '✏️' : '➕'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.titulo, { color: colors.text }]}>
              {editando ? 'Editar docente' : 'Nuevo docente'}
            </Text>
            <Text style={[styles.subtitulo, { color: colors.textSecondary }]}>
              Los campos con * son obligatorios
            </Text>
          </View>
        </View>

        {cargando ? (
          <ActivityIndicator color={AZUL} style={styles.loader} />
        ) : (
          <View style={[styles.tarjeta, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Campo etiqueta="Nombre *" valor={form.nombre} onChange={cambiar('nombre')} placeholder="Carlos Pérez" />
            <Campo etiqueta="Profesión" valor={form.profesion} onChange={cambiar('profesion')} placeholder="Ingeniero de Sistemas" />
            <Campo etiqueta="Título" valor={form.titulo} onChange={cambiar('titulo')} placeholder="Magíster en Ingeniería de Software" />
            <Campo etiqueta="Universidad" valor={form.universidad} onChange={cambiar('universidad')} />
            <Campo etiqueta="Facultad" valor={form.facultad} onChange={cambiar('facultad')} placeholder="Facultad de Ingeniería" />
            <Campo etiqueta="Cargo" valor={form.cargo} onChange={cambiar('cargo')} placeholder="Docente de tiempo completo" />
            <Campo
              etiqueta="Correo"
              valor={form.correo}
              onChange={cambiar('correo')}
              placeholder="nombre@uninpahu.edu.co"
              teclado="email-address"
              sinMayusculas
            />
            <Campo
              etiqueta="Experiencia (años)"
              valor={form.experiencia}
              onChange={cambiar('experiencia')}
              placeholder="8"
              teclado="number-pad"
            />
            <Campo
              etiqueta="Foto (URL)"
              valor={form.foto}
              onChange={cambiar('foto')}
              placeholder="https://..."
              teclado="url"
              sinMayusculas
            />
            <Campo
              etiqueta="Reseña"
              valor={form.resumen}
              onChange={cambiar('resumen')}
              placeholder="Texto que se ve en la ficha del docente"
              multilinea
            />
          </View>
        )}

        {error && <Text style={[styles.error, { borderColor: colors.primary, color: colors.text }]}>⚠️ {error}</Text>}

        <Pressable
          onPress={guardar}
          disabled={guardando || cargando}
          style={({ pressed }) => (pressed || guardando ? styles.presionado : null)}>
          <LinearGradient
            colors={[AZUL, '#1E40AF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.boton}>
            {guardando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botonTexto}>{editando ? 'Guardar cambios' : 'Crear docente'}</Text>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable
          // Destino fijo: con pestañas router.back() lleva al Pokédex
          onPress={() => router.navigate(editando ? '/docente' : '/docentes')}
          style={[styles.botonSecundario, { borderColor: colors.border }]}>
          <Text style={[styles.botonSecundarioTexto, { color: colors.textSecondary }]}>Cancelar</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface CampoProps {
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  teclado?: KeyboardTypeOptions;
  sinMayusculas?: boolean;
  multilinea?: boolean;
}

// Componente con props: etiqueta + caja de texto
function Campo({ etiqueta, valor, onChange, placeholder, teclado, sinMayusculas, multilinea }: CampoProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.campo}>
      <Text style={[styles.etiqueta, { color: colors.textSecondary }]}>{etiqueta}</Text>
      <TextInput
        style={[
          styles.input,
          multilinea && styles.inputLargo,
          { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
        ]}
        value={valor}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType={teclado}
        autoCapitalize={sinMayusculas ? 'none' : 'sentences'}
        multiline={multilinea}
        textAlignVertical={multilinea ? 'top' : 'center'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 14, gap: 12, paddingBottom: 32 },

  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  escudo: { fontSize: 28 },
  titulo: { fontSize: 18, fontWeight: '800' },
  subtitulo: { fontSize: 12, marginTop: 2 },

  tarjeta: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 },
  campo: { gap: 4 },
  etiqueta: { fontSize: 12, fontWeight: '700' },
  input: { minHeight: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 },
  inputLargo: { minHeight: 110, paddingTop: 10 },

  error: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 13, textAlign: 'center' },

  boton: { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  botonTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },
  botonSecundario: { borderRadius: 14, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
  botonSecundarioTexto: { fontWeight: '700' },
  presionado: { opacity: 0.85, transform: [{ scale: 0.99 }] },

  loader: { margin: 24 },
});
