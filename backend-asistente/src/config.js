export const PORT = Number(process.env.PORT ?? 8003);
export const POKEMON_API_URL = process.env.POKEMON_API_URL ?? 'http://localhost:8000';
export const ONEPIECE_API_URL = process.env.ONEPIECE_API_URL ?? 'http://localhost:8001';
export const DOCENTES_API_URL = process.env.DOCENTES_API_URL ?? 'http://localhost:8002';

// Qué IA responde: "gemini" (por defecto, gratis) o "claude". Se cambia con IA_PROVEEDOR en el .env o en Render
export const IA_PROVEEDOR = (process.env.IA_PROVEEDOR ?? 'gemini').trim().toLowerCase();
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-flash-latest';

const CLAVES = { gemini: 'GEMINI_API_KEY', claude: 'ANTHROPIC_API_KEY' };

if (!CLAVES[IA_PROVEEDOR]) {
  console.warn(`⚠️  IA_PROVEEDOR="${IA_PROVEEDOR}" no existe: usa "gemini" o "claude".`);
} else if (!process.env[CLAVES[IA_PROVEEDOR]]) {
  console.warn(`⚠️  Falta ${CLAVES[IA_PROVEEDOR]}: el asistente no podrá responder con ${IA_PROVEEDOR}.`);
}
