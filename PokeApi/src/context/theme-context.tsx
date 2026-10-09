import { createContext, useContext, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { NombreTema, Paleta, Themas } from '@/constants/colors';

// Lo que comparte este Context con todas las pantallas
interface ThemeContextValue {
  tema: NombreTema;
  colors: Paleta; // la paleta de colores que toca usar
  cambiarTema: () => void; // el botón de la barra llama a esto
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const delSistema = useColorScheme(); // 'light' | 'dark' según el celular
  const [tema, setTema] = useState<NombreTema>(delSistema === 'dark' ? 'oscuro' : 'claro');

  const cambiarTema = () => setTema((actual) => (actual === 'claro' ? 'oscuro' : 'claro'));

  return (
    <ThemeContext.Provider value={{ tema, colors: Themas[tema], cambiarTema }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook propio para no repetir useContext en cada pantalla
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme se debe usar dentro de <ThemeProvider>');
  return context;
}
