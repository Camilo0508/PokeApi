import { POKEAPI_URL, TIMEOUT_MS } from './config.js';

export class PokemonNotFound extends Error {}

// fetch con límite de tiempo: si no hay internet, lanza un error
async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 404) throw new PokemonNotFound(url);
  if (!res.ok) throw new Error(`PokeAPI respondió ${res.status}`);
  return res;
}

export async function fetchPokemon(nameOrId) {
  const data = await (await get(`${POKEAPI_URL}/pokemon/${nameOrId}`)).json();
  return {
    pokemon: {
      id: data.id,
      name: data.name,
      height: data.height,
      weight: data.weight,
      moves: data.moves.map((m) => m.move.name),
      abilities: data.abilities.map((a) => a.ability.name),
      types: data.types.map((t) => t.type.name), // fuego, planta, agua...
    },
    // Tres imágenes del mismo pokémon: gif animado, artwork oficial y sprite clásico
    imageUrls: [
      data.sprites.other.showdown.front_default,
      data.sprites.other['official-artwork'].front_default,
      data.sprites.front_default,
    ],
  };
}

export async function fetchNames(limit, offset) {
  const data = await (await get(`${POKEAPI_URL}/pokemon?limit=${limit}&offset=${offset}`)).json();
  return data.results.map((p) => p.name);
}

export async function fetchImage(url) {
  const res = await get(url);
  return {
    buffer: Buffer.from(await res.arrayBuffer()),
    type: res.headers.get('content-type') ?? 'image/gif',
  };
}
