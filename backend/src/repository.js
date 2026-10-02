/**
 * Repositorio: decide de dónde salen los datos.
 *
 * La base de datos (PostgreSQL) es la fuente principal:
 *   1. Se responde con lo que hay guardado.
 *   2. Si no hay nada guardado y hay internet, se trae de la PokeAPI y se guarda.
 *
 * La carga inicial se hace desde la consola con:  npm run seed
 */
import * as db from './database.js';
import { fetchImage, fetchNames, fetchPokemon, PokemonNotFound } from './pokeapiClient.js';

export async function guardar(nameOrId) {
  const { pokemon, imageUrls } = await fetchPokemon(nameOrId);
  await db.savePokemon(pokemon);

  // Se descarga cada imagen que falte y se guarda con su posición
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

// Descarga una página de la PokeAPI y la guarda. Lo usa el comando seed.
export async function descargarPagina(limit, offset) {
  const names = await fetchNames(limit, offset);
  const resultados = [];
  for (const name of names) {
    resultados.push(await guardar(name)); // de a uno, para no saturar la PokeAPI
  }
  return resultados;
}

export async function listPokemon(limit, offset) {
  const guardados = await db.listPokemon(limit, offset);
  if (guardados.length > 0) return { results: guardados, source: 'local' };

  try {
    return { results: await descargarPagina(limit, offset), source: 'api' };
  } catch {
    return { results: [], source: 'local' };
  }
}

export async function getPokemon(nameOrId) {
  const texto = nameOrId.trim().toLowerCase();

  const guardado = await db.getPokemon(texto);
  if (guardado) return { pokemon: guardado, source: 'local' };

  try {
    return { pokemon: await guardar(texto), source: 'api' };
  } catch (err) {
    if (err instanceof PokemonNotFound) return { pokemon: null, source: 'api' };
    return { pokemon: null, source: 'local' };
  }
}

export async function hasInternet() {
  try {
    await fetch('https://pokeapi.co', { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return true;
  } catch {
    return false;
  }
}
