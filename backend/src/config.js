import { fileURLToPath } from 'node:url';

export const POKEAPI_URL = 'https://pokeapi.co/api/v2';
export const DB_PATH = fileURLToPath(new URL('../pokedex.db', import.meta.url));
export const TIMEOUT_MS = 5000; // si la PokeAPI no responde en 5 s, se asume que no hay internet
export const MAX_MOVES = 2;
export const PORT = 8000;
