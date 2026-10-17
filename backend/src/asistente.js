import Anthropic from '@anthropic-ai/sdk';
import { betaTool } from '@anthropic-ai/sdk/helpers/beta/json-schema';

import { DOCENTES_API_URL, ONEPIECE_API_URL } from './config.js';
import * as db from './database.js';
const client = new Anthropic();

const SISTEMA = `Eres el asistente de la aplicación PokeAnime.
Reglas:
1. Solo respondes preguntas sobre los pokémon, los personajes de One Piece y los docentes guardados en la app.
2. Toda la información debe salir de las herramientas. No uses tu conocimiento general sobre Pokémon, One Piece ni sobre personas, aunque lo sepas.
3. Si la herramienta no encuentra el dato, responde: "Ese dato no está en nuestra base de datos."
4. Si la pregunta no es sobre la app (matemáticas, tareas, noticias, programación, etc.), responde: "Solo puedo responder preguntas sobre los pokémon, los personajes de One Piece y los docentes de la aplicación."
5. Responde en español y con detalle: menciona todos los datos útiles que trae la herramienta (tipos, habilidades, estadísticas, cargo, facultad, etc.).`;

async function pedir(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
const textoValido = (valor) => typeof valor === 'string' && valor.trim().length > 0;

const buscarPokemon = betaTool({
  name: 'buscar_pokemon',
  description:
    'Busca UN pokémon en la base de datos de la app por su nombre en inglés (ej. pikachu) o su número (ej. 25). Devuelve todos sus datos guardados.',
  inputSchema: {
    type: 'object',
    properties: { nombre: { type: 'string', description: 'Nombre o número del pokémon' } },
    required: ['nombre'],
    additionalProperties: false,
  },
  run: async ({ nombre }) => {
    if (!textoValido(nombre)) return 'Falta el nombre del pokémon.';
    const pokemon = await db.getPokemon(nombre.trim().toLowerCase());
    return JSON.stringify(pokemon ?? { encontrado: false });
  },
});

const listarPokemon = betaTool({
  name: 'listar_pokemon',
  description: 'Lista los pokémon guardados en la app (hasta 50). Úsala para preguntas como "¿qué pokémon hay?".',
  inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  run: async () => JSON.stringify(await db.listPokemon(50, 0)),
});

const buscarPersonaje = betaTool({
  name: 'buscar_personaje_one_piece',
  description: 'Busca personajes de One Piece guardados en la app por una parte de su nombre (ej. luffy, zoro).',
  inputSchema: {
    type: 'object',
    properties: { nombre: { type: 'string', description: 'Nombre o parte del nombre' } },
    required: ['nombre'],
    additionalProperties: false,
  },
  run: async ({ nombre }) => {
    if (!textoValido(nombre)) return 'Falta el nombre del personaje.';
    const data = await pedir(`${ONEPIECE_API_URL}/characters?q=${encodeURIComponent(nombre.trim())}&limit=5`);
    if (!data) return 'El servicio de One Piece no respondió.';
    return JSON.stringify(data.results.length ? data.results : { encontrado: false });
  },
});
const buscarDocente = betaTool({
  name: 'buscar_docente',
  description:
    'Busca docentes de la Fundación Universitaria Uninpahu guardados en la app por nombre, apellido, profesión o facultad. Con texto vacío lista los primeros 20.',
  inputSchema: {
    type: 'object',
    properties: { texto: { type: 'string', description: 'Nombre, apellido, profesión o facultad; vacío para listar' } },
    required: ['texto'],
    additionalProperties: false,
  },
  run: async ({ texto }) => {
    const buscar = typeof texto === 'string' ? texto.trim() : '';
    const data = await pedir(`${DOCENTES_API_URL}/docentes?buscar=${encodeURIComponent(buscar)}&limit=20`);
    if (!data) return 'El servicio de docentes no respondió.';
    return JSON.stringify(data.results.length ? data.results : { encontrado: false });
  },
});

export async function responder(mensajes) {
  const final = await client.beta.messages.toolRunner({
    model: 'claude-haiku-5-5',
    max_tokens: 16000,
    system: SISTEMA,
    tools: [buscarPokemon, listarPokemon, buscarPersonaje, buscarDocente],
    messages: mensajes,
    output_config: { effort: 'low' }, // chat: rápido y más barato
    max_iterations: 6, // se coloca el limite de ñlamadas 
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  });

  if (final.stop_reason === 'refusal') {
    return 'No puedo responder esa pregunta.';
  }
  return final.content
    .filter((bloque) => bloque.type === 'text')
    .map((bloque) => bloque.text)
    .join('\n');
}