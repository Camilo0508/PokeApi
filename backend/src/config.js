export const POKEAPI_URL = 'https://pokeapi.co/api/v2';

// Base de datos RELACIONAL (PostgreSQL).
// En Render la pone el propio Render; en local sale del archivo .env
const LOCAL = 'postgres://postgres:dev@localhost:5433/pokeapi';

if (!process.env.DATABASE_URL) {
  console.warn('⚠️  No hay DATABASE_URL: se usará la base local de desarrollo.');
  console.warn('   En Render esto significa que el servicio no está enlazado a la base de datos.');
}

export const DATABASE_URL = process.env.DATABASE_URL ?? LOCAL;

export const TIMEOUT_MS = 8000;
export const PORT = Number(process.env.PORT ?? 8000);
