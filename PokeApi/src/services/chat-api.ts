import { ASISTENTE_API_URL } from '@/constants/config';

export interface Mensaje {
  role: 'user' | 'assistant';
  content: string;
}

// Una IA que ofrece el backend; "disponible" es false si no tiene la clave configurada
export interface OpcionIa {
  id: string;
  nombre: string;
  disponible: boolean;
  porDefecto: boolean;
}

// Tiempos de espera que se pueden escoger en la app, en segundos
export const TIEMPOS_ESPERA = [20, 40, 80, 160] as const;
export type TiempoEspera = (typeof TIEMPOS_ESPERA)[number];

// Pide al backend con qué IAs se puede hablar
export async function listarIas(): Promise<OpcionIa[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${ASISTENTE_API_URL}/ias`, { signal: controller.signal });
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.ias;
  } catch {
    throw new Error('No se pudo cargar la lista de IAs.');
  } finally {
    clearTimeout(timer);
  }
}

// Pregunta al microservicio del asistente. La API key NUNCA está en la app: solo en el backend.
// El backend reconoce en el texto de quién se habla y revisa que exista en la base de datos.
// "ia" es la IA escogida y "espera" cuántos segundos se espera la respuesta antes de rendirse.
export async function preguntar(mensajes: Mensaje[], ia: string, espera: TiempoEspera): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), espera * 1000);

  let res: Response;
  try {
    res = await fetch(`${ASISTENTE_API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensajes, ia, espera }),
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) {
      throw new Error(`⏳ El backend no respondió en ${espera} segundos. Prueba con un tiempo de espera mayor.`);
    }
    throw new Error('No se pudo conectar con el asistente. Revisa que el servicio esté encendido.');
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Error del asistente (${res.status})`);
  return data.respuesta;
}
