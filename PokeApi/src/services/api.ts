import { API_URL } from '@/constants/config';
import { HealthResponse, PokemonListResponse, PokemonResponse } from '@/types/pokemon';

async function request<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`);
  } catch {
    throw new Error('No se pudo conectar con el backend. ¿Está encendido?');
  }
  const body = await res.json();
  if (!res.ok) throw new Error(body.detail ?? 'Error en el servidor');
  return body;
}

export function getPokemonList(offset = 0, limit = 20) {
  return request<PokemonListResponse>(`/pokemon?limit=${limit}&offset=${offset}`);
}

export function getPokemon(name: string) {
  return request<PokemonResponse>(`/pokemon/${encodeURIComponent(name.trim().toLowerCase())}`);
}

export function getHealth() {
  return request<HealthResponse>('/health');
}
