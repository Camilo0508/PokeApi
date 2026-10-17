import { ASISTENTE_API_URL } from '@/constants/config';

export type TipoChat = 'pokemon' | 'onepiece' | 'docente';

export interface Mensaje {
  role: 'user' | 'assistant';
  content: string;
}

// Pregunta al microservicio del asistente. La API key NUNCA está en la app: solo en el backend.
export async function preguntar(tipo: TipoChat, nombre: string, mensajes: Mensaje[]): Promise<string> {
  // Render gratis puede tardar en despertar, por eso se espera hasta 2 minutos
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);

  let res: Response;
  try {
    res = await fetch(`${ASISTENTE_API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, nombre, mensajes }),
      signal: controller.signal,
    });
  } catch {
    throw new Error('No se pudo conectar con el asistente. Revisa que el servicio esté encendido.');
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Error del asistente (${res.status})`);
  return data.respuesta;
}
