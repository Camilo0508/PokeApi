import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { Docente } from '@/types/docente';

// Mismo patrón que los otros Contexts: guarda el docente seleccionado
interface DocenteContextValue {
  selected: Docente | null;
  selectDocente: (docente: Docente | null) => void;
  // Cambia cada vez que se crea, edita o elimina un docente: la lista lo
  // escucha para volver a pedir los datos al microservicio
  version: number;
  recargar: () => void;
}

const DocenteContext = createContext<DocenteContextValue | null>(null);

export function DocenteProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Docente | null>(null);
  const [version, setVersion] = useState(0);
  const recargar = useCallback(() => setVersion((v) => v + 1), []);

  return (
    <DocenteContext.Provider value={{ selected, selectDocente: setSelected, version, recargar }}>
      {children}
    </DocenteContext.Provider>
  );
}

export function useDocente() {
  const context = useContext(DocenteContext);
  if (!context) throw new Error('useDocente se debe usar dentro de <DocenteProvider>');
  return context;
}
