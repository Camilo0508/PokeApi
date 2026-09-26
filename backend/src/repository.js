import * as db from './database.js';
import { fetchImage, fetchNames, fetchPokemon, PokemonNotFound } from './pokeapiClient.js';

async function downloadAndSave(nameOrId) {
  const { pokemon, imageUrls } = await fetchPokemon(nameOrId);
  db.savePokemon(pokemon);

  // Se descarga cada imagen que falte y se guarda en la base con su posición
  const guardadas = db.imagePositions(pokemon.id);
  await Promise.all(
    imageUrls.map(async (url, posicion) => {
      if (!url || guardadas.includes(posicion)) return;
      try {
        const { buffer, type } = await fetchImage(url);
        db.saveImage(pokemon.id, posicion, buffer, type);
      } catch {
        // sin imagen no es grave, se guardan igual los datos
      }
    })
  );

  return pokemon;
}

export async function getPokemon(nameOrId) {
  nameOrId = nameOrId.trim().toLowerCase();
  try {
    return { pokemon: await downloadAndSave(nameOrId), source: 'api' };
  } catch (err) {
    if (err instanceof PokemonNotFound) return { pokemon: null, source: 'api' };
    return { pokemon: db.getPokemon(nameOrId), source: 'local' }; // sin internet
  }
}

export async function listPokemon(limit, offset) {
  try {
    const names = await fetchNames(limit, offset);
    const results = await Promise.all(names.map(downloadAndSave));
    return { results, source: 'api' };
  } catch {
    return { results: db.listPokemon(limit, offset), source: 'local' }; // sin internet
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
