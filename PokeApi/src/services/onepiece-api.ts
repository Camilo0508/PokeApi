import { ONEPIECE_API_URL } from '@/constants/config';
import { Character, CharacterListResponse, CharacterResponse } from '@/types/onepiece';

async function request<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${ONEPIECE_API_URL}${path}`);
  } catch {
    throw new Error('No se pudo conectar con el backend de One Piece. ¿Está encendido?');
  }
  const body = await res.json();
  if (!res.ok) throw new Error(body.detail ?? 'Error en el servidor');
  return body;
}

export function getCharacters(page = 1, limit = 20) {
  return request<CharacterListResponse>(`/characters?limit=${limit}&page=${page}`);
}

export function searchCharacters(texto: string, limit = 20) {
  return request<CharacterListResponse>(
    `/characters?q=${encodeURIComponent(texto.trim())}&limit=${limit}`
  );
}

export function getOnePieceHealth() {
  return request<{ internet: boolean; saved_characters: number; database: string }>('/health');
}

export function getCharacter(id: Character['id']) {
  return request<CharacterResponse>(`/characters/${id}`);
}
