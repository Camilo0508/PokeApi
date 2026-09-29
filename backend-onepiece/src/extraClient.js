/**
 * Segunda fuente de datos: api-onepiece.com.
 * De aquí salen la tripulación, la fruta del diablo, el trabajo y los hakis,
 * que la API principal (onepieceapi.com) no tiene.
 * Los dos catálogos se cruzan por el nombre del personaje.
 */
import { EXTRA_URL, TIMEOUT_MS } from './config.js';

// "Monkey D. Luffy" y "Monkey D Luffy" deben quedar iguales para poder cruzarlos
export function clave(nombre) {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // quita puntos, espacios y guiones
}

async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`api-onepiece respondió ${res.status}`);
  return res.json();
}

let catalogo = null; // se descarga una sola vez mientras el servidor esté encendido

export async function getCatalogo() {
  if (catalogo) return catalogo;

  const personajes = await get(`${EXTRA_URL}/characters/en`);
  catalogo = new Map();
  for (const p of personajes) {
    catalogo.set(clave(p.name), {
      extra_id: p.id,
      crew: p.crew?.name ?? null,
      fruit: p.fruit?.name ?? null,
      fruit_type: p.fruit?.type ?? null,
      job: p.job ?? null,
    });
  }
  return catalogo;
}

export async function fetchHakis(extraId) {
  const data = await get(`${EXTRA_URL}/hakis/en/character/${extraId}`);
  return data.map((h) => ({ name: h.haki.name, awaken: !!h.haki.awaken }));
}
