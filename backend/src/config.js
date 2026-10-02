export const POKEAPI_URL = 'https://pokeapi.co/api/v2';

// Base de datos RELACIONAL (PostgreSQL)
export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://postgres:dev@localhost:5433/pokeapi';

export const TIMEOUT_MS = 8000;
export const PORT = Number(process.env.PORT ?? 8000);
