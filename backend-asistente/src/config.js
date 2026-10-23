export const PORT = Number(process.env.PORT ?? 8003);
export const POKEMON_API_URL = process.env.POKEMON_API_URL ?? 'http://localhost:8000';
export const ONEPIECE_API_URL = process.env.ONEPIECE_API_URL ?? 'http://localhost:8001';
export const DOCENTES_API_URL = process.env.DOCENTES_API_URL ?? 'http://localhost:8002';

// IA que se usa cuando la app no elige ninguna: groq, gemini o claude
export const IA_PROVEEDOR = (process.env.IA_PROVEEDOR ?? 'groq').trim().toLowerCase();

// Modelos de cada IA (se pueden cambiar en el .env o en Render sin tocar código)
export const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant';
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-flash-latest';
