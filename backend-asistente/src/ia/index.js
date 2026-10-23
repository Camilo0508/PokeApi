import { GROQ_MODEL, IA_PROVEEDOR } from '../config.js';
import { preguntarClaude } from './claude.js';
import { crearProveedorCompatible } from './compatible-openai.js';
import { preguntarGemini } from './gemini.js';

// Todas las IAs que sabe usar el asistente. La app escoge una por su "id";
// solo se puede usar si su clave está configurada en el .env o en Render.
const PROVEEDORES = {
  groq: {
    nombre: 'Groq',
    variableClave: 'GROQ_API_KEY',
    preguntar: crearProveedorCompatible({
      nombre: 'Groq',
      url: 'https://api.groq.com/openai/v1/chat/completions',
      variableClave: 'GROQ_API_KEY',
      modelo: GROQ_MODEL,
    }),
  },
  gemini: { nombre: 'Gemini', variableClave: 'GEMINI_API_KEY', preguntar: preguntarGemini },
  claude: { nombre: 'Claude', variableClave: 'ANTHROPIC_API_KEY', preguntar: preguntarClaude },
};

const tieneClave = (id) => Boolean(process.env[PROVEEDORES[id].variableClave]);

// La IA por defecto: la de IA_PROVEEDOR si existe, si no Groq
export const IA_POR_DEFECTO = PROVEEDORES[IA_PROVEEDOR] ? IA_PROVEEDOR : 'groq';

if (!PROVEEDORES[IA_PROVEEDOR]) {
  console.warn(`⚠️  IA_PROVEEDOR="${IA_PROVEEDOR}" no existe: se usará groq.`);
}
if (!tieneClave(IA_POR_DEFECTO)) {
  console.warn(`⚠️  Falta ${PROVEEDORES[IA_POR_DEFECTO].variableClave}: la IA por defecto (${IA_POR_DEFECTO}) no podrá responder.`);
}

// Lo que ve la app para armar el selector (nunca se envían las claves)
export function listarIas() {
  return Object.entries(PROVEEDORES).map(([id, p]) => ({
    id,
    nombre: p.nombre,
    disponible: tieneClave(id),
    porDefecto: id === IA_POR_DEFECTO,
  }));
}

// Devuelve la IA pedida, o la por defecto si no existe
export function elegirIa(id) {
  const elegida = PROVEEDORES[id] ? id : IA_POR_DEFECTO;
  return { id: elegida, ...PROVEEDORES[elegida] };
}
