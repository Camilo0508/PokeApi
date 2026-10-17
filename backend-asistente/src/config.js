export const PORT = Number(process.env.PORT ?? 8003);
export const POKEMON_API_URL = process.env.POKEMON_API_URL ?? 'http://localhost:8000';
export const ONEPIECE_API_URL = process.env.ONEPIECE_API_URL ?? 'http://localhost:8001';
export const DOCENTES_API_URL = process.env.DOCENTES_API_URL ?? 'http://localhost:8002';

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️  Falta ANTHROPIC_API_KEY: el asistente no podrá responder.');
}