import Anthropic from '@anthropic-ai/sdk';
import { buscar } from './buscar.js';

const client = new Anthropic();

const CATEGORIA = { pokemon: 'pokémon', onepiece: 'One Piece', docente: 'docentes' };

const SISTEMA = `Eres el asistente de una aplicación de pokémon, personajes de One Piece y docentes.

Reglas:
1. Usa ÚNICAMENTE la información del REGISTRO que aparece al final. No inventes ni uses conocimiento propio.
2. Si te preguntan algo general como "¿qué sabes de...?", "háblame de..." o "¿quién es...?", da una
   descripción COMPLETA y detallada: empieza con un párrafo de presentación y luego explica TODOS los
   datos del registro, uno por uno, diciendo qué significa cada dato.
3. Si la pregunta es concreta (por ejemplo "¿cuánto pesa?"), responde ese dato y agrega una o dos frases de contexto.
4. Si te preguntan algo que no está en el registro, responde: "Ese dato no está en nuestra base de datos."
5. Si la pregunta no trata sobre el registro, responde: "Solo puedo responder sobre el registro consultado."
6. La altura de los pokémon está en decímetros y el peso en hectogramos: conviértelos a metros y kilogramos.
7. Formato: texto plano para un chat de celular. NO uses markdown (nada de **, # ni tablas).
   Separa por secciones con un emoji al inicio y usa "•" para las listas.
8. Responde siempre en español, de forma amable y clara.`;

export async function responder({ tipo, nombre, mensajes }) {
  // 1. Buscar en la base de datos, sin IA
  const resultado = await buscar(tipo, nombre);

  if (resultado.error) {
    return `El servicio de ${CATEGORIA[tipo]} no respondió. Intenta de nuevo en un momento.`;
  }

  // 2. No existe: se responde aquí y Claude no se consulta
  if (!resultado.encontrado) {
    return `"${nombre}" no está en nuestra base de datos de ${CATEGORIA[tipo]}.`;
  }

  // 3. Sí existe: Claude responde usando solo ese registro
  const final = await client.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 4000,
    system: `${SISTEMA}\n\nREGISTRO (${CATEGORIA[tipo]}):\n${JSON.stringify(resultado.datos)}`,
    messages: mensajes,
    output_config: { effort: 'medium' },
  });

  if (final.stop_reason === 'refusal') return 'No puedo responder esa pregunta.';
  return final.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}