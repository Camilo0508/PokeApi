import { createContext, useContext, useState, type ReactNode } from 'react';

import { Character } from '@/types/onepiece';

// Igual que el de pokémon: guarda el personaje que se tocó en la lista
interface CharacterContextValue {
  selected: Character | null;
  selectCharacter: (character: Character) => void;
}

const CharacterContext = createContext<CharacterContextValue | null>(null);

export function CharacterProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Character | null>(null);

  return (
    <CharacterContext.Provider value={{ selected, selectCharacter: setSelected }}>
      {children}
    </CharacterContext.Provider>
  );
}

export function useCharacter() {
  const context = useContext(CharacterContext);
  if (!context) throw new Error('useCharacter se debe usar dentro de <CharacterProvider>');
  return context;
}
