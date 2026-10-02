/**
 * Carga pokémon en PostgreSQL desde la consola.
 *
 *   npm run seed                  carga 10
 *   npm run seed -- --limit 25    carga 25
 *   npm run seed -- --offset 10   carga los 10 siguientes
 */
import { initDb, countPokemon, pool } from './database.js';
import { descargarPagina } from './repository.js';

function argumento(nombre, porDefecto) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i === -1 ? porDefecto : Number(process.argv[i + 1]);
}

const limit = argumento('limit', 10);
const offset = argumento('offset', 0);

await initDb();
console.log(`Descargando ${limit} pokémon (desde el ${offset})...`);

const pokemons = await descargarPagina(limit, offset);
for (const p of pokemons) console.log(`  ✓ #${p.id} ${p.name}`);

console.log(`\nListo. En la base hay ${await countPokemon()} pokémon.`);
await pool.end();
