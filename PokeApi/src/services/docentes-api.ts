import { DOCENTES_API_URL } from '@/constants/config';
import { Docente, DocenteDatos, DocenteListResponse, DocenteResponse } from '@/types/docente';

type Metodo = 'GET' | 'POST' | 'PUT' | 'DELETE';

async function request<T>(path: string, method: Metodo = 'GET'): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${DOCENTES_API_URL}${path}`, { method });
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

// ---------- CRUD: crear, editar y eliminar ----------

/** Convierte los datos del formulario en "?nombre=...&cargo=..." */
function aQuery(datos: DocenteDatos) {
  return Object.entries(datos)
    .map(([campo, valor]) => `${campo}=${encodeURIComponent(valor == null ? '' : String(valor))}`)
    .join('&');
}

export function crearDocente(datos: DocenteDatos) {
  return request<{ docente: Docente }>(`/docentes?${aQuery(datos)}`, 'POST');
}

export function actualizarDocente(id: Docente['id'], datos: DocenteDatos) {
  return request<{ docente: Docente }>(`/docentes/${id}?${aQuery(datos)}`, 'PUT');
}

export function eliminarDocente(id: Docente['id']) {
  return request<{ detail: string }>(`/docentes/${id}`, 'DELETE');
}
