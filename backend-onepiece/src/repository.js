/**
 * Repositorio: decide de dónde salen los datos.
 *   1. Intenta la API de One Piece y guarda el resultado en SQLite.
 *   2. Si no hay internet, lee de SQLite.
 */
import * as db from './database.js';
import { clave, fetchHakis, getCatalogo } from './extraClient.js';
import {
  CharacterNotFound,
  fetchCharacter,
  fetchImage,
  fetchPage,
  fetchSearch,
} from './onepieceClient.js';

// Completa el personaje con los datos de la segunda API (tripulación, fruta, trabajo, haki)
async function agregarExtras(personaje) {
  if (db.tieneExtras(personaje.id)) return personaje;

  try {
    const catalogo = await getCatalogo();
    const extra = catalogo.get(clave(personaje.name));
    if (!extra) return { ...personaje, haki: [] }; // no está en la otra API

    let haki = [];
    try {
      haki = await fetchHakis(extra.extra_id);
    } catch {
      // si falla solo el haki, se guardan igual los demás datos
    }

    return { ...personaje, crew: extra.crew, fruit: extra.fruit, fruit_type: extra.fruit_type, job: extra.job, haki };
  } catch {
    return personaje; // sin internet para la segunda API
  }
}

async function guardar({ personaje, imageUrl }) {
  const completo = await agregarExtras(personaje);
  db.saveCharacter(completo);

  if (imageUrl && !db.hasImage(personaje.id)) {
    try {
      const { buffer, type } = await fetchImage(imageUrl);
      db.saveImage(personaje.id, buffer, type);
    } catch {
      // sin imagen no es grave, los datos quedan guardados igual
    }
  }

  return db.getCharacter(personaje.id) ?? completo;
}

export async function listCharacters(limit, page) {
  try {
    const encontrados = await fetchPage(limit, page);
    const results = await Promise.all(encontrados.map(guardar));
    return { results, source: 'api' };
  } catch {
    return { results: db.listCharacters(limit, (page - 1) * limit), source: 'local' };
  }
}

export async function searchCharacters(texto, limit) {
  try {
    const encontrados = await fetchSearch(texto, limit);
    const results = await Promise.all(encontrados.map(guardar));
    return { results, source: 'api' };
  } catch {
    return { results: db.searchCharacters(texto, limit), source: 'local' };
  }
}

export async function getCharacter(id) {
  try {
    return { character: await guardar(await fetchCharacter(id)), source: 'api' };
  } catch (err) {
    if (err instanceof CharacterNotFound) return { character: null, source: 'api' };
    return { character: db.getCharacter(id) ?? null, source: 'local' };
  }
}

export async function hasInternet() {
  try {
    await fetch('https://www.onepieceapi.com', { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return true;
  } catch {
    return false;
  }
}
