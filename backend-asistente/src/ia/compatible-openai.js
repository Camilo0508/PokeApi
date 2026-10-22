// Groq, OpenAI y DeepSeek usan el mismo formato de API ("chat completions"),
// así que una sola función sirve para las tres: solo cambia la URL, la clave y el modelo.
export function crearProveedorCompatible({ nombre, url, variableClave, modelo }) {
  // Modelo que se está usando; cambia solo si el configurado deja de existir
  let modeloEnUso = modelo;

  // Los modelos se retiran seguido (sobre todo en Groq). Si el configurado ya no existe,
  // se pide la lista de modelos de la cuenta y se escoge uno de chat.
  async function buscarOtroModelo(clave) {
    try {
      const res = await fetch(url.replace(/\/chat\/completions$/, '/models'), {
        headers: { Authorization: `Bearer ${clave}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      const ids = ((await res.json())?.data ?? [])
        .filter((m) => m.active !== false)
        .map((m) => m.id)
        // fuera los que no son para chat: audio, voz, filtros de seguridad, embeddings
        .filter((id) => !/whisper|tts|guard|embed|playai|orpheus|audio|image|vision|compound/i.test(id));
      const preferidos = [/gpt-oss-120b/, /llama-3\.3-70b/, /llama.*70b/, /gpt-oss/, /llama/, /qwen/, /deepseek/, /gpt-4o-mini/];
      for (const patron of preferidos) {
        const encontrado = ids.find((id) => patron.test(id));
        if (encontrado) return encontrado;
      }
      return ids[0] ?? null;
    } catch {
      return null;
    }
  }

  const esErrorDeModelo = (status, mensaje) =>
    (status === 400 || status === 404) && /model/i.test(String(mensaje ?? ''));

  function explicarError(status, mensaje) {
    const texto = String(mensaje ?? '').toLowerCase();
    if (status === 401 || status === 403 || texto.includes('api key')) {
      return `⚠️ La API key de ${nombre} no es válida o no está configurada (${variableClave} en Render o en el .env).`;
    }
    if (status === 402 || texto.includes('balance') || texto.includes('quota')) {
      return `⚠️ La cuenta de ${nombre} no tiene saldo o se acabó su cuota.`;
    }
    if (status === 429) return `⏳ Se alcanzó el límite de ${nombre}. Espera un minuto e intenta otra vez.`;
    if (status === 404 || (status === 400 && texto.includes('model'))) {
      return `⚠️ El modelo "${modeloEnUso}" no está disponible en ${nombre}. Cambia la variable del modelo en el .env o en Render.`;
    }
    if (status >= 500) return `⏳ ${nombre} está ocupado. Intenta de nuevo en un momento.`;
    return `⚠️ ${nombre} no pudo responder (${status || 'sin conexión'}): ${mensaje ?? 'error desconocido'}`;
  }

  return async function preguntar(sistema, mensajes, esperaMs, yaReintento = false) {
    const clave = process.env[variableClave];
    if (!clave) return explicarError(401);
    const inicio = Date.now();

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clave}` },
        body: JSON.stringify({
          model: modeloEnUso,
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

      // El modelo ya no existe: se busca otro y se intenta una vez más
      if (!yaReintento && esErrorDeModelo(res.status, data?.error?.message)) {
        const otro = await buscarOtroModelo(clave);
        if (otro && otro !== modeloEnUso) {
          console.warn(`⚠️  ${nombre}: el modelo "${modeloEnUso}" no está disponible, se usará "${otro}".`);
          modeloEnUso = otro;
          const restante = esperaMs - (Date.now() - inicio);
          if (restante > 2000) return preguntar(sistema, mensajes, restante, true);
        }
      }
      return explicarError(res.status, data?.error?.message);
    }

    const texto = data?.choices?.[0]?.message?.content?.trim();
    return texto || 'No puedo responder esa pregunta.';
  };
}
