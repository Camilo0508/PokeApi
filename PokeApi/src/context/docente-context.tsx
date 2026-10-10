import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import {AppState} from 'react-native';
import * as Network from 'expo-network';
import {contarPendientes, sincronizar} from '@/services/docente-offline';
import { Docente } from '@/types/docente';

interface DocenteContextValue {
  selected: Docente | null;
  selectDocente: (docente: Docente | null) => void;
  version: number;
  recargar: () => void;
  pendientes: number;
}

const DocenteContext = createContext<DocenteContextValue | null>(null);

export function DocenteProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Docente | null>(null);
  const [version, setVersion] = useState(0);
  const [pendientes, setPendientes] =useState(0);
  const recargar = useCallback(() => {setVersion((v) => v + 1), 
  contarPendientes().then(setPendientes);
},[]);
  const intentarSincronizar = useCallback(async () => {
    const antes = await contarPendientes();
    if (antes === 0) return setPendientes(0);
    await sincronizar();
    const despues = await contarPendientes();
    setPendientes(despues);
    if (despues < antes) setVersion((v) => v + 1); // la lista se refresca con los ids reales
  }, []);
    useEffect(() => {
    intentarSincronizar(); // al abrir la app
    // Volvió el internet del teléfono
    const red = Network.addNetworkStateListener((estado) => {
      if (estado.isInternetReachable) intentarSincronizar();
    });
    // La app vuelve a primer plano
    const app = AppState.addEventListener('change', (s) => {
      if (s === 'active') intentarSincronizar();
    });
    // Por si el internet nunca se cayó pero el microservicio estaba apagado
    const reloj = setInterval(intentarSincronizar, 15000);
    return () => {
      red.remove();
      app.remove();
      clearInterval(reloj);
    };
  }, [intentarSincronizar]);

  return (
    <DocenteContext.Provider value={{ selected, selectDocente: setSelected, version, recargar, pendientes }}>
      {children}
    </DocenteContext.Provider>
  );
}

export function useDocente() {
  const context = useContext(DocenteContext);
  if (!context) throw new Error('useDocente se debe usar dentro de <DocenteProvider>');
  return context;
}
