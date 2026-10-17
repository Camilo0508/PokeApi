import { useGlobalSearchParams, useRouter, type Href } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, Text, View } from 'react-native';

import { CharacterProvider } from '@/context/character-context';
import { DocenteProvider } from '@/context/docente-context';
import { PokemonProvider } from '@/context/pokemon-context';
import { ThemeProvider, useTheme } from '@/context/theme-context';

// Layout: los dos Providers van por fuera de las pestañas para que todas los vean
export default function TabLayout() {
  return (
    <ThemeProvider>
      <PokemonProvider>
        <CharacterProvider>
          <DocenteProvider>
            <Pestanas />
          </DocenteProvider>
        </CharacterProvider>
      </PokemonProvider>
    </ThemeProvider>
  );
}

// Componente aparte: un componente NO puede usar el Context que él mismo crea,
// por eso las pestañas van aquí y no dentro de TabLayout
function Pestanas() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: { backgroundColor: colors.card, height: 64, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerRight: () => <Acciones />,
      }}>
      {/* ===== Las 4 pestañas que se ven abajo ===== */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Pokédex',
          tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} />,
          headerRight: () => <Acciones conBuscar />, // solo aquí aparece la lupa
        }}
      />
      <Tabs.Screen
        name="onepiece"
        options={{ title: 'One Piece', tabBarIcon: ({ focused }) => <TabIcon emoji="🏴‍☠️" focused={focused} /> }}
      />
      <Tabs.Screen
        name="docentes"
        options={{ title: 'Docentes', tabBarIcon: ({ focused }) => <TabIcon emoji="🎓" focused={focused} /> }}
      />
      <Tabs.Screen
        name="asistente"
        options={{ title: 'Asistente', tabBarIcon: ({ focused }) => <TabIcon emoji="🤖" focused={focused} /> }}
      />

      {/* ===== Ocultas de la barra (href: null): se llega con botones ===== */}
      <Tabs.Screen
        name="buscar"
        options={{ title: 'Buscar pokémon', href: null, headerLeft: () => <BotonVolver destino="/" /> }}
      />
      <Tabs.Screen
        name="estado"
        options={{ title: 'Estado', href: null, headerLeft: () => <BotonVolver destino="/" /> }}
      />
      <Tabs.Screen
        name="habilidades"
        options={{ title: 'Información', href: null, headerLeft: () => <BotonVolver destino="/buscar" /> }}
      />
      <Tabs.Screen
        name="personaje"
        options={{ title: 'Personaje', href: null, headerLeft: () => <BotonVolver destino="/onepiece" /> }}
      />
      <Tabs.Screen
        name="docente"
        options={{ title: 'Docente', href: null, headerLeft: () => <BotonVolver destino="/docentes" /> }}
      />
      {/* Formulario para crear o editar un docente */}
      <Tabs.Screen
        name="docente-form"
        options={{ title: 'Docente', href: null, headerLeft: () => <BotonVolverFormulario /> }}
      />
    </Tabs>
  );
}

// Botones de la barra superior: buscar (solo en Pokédex), estado y tema
function Acciones({ conBuscar = false }: { conBuscar?: boolean }) {
  const router = useRouter();
  const { tema, cambiarTema } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 8 }}>
      {conBuscar && <BotonIcono emoji="🔍" onPress={() => router.navigate('/buscar')} />}
      <BotonIcono emoji="📡" onPress={() => router.navigate('/estado')} />
      <BotonIcono emoji={tema === 'claro' ? '🌙' : '☀️'} onPress={cambiarTema} />
    </View>
  );
}

function BotonIcono({ emoji, onPress }: { emoji: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
      })}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
    </Pressable>
  );
}

// Botón de regresar en la barra superior de la pantalla de información.
// Va siempre a un destino fijo: con pestañas, router.back() regresa a la
// primera pestaña (Pokédex) y no a la pantalla de donde se venía.
function BotonVolver({ destino }: { destino: Href }) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.navigate(destino)} style={{ paddingHorizontal: 16 }}>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>‹ Volver</Text>
    </Pressable>
  );
}

// En el formulario: si se estaba editando vuelve a la ficha, si se creaba a la lista
function BotonVolverFormulario() {
  const { id } = useGlobalSearchParams<{ id?: string }>();
  return <BotonVolver destino={id && id !== 'nuevo' ? '/docente' : '/docentes'} />;
}

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}
