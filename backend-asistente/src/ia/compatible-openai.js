// Groq, OpenAI y DeepSeek usan el mismo formato de API ("chat completions"),
// así que una sola función sirve para las tres: solo cambia la URL, la clave y el modelo.
export function crearProveedorCompatible({ nombre, url, variableClave, modelo }) {
  function explicarError(status, mensaje) {
    const texto = String(mensaje ?? '').toLowerCase();
    if (status === 401 || status === 403 || texto.includes('api key')) {
      return `⚠️ La API key de ${nombre} no es válida o no está configurada (${variableClave} en Render o en el .env).`;
    }
    if (status === 402 || texto.includes('balance') || texto.includes('quota')) {
      return `⚠️ La cuenta de ${nombre} no tiene saldo o se acabó su cuota.`;
    }
    if (status === 429) return `⏳ Se alcanzó el límite de ${nombre}. Espera un minuto e intenta otra vez.`;
    if (status === 404) return `⚠️ El modelo "${modelo}" no existe en ${nombre}.`;
    if (status >= 500) return `⏳ ${nombre} está ocupado. Intenta de nuevo en un momento.`;
    return `⚠️ ${nombre} no pudo responder (${status || 'sin conexión'}): ${mensaje ?? 'error desconocido'}`;
  }

  return async function preguntar(sistema, mensajes, esperaMs) {
    const clave = process.env[variableClave];
    if (!clave) return explicarError(401);

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clave}` },
        body: JSON.stringify({
          model: modelo,
          // En este formato las instrucciones van como un mensaje con rol "system"
          messages: [{ role: 'system', content: sistema }, ...mensajes],
          max_tokens: 4000,
        }),
        signal: AbortSignal.timeout(esperaMs),
      });
    } catch (err) {
      if (err.name === 'TimeoutError') return `⏳ ${nombre} no respondió a tiempo. Prueba con un tiempo de espera mayor.`;
      console.error(`Error de conexión con ${nombre}:`, err.message);
      return explicarError(0, err.message);
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.error(`Error de la API de ${nombre}:`, res.status, data?.error?.message);
      return explicarError(res.status, data?.error?.message);
    }

    const texto = data?.choices?.[0]?.message?.content?.trim();
    return texto || 'No puedo responder esa pregunta.';
  };
}
