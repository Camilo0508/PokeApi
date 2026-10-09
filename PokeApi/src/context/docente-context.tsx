import { createContext, useContext, useState, type ReactNode } from 'react';

import { Docente } from '@/types/docente';

// Mismo patrón que los otros Contexts: guarda el docente seleccionado
interface DocenteContextValue {
  selected: Docente | null;
  selectDocente: (docente: Docente) => void;
}

const DocenteContext = createContext<DocenteContextValue | null>(null);

export function DocenteProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Docente | null>(null);

  return (
    <DocenteContext.Provider value={{ selected, selectDocente: setSelected }}>
      {children}
    </DocenteContext.Provider>
  );
}

export function useDocente() {
  const context = useContext(DocenteContext);
  if (!context) throw new Error('useDocente se debe usar dentro de <DocenteProvider>');
  return context;
}
