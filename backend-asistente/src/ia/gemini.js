import { GEMINI_MODEL } from '../config.js';

const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Convierte el error de Gemini en un mensaje que se entienda en el chat
function explicarError(status, mensaje) {
  const texto = String(mensaje ?? '').toLowerCase();
  if (texto.includes('api key') || status === 401 || status === 403) {
    return '⚠️ La API key de Gemini no es válida o no está configurada (GEMINI_API_KEY en Render o en el .env).';
  }
  if (status === 429) return '⏳ Se alcanzó el límite gratis de Gemini. Espera un minuto e intenta otra vez.';
  if (status === 404) return `⚠️ El modelo de Gemini "${GEMINI_MODEL}" no existe para esta clave.`;
  if (status >= 500) return '⏳ Gemini está ocupado. Intenta de nuevo en un momento.';
  return `⚠️ Gemini no pudo responder (${status || 'sin conexión'}): ${mensaje ?? 'error desconocido'}`;
}

export async function preguntarGemini(sistema, mensajes, esperaMs) {
  if (!process.env.GEMINI_API_KEY) return explicarError(401, 'api key');

  let res;
  try {
    res = await fetch(`${URL_BASE}/${GEMINI_MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: sistema }] },
        // Gemini llama "model" a lo que Claude llama "assistant"
        contents: mensajes.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 8192 },
      }),
      signal: AbortSignal.timeout(esperaMs),
    });
  } catch (err) {
    if (err.name === 'TimeoutError') return '⏳ Gemini no respondió a tiempo. Prueba con un tiempo de espera mayor.';
    console.error('Error de conexión con Gemini:', err.message);
    return explicarError(0, err.message);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    console.error('Error de la API de Gemini:', res.status, data?.error?.message);
    return explicarError(res.status, data?.error?.message);
  }

  // Gemini bloqueó la pregunta o la respuesta por sus filtros de seguridad
  if (data?.promptFeedback?.blockReason) return 'No puedo responder esa pregunta.';

  const texto = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  return texto || 'No puedo responder esa pregunta.';
}
