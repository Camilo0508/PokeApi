import { DOCENTES_API_URL } from '@/constants/config';
import { Docente, DocenteDatos, DocenteListResponse, DocenteResponse } from '@/types/docente';

type Metodo = 'GET' | 'POST' | 'PUT' | 'DELETE';
export class SinConeccionError extends Error{}
async function request<T>(path: string, method: Metodo = 'GET'): Promise<T> {
  const control = new AbortController();
  const espera = setTimeout(() => control.abort(),8000);
  let res: Response;
  try {
    res = await fetch(`${DOCENTES_API_URL}${path}`, { method, signal:control.signal });
  } catch {
    throw new SinConeccionError('No se pudo conectar con el microservicio de docentes.');
  }
  finally{
    clearTimeout(espera)
  }
  if (res.status >= 500) throw new SinConeccionError('El microservicio del los profesores no esta respondiendo');

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



