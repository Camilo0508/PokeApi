import Anthropic from '@anthropic-ai/sdk';
import { detectar } from './buscar.js';

const client = new Anthropic();

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

// Convierte el error de la API de Claude en un mensaje que se entienda en el chat
function explicarError(err) {
  const texto = String(err?.message ?? '').toLowerCase();
  if (err?.status === 401 || texto.includes('api key') || texto.includes('apikey')) {
    return '⚠️ La API key de Claude no es válida o no está configurada (ANTHROPIC_API_KEY en Render o en el .env).';
  }
  if (texto.includes('credit') || texto.includes('billing')) {
    return '⚠️ La cuenta de Claude no tiene créditos. Revisa la facturación en console.anthropic.com.';
  }
  if (err?.status === 403) return '⚠️ La API key no tiene permiso para usar este modelo.';
  if (err?.status === 404) return '⚠️ El modelo de Claude configurado no existe para esta cuenta.';
  if (err?.status === 429) return '⏳ Se hicieron muchas preguntas seguidas. Espera un momento e intenta otra vez.';
  if (err?.status >= 500) return '⏳ El servicio de Claude está ocupado. Intenta de nuevo en un momento.';
  return `⚠️ La IA no pudo responder (${err?.status ?? 'sin conexión'}): ${err?.message ?? 'error desconocido'}`;
}

export async function responder(mensajes) {
  // 1. El backend busca en el texto el nombre de un registro de las bases de datos, sin IA
  const resultado = await detectar(mensajes);

  // 2. Varios con el mismo nombre: se pide que sea más específico
  if (resultado.varios) {
    return `Encontré varios con ese nombre:\n${resultado.varios.map((n) => `• ${n}`).join('\n')}\n\n¿De cuál me hablas? Escribe el nombre completo.`;
  }

  // 3. No existe: se responde aquí y Claude no se consulta
  if (!resultado.encontrado) {
    const aviso = resultado.caidos.length
      ? `\n\n(No pude revisar ${resultado.caidos.join(', ')}: el servicio no respondió, intenta de nuevo en un momento.)`
      : '';
    return `Ese personaje o persona no está en nuestra base de datos. Puedes preguntarme por los pokémon, los personajes de One Piece o los docentes que tenemos guardados.${aviso}`;
  }

  // 4. Sí existe: Claude responde usando solo ese registro
  let final;
  try {
    final = await client.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      system: `${SISTEMA}\n\nREGISTRO (${resultado.categoria}: ${resultado.nombre}):\n${JSON.stringify(resultado.datos)}`,
      messages: mensajes,
      output_config: { effort: 'medium' },
    });
  } catch (err) {
    console.error('Error de la API de Claude:', err.status, err.message);
    return explicarError(err);
  }

  if (final.stop_reason === 'refusal') return 'No puedo responder esa pregunta.';
  return final.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}
