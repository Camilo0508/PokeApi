import { DOCENTES_API_URL } from '@/constants/config';
import { Docente, DocenteListResponse, DocenteResponse } from '@/types/docente';

async function request<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${DOCENTES_API_URL}${path}`);
  } catch {
    throw new Error('No se pudo conectar con el microservicio de docentes.');
  }
  const body = await res.json();
  if (!res.ok) throw new Error(body.detail ?? 'Error en el servidor');
  return body;
}

// Este servicio usa query params y path params, nunca body
export function getDocentes(buscar = '', page = 1, limit = 20) {
  const texto = buscar.trim() ? `&buscar=${encodeURIComponent(buscar.trim())}` : '';
  return request<DocenteListResponse>(`/docentes?limit=${limit}&page=${page}${texto}`);
}

export function getDocente(id: Docente['id']) {
  return request<DocenteResponse>(`/docentes/${id}`);
}

export function getDocentesHealth() {
  return request<{ servicio: string; database: string; saved_docentes: number }>('/health');
}
