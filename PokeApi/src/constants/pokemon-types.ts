/**
 * Colores e iconos por tipo de pokémon.
 * El color se usa en el borde y el brillo de la tarjeta, y el emoji como
 * marca de agua (una imagen grande y muy transparente detrás del contenido).
 */
interface EstiloTipo {
  color: string;
  icono: string;
  nombre: string; // el tipo en español
}

export const TiposPokemon: Record<string, EstiloTipo> = {
  normal: { color: '#A8A878', icono: '⭐', nombre: 'Normal' },
  fire: { color: '#F97316', icono: '🔥', nombre: 'Fuego' },
  water: { color: '#3B82F6', icono: '💧', nombre: 'Agua' },
  grass: { color: '#22C55E', icono: '🌿', nombre: 'Planta' },
  electric: { color: '#FACC15', icono: '⚡', nombre: 'Eléctrico' },
  ice: { color: '#67E8F9', icono: '❄️', nombre: 'Hielo' },
  fighting: { color: '#DC2626', icono: '🥊', nombre: 'Lucha' },
  poison: { color: '#A855F7', icono: '☠️', nombre: 'Veneno' },
  ground: { color: '#D97706', icono: '🏜️', nombre: 'Tierra' },
  flying: { color: '#93C5FD', icono: '🪽', nombre: 'Volador' },
  psychic: { color: '#EC4899', icono: '🔮', nombre: 'Psíquico' },
  bug: { color: '#84CC16', icono: '🐛', nombre: 'Bicho' },
  rock: { color: '#A8783A', icono: '🪨', nombre: 'Roca' },
  ghost: { color: '#7C3AED', icono: '👻', nombre: 'Fantasma' },
  dragon: { color: '#6366F1', icono: '🐉', nombre: 'Dragón' },
  dark: { color: '#57534E', icono: '🌙', nombre: 'Siniestro' },
  steel: { color: '#94A3B8', icono: '⚙️', nombre: 'Acero' },
  fairy: { color: '#F9A8D4', icono: '🧚', nombre: 'Hada' },
};

const POR_DEFECTO: EstiloTipo = { color: '#94A3B8', icono: '❔', nombre: 'Desconocido' };

export function estiloDeTipo(tipo?: string): EstiloTipo {
  return (tipo && TiposPokemon[tipo]) || POR_DEFECTO;
}

/** El color del primer tipo es el que manda en la tarjeta */
export function colorPrincipal(types: string[]): string {
  return estiloDeTipo(types[0]).color;
}
