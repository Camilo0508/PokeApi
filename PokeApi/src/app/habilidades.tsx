import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { estiloDeTipo } from '@/constants/pokemon-types';
import { usePokemon } from '@/context/pokemon-context';
import { useTheme } from '@/context/theme-context';

const LIMITE = 12; // cuántos movimientos se muestran al abrir la pantalla

export default function HabilidadesScreen() {
    // Los datos llegan por Context, no por props ni pidiéndolos otra vez al backend
    const {selected} = usePokemon();
    const {colors, tema} = useTheme();
    const router = useRouter();
    // State: controla si se ve la lista corta o la lista completa de movimientos
    const [verTodos, setVerTodos] = useState(false);

    if(!selected){
        return(
            <View style={[styles.vacio, {backgroundColor: colors.background}]}>
                <Text style={[styles.textoVacio, {color: colors.textSecondary}]}>Busca un pokémon para ver su información</Text>
                <Pressable style={[styles.boton, {backgroundColor: colors.primary}]} onPress={() => router.replace('/buscar')}>
                    <Text style={styles.botonTexto}>Ir a Buscar</Text>
                </Pressable>
            </View>
        );
    }

    // Solo los primeros LIMITE movimientos, salvo que el usuario pida verlos todos
    const movimientos = verTodos ? selected.moves : selected.moves.slice(0, LIMITE);
    // El color del primer tipo manda en toda la pantalla
    const tipo = estiloDeTipo(selected.types[0]);

    return(
        <ScrollView style={[styles.fondo, {backgroundColor: colors.background}]} contentContainerStyle={styles.container}>
            {/* Encabezado: imagen, nombre y número */}
            <View
                style={[
                    styles.tarjeta,
                    styles.encabezado,
                    {backgroundColor: colors.card, borderColor: tipo.color + '55', shadowColor: tipo.color},
                ]}>
                {/* Marca de agua con el icono del tipo */}
                <Text style={[styles.marcaAgua, {opacity: tema === 'oscuro' ? 0.12 : 0.08}]}>{tipo.icono}</Text>
                <View style={[styles.halo, {backgroundColor: tipo.color + '26'}]} />

                <Image source={selected.image} style={styles.imagen} contentFit="contain" cachePolicy="disk" />
                <Text style={[styles.numero, {color: colors.textSecondary}]}>#{String(selected.id).padStart(3, '0')}</Text>
                <Text style={[styles.nombre, {color: colors.text}]}>{selected.name}</Text>

                {/* Tipos con su color */}
                <View style={styles.tipos}>
                    {selected.types.map((nombreTipo) => {
                        const t = estiloDeTipo(nombreTipo);
                        return (
                            <Text
                                key={nombreTipo}
                                style={[styles.tipo, {backgroundColor: t.color + '26', color: t.color, borderColor: t.color + '55'}]}>
                                {t.icono} {t.nombre}
                            </Text>
                        );
                    })}
                </View>

                <View style={styles.datos}>
                    <Dato icono="📏" etiqueta="Altura" valor={`${selected.height / 10} m`} color={tipo.color} />
                    <Dato icono="⚖️" etiqueta="Peso" valor={`${selected.weight / 10} kg`} color={tipo.color} />
                    <Dato icono="⚔️" etiqueta="Movimientos" valor={String(selected.moves.length)} color={tipo.color} />
                </View>
            </View>

            <Seccion titulo="Habilidades" cantidad={selected.abilities.length} color={tipo.color}>
                <View style={styles.etiquetas}>
                    {selected.abilities.map((habilidad) => (
                        <Text key={habilidad} style={[styles.etiqueta, styles.etiquetaRoja, {backgroundColor: tipo.color}]}>
                            {habilidad.replaceAll('-', ' ')}
                        </Text>
                    ))}
                </View>
            </Seccion>

            <Seccion titulo="Movimientos" cantidad={selected.moves.length} color={tipo.color}>
                <View style={styles.etiquetas}>
                    {movimientos.map((movimiento) => (
                        <Text key={movimiento} style={[styles.etiqueta, styles.etiquetaGris, {backgroundColor: colors.background, color: colors.text}]}>
                            {movimiento.replaceAll('-', ' ')}
                        </Text>
                    ))}
                </View>

                {selected.moves.length > LIMITE && (
                    <Pressable style={styles.verMas} onPress={() => setVerTodos((antes) => !antes)}>
                        <Text style={[styles.verMasTexto, {color: colors.primary}]}>
                            {verTodos
                                ? 'Ver menos'
                                : `Ver los ${selected.moves.length} movimientos`}
                        </Text>
                    </Pressable>
                )}
            </Seccion>

            <Pressable
                style={({pressed}) => [styles.boton, {backgroundColor: tipo.color, opacity: pressed ? 0.85 : 1}]}
                onPress={() => router.navigate('/buscar')}>
                <Text style={styles.botonTexto}>Volver a buscar</Text>
            </Pressable>
        </ScrollView>
    );
}

// Componentes pequeños que reciben props
function Dato({icono, etiqueta, valor, color}: {icono: string; etiqueta: string; valor: string; color: string}) {
    const {colors} = useTheme();
    return (
        <View style={[styles.dato, {backgroundColor: color + '1A', borderColor: color + '40'}]}>
            <Text style={styles.datoIcono}>{icono}</Text>
            <Text style={[styles.datoValor, {color: colors.text}]}>{valor}</Text>
            <Text style={[styles.datoEtiqueta, {color: colors.textSecondary}]}>{etiqueta}</Text>
        </View>
    );
}

function Seccion({titulo, cantidad, color, children}: {titulo: string; cantidad: number; color: string; children: React.ReactNode}) {
    const {colors} = useTheme();
    return (
        <View style={[styles.tarjeta, {backgroundColor: colors.card, borderColor: colors.border}]}>
            <View style={styles.tituloFila}>
                <View style={[styles.barrita, {backgroundColor: color}]} />
                <Text style={[styles.titulo, {color: colors.text}]}>{titulo}</Text>
                <Text style={[styles.contador, {backgroundColor: colors.background, color: colors.textSecondary}]}>{cantidad}</Text>
            </View>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    fondo: { flex: 1 },
    container: { padding: 12, gap: 12, paddingBottom: 32 },
    vacio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
    textoVacio: { textAlign: 'center' },

    encabezado: {borderWidth: 1, overflow: 'hidden'},
    marcaAgua: {position: 'absolute', right: -16, bottom: -24, fontSize: 130},
    halo: {position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: 75},
    tipos: {flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10},
    tipo: {
        fontSize: 12,
        fontWeight: '700',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        overflow: 'hidden',
    },
    tarjeta: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 16,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    imagen: { width: 180, height: 180, alignSelf: 'center' },
    numero: { textAlign: 'center', fontSize: 13 },
    nombre: {
        textAlign: 'center',
        fontSize: 30,
        fontWeight: 'bold',
        textTransform: 'capitalize',
    },

    datos: { flexDirection: 'row', gap: 8, marginTop: 18, alignSelf: 'stretch' },
    dato: { flex: 1, alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingVertical: 10 },
    datoIcono: { fontSize: 16, marginBottom: 2 },
    datoValor: { fontSize: 17, fontWeight: '800' },
    datoEtiqueta: { fontSize: 10, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },

    tituloFila: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    barrita: { width: 4, height: 18, borderRadius: 2 },
    titulo: { fontSize: 18, fontWeight: 'bold' },
    contador: {
        fontSize: 12,
        fontWeight: '700',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        overflow: 'hidden',
    },

    etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    etiqueta: {
        fontSize: 12,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        overflow: 'hidden',
        textTransform: 'capitalize',
    },
    etiquetaRoja: { color: '#fff', fontWeight: '600' },
    etiquetaGris: {},

    verMas: { marginTop: 12, alignItems: 'center', paddingVertical: 8 },
    verMasTexto: { fontWeight: '700' },

    boton: {
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
    },
    botonTexto: { color: '#fff', fontWeight: 'bold' },
});
