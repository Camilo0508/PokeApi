import { fileURLToPath } from 'node:url';

export const ONEPIECE_URL = 'https://www.onepieceapi.com/api/characters';
// Segunda fuente: de aquí salen tripulación, fruta, trabajo y hakis
export const EXTRA_URL = 'https://api.api-onepiece.com/v2';
export const DB_PATH = fileURLToPath(new URL('../onepiece.db', import.meta.url));
export const TIMEOUT_MS = 8000; // si la API no responde, se usa la base local
export const PORT = 8001;       // el otro microservicio (pokémon) usa el 8000
