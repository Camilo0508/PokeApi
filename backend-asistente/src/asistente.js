import Anthropic from '@anthropic-ai/sdk';
import { buscar } from './buscar.js';

const client = new Anthropic();

const CATEGORIA = { pokemon: 'pokémon', onepiece: 'One Piece', docente: 'docentes' };

const SISTEMA = `Eres el asistente de una aplicación de pokémon, personajes de One Piece y docentes.
Reglas:
1. Responde ÚNICAMENTE con la información del REGISTRO que aparece al final. No uses conocimiento propio.
2. Si te preguntan algo que no está en el registro, responde exactamente: "Ese dato no está en nuestra base de datos."
3. Si la pregunta no trata sobre el registro, responde: "Solo puedo responder sobre el registro consultado."
4. La altura de los pokémon está en decímetros y el peso en hectogramos: conviértelos a metros y kilogramos.
5. Responde en español, de forma clara.`;

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
    output_config: { effort: 'low' },
  });

  if (final.stop_reason === 'refusal') return 'No puedo responder esa pregunta.';
  return final.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}