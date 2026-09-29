import { ONEPIECE_URL, TIMEOUT_MS } from './config.js';

export class CharacterNotFound extends Error {}

async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 404) throw new CharacterNotFound(url);
  if (!res.ok) throw new Error(`La API de One Piece respondió ${res.status}`);
  return res;
}

// Del JSON de la API nos quedamos solo con lo que muestra la app
function extraer(data, orden = null) {
  const activa = data.bounties?.find((b) => b.is_active) ?? data.bounties?.[0];
  return {
    personaje: {
      id: data.id,
      name: data.name?.en ?? 'Sin nombre',
      japones: data.name?.jp ?? null,
      age: data.age ?? null,
      height: data.height ?? null,
      status: data.status ?? null,
      blood_type: data.blood_type ?? null,
      birthday: data.birthday?.label?.en ?? null,
      bounty: activa?.amount ?? null,
      orden,
    },
    imageUrl: data.image_url ?? null,
  };
}

// La API pagina con ?limit=&page= (el offset lo ignora) y el máximo es 100
export async function fetchPage(limit, page) {
  const res = await get(`${ONEPIECE_URL}?limit=${limit}&page=${page}`);
  const data = await res.json();
  return data.map((personaje, i) => extraer(personaje, (page - 1) * limit + i));
}

export async function fetchSearch(texto, limit) {
  const res = await get(`${ONEPIECE_URL}?q=${encodeURIComponent(texto)}&limit=${limit}`);
  const data = await res.json();
  return data.map((personaje) => extraer(personaje));
}

export async function fetchCharacter(id) {
  const res = await get(`${ONEPIECE_URL}/${id}`);
  return extraer(await res.json());
}

export async function fetchImage(url) {
  const res = await get(url);
  return {
    buffer: Buffer.from(await res.arrayBuffer()),
    type: res.headers.get('content-type') ?? 'image/webp',
  };
}
