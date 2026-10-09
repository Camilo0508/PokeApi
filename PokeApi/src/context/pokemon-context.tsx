import {createContext, useContext, useState, type ReactNode} from 'react';
import {Pokemon} from '@/types/pokemon';

// Este Context solo guarda el pokémon seleccionado.
// El del tema está aparte, en theme-context.tsx
interface PokemonContextValue{
    selected: Pokemon | null;
    selectPokemon: (pokemon: Pokemon) => void;
}

const PokemonContext = createContext<PokemonContextValue | null >(null);

export function PokemonProvider({children}: {children: ReactNode}){
    const [selected, setSelected] = useState<Pokemon | null>(null);
    return (
        <PokemonContext.Provider value={{selected, selectPokemon: setSelected}}>
            {children}
        </PokemonContext.Provider>
    );
}

export function usePokemon (){
    const context = useContext(PokemonContext);
    if (!context){
        throw new Error('usePokemon must be used within a PokemonProvider');
    }
    return context;
}
