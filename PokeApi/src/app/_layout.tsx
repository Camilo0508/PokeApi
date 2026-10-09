import { useRouter, type Href } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Pressable, Text } from 'react-native';

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
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.card },
        headerRight: () => <BotonTema />,
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Pokédex', tabBarIcon: ({ focused }) => <TabIcon emoji="📋" focused={focused} /> }}
      />
      <Tabs.Screen
        name="buscar"
        options={{ title: 'Buscar', tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} /> }}
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
        name="estado"
        options={{ title: 'Estado', tabBarIcon: ({ focused }) => <TabIcon emoji="📡" focused={focused} /> }}
      />
      {/* href: null la oculta de la barra: solo se llega con el botón de Buscar */}
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
    </Tabs>
  );
}

// Botón que cambia el tema: al tocarlo se redibujan todas las pantallas
function BotonTema() {
  const { tema, cambiarTema } = useTheme();
  return (
    <Pressable onPress={cambiarTema} style={{ paddingHorizontal: 16 }}>
      <Text style={{ fontSize: 18 }}>{tema === 'claro' ? '🌙' : '☀️'}</Text>
    </Pressable>
  );
}

// Botón de regresar en la barra superior de la pantalla de información
function BotonVolver({ destino }: { destino: Href }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace(destino))}
      style={{ paddingHorizontal: 16 }}>
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>‹ Volver</Text>
    </Pressable>
  );
}

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}
