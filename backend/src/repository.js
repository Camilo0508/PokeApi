/**
 * Repositorio: los datos salen ÚNICAMENTE de PostgreSQL.
 *
 * El servicio NO consulta la PokeAPI por su cuenta. Si un pokémon no está
 * guardado, se responde que no está en la base de datos.
 *
 * Los datos se cargan a propósito, con el comando:  npm run seed
 * (o insertándolos a mano en la base).
 */
import * as db from './database.js';
import { fetchImage, fetchNames, fetchPokemon } from './pokeapiClient.js';

// ---------- Consultas: solo base de datos ----------

export async function listPokemon(limit, offset) {
  return { results: await db.listPokemon(limit, offset), source: 'local' };
}

export async function getPokemon(nameOrId) {
  const pokemon = await db.getPokemon(nameOrId.trim().toLowerCase());
  return { pokemon, source: 'local' };
}

// ---------- Carga manual: solo la usa el comando seed ----------

export async function guardar(nameOrId) {
  const { pokemon, imageUrls } = await fetchPokemon(nameOrId);
  await db.savePokemon(pokemon);

  const guardadas = await db.imagePositions(pokemon.id);
  await Promise.all(
    imageUrls.map(async (url, posicion) => {
      if (!url || guardadas.includes(posicion)) return;
      try {
        const { buffer, type } = await fetchImage(url);
        await db.saveImage(pokemon.id, posicion, buffer, type);
      } catch {
        // sin imagen no es grave, los datos quedan guardados igual
      }
    })
  );

  return (await db.getPokemon(String(pokemon.id))) ?? pokemon;
}

// Queda disponible por si se necesita, pero ya no se usa en las consultas
export async function hasInternet() {
  try {
    await fetch('https://pokeapi.co', { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return true;
  } catch {
    return false;
  }
}

export async function descargarPagina(limit, offset) {
  const names = await fetchNames(limit, offset);
  const resultados = [];
  for (const name of names) {
    resultados.push(await guardar(name)); // de a uno, para no saturar la PokeAPI
  }
  return resultados;
}
