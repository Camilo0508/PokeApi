import Anthropic from '@anthropic-ai/sdk';

// Se crea al usarla por primera vez: así el servidor arranca aunque no haya clave de Claude
let client = null;

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

export async function preguntarClaude(sistema, mensajes) {
  if (!process.env.ANTHROPIC_API_KEY) return explicarError({ status: 401 });

  let final;
  try {
    client ??= new Anthropic();
    final = await client.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      system: sistema,
      messages: mensajes,
      output_config: { effort: 'low' }, // un chat no necesita pensar mucho: responde más rápido
    });
  } catch (err) {
    console.error('Error de la API de Claude:', err.status, err.message);
    return explicarError(err);
  }

  if (final.stop_reason === 'refusal') return 'No puedo responder esa pregunta.';
  return final.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}
