import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Dos microservicios distintos, cada uno con su propia base de datos
const PORT_POKEMON = 8000; // Node + Express + PostgreSQL
const PORT_ONEPIECE = 8001; // Python + FastAPI + MongoDB
const PORT_DOCENTES = 8002; // Node sin Express (node:http) + PostgreSQL

function resolverApiUrl(port: number, urlDeProduccion?: string) {
  // 1. Si hay URL de producción en .env, se usa esa (los servicios en Render)
  if (urlDeProduccion) return urlDeProduccion;

  // 2. En navegador: el backend está en el mismo equipo que abrió la página.
  //    "typeof window" es necesario porque Expo renderiza la web primero en Node,
  //    donde window no existe.
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return `http://localhost:${port}`;
    return `http://${window.location.hostname}:${port}`;
  }

  // 3. En celular: se toma la IP del servidor de Expo (el PC donde corre Metro)
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:${port}` : `http://localhost:${port}`;
}

// En desarrollo apunta a tu PC; en producción, a las URLs de Render
export const API_URL = resolverApiUrl(PORT_POKEMON, process.env.EXPO_PUBLIC_API_URL);
export const ONEPIECE_API_URL = resolverApiUrl(PORT_ONEPIECE, process.env.EXPO_PUBLIC_ONEPIECE_API_URL);
export const DOCENTES_API_URL = resolverApiUrl(PORT_DOCENTES, process.env.EXPO_PUBLIC_DOCENTES_API_URL);
