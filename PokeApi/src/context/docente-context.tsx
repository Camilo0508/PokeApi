import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {AppState} from 'react-native';
import * as Network from 'expo-network';
import {
  contarNuevos,
  contarPendientes,
  guardarAjuste,
  leerAjuste,
  revisarNube,
  tomarFusionados,
} from '@/services/docente-offline';
import { Docente } from '@/types/docente';
export const INTERVALOS = [2, 10, 30] as const;
export type Intervalo = (typeof INTERVALOS)[number];

interface DocenteContextValue {
  selected: Docente | null;
  selectDocente: (docente: Docente | null) => void;
  version: number;
  recargar: () => void;
  // cambios del teléfono que faltan por subir
  pendientes: number; 
 // docentes insertados en la nube que aún no se han visto
  nuevos: number; 
   // docentes repetidos que se unieron al sincronizar
  fusionados: number; 

  cerrarFusionados: () => void;
  intervalo: Intervalo;
  cambiarIntervalo: (segundos: Intervalo) => void;
}
const DocenteContext = createContext<DocenteContextValue | null>(null);

export function DocenteProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Docente | null>(null);
  const [version, setVersion] = useState(0);
  const [pendientes, setPendientes] = useState(0);
  const [nuevos, setNuevos] = useState(0);
  const [fusionados, setFusionados] = useState(0);
  const [intervalo, setIntervalo] = useState<Intervalo>(10);

  const contar = useCallback(async () => {
    setPendientes(await contarPendientes());
    setNuevos(await contarNuevos());
    const unidos = tomarFusionados();
    if (unidos > 0) setFusionados((f) => f + unidos);
  }, []);

  const recargar = useCallback(() => {
    setVersion((v) => v + 1);
    contar();
  }, [contar]);

  // Sube lo pendiente y baja lo que cambió en la nube
  const revisar = useCallback(async () => {
    try {
      const antes = await contarPendientes();
      const huboCambios = await revisarNube();
      if (huboCambios || (await contarPendientes()) < antes) setVersion((v) => v + 1);
    } catch (e) {
      console.warn('No se pudo revisar la nube:', (e as Error).message);
    }
    await contar();
  }, [contar]);

  // El intervalo elegido queda guardado en SQLite
  useEffect(() => {
    leerAjuste('intervalo').then((valor) => {
      if (valor) setIntervalo(Number(valor) as Intervalo);
    });
  }, []);

  const cambiarIntervalo = useCallback((segundos: Intervalo) => {
    setIntervalo(segundos);
    guardarAjuste('intervalo', String(segundos));
  }, []);

  const cerrarFusionados = useCallback(() => setFusionados(0), []);

  useEffect(() => {
    // Al abrir la app (en el siguiente turno, no dentro del efecto)
    const inicio = setTimeout(revisar, 0);
    // Cada 2, 10 o 30 segundos, según lo que eligió el usuario
    const reloj = setInterval(revisar, intervalo * 1000);
    // Volvió el internet del teléfono
    const red = Network.addNetworkStateListener((estado) => {
      if (estado.isInternetReachable) revisar();
    });
    // La app vuelve a primer plano
    const app = AppState.addEventListener('change', (s) => {
      if (s === 'active') revisar();
    });
    return () => {
      clearTimeout(inicio);
      clearInterval(reloj);
      red.remove();
      app.remove();
    };
  }, [revisar, intervalo]);

  return (
    <DocenteContext.Provider
      value={{
        selected,
        selectDocente: setSelected,
        version,
        recargar,
        pendientes,
        nuevos,
        fusionados,
        cerrarFusionados,
        intervalo,
        cambiarIntervalo,
      }}>
      {children}
    </DocenteContext.Provider>
  );
}

export function useDocente() {
  const context = useContext(DocenteContext);
  if (!context) throw new Error('useDocente se debe usar dentro de <DocenteProvider>');
  return context;
}