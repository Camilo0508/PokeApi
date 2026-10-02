/**
 * Base de datos RELACIONAL (PostgreSQL).
 *
 * Cuatro tablas relacionadas por llaves foráneas:
 *   pokemon  1 ──< pokemon_move
 *            1 ──< pokemon_ability
 *            1 ──< pokemon_image
 */
import pg from 'pg';

import { DATABASE_URL } from './config.js';

// En Neon/Render la conexión es por SSL; en local (Docker) no
const enLaNube = !DATABASE_URL.includes('localhost');

export const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: enLaNube ? { rejectUnauthorized: false } : false,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pokemon (
      id     INTEGER PRIMARY KEY,
      name   TEXT UNIQUE NOT NULL,
      height INTEGER NOT NULL,
      weight INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pokemon_move (
      pokemon_id INTEGER NOT NULL REFERENCES pokemon(id) ON DELETE CASCADE,
      posicion   INTEGER NOT NULL,
      name       TEXT NOT NULL,
      PRIMARY KEY (pokemon_id, posicion)
    );

    CREATE TABLE IF NOT EXISTS pokemon_ability (
      pokemon_id INTEGER NOT NULL REFERENCES pokemon(id) ON DELETE CASCADE,
      posicion   INTEGER NOT NULL,
      name       TEXT NOT NULL,
      PRIMARY KEY (pokemon_id, posicion)
    );

    CREATE TABLE IF NOT EXISTS pokemon_image (
      pokemon_id INTEGER NOT NULL REFERENCES pokemon(id) ON DELETE CASCADE,
      posicion   INTEGER NOT NULL,
      image      BYTEA NOT NULL,
      image_type TEXT NOT NULL,
      PRIMARY KEY (pokemon_id, posicion)
    );
  `);
}

export async function savePokemon(pokemon) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN'); // o se guarda todo, o no se guarda nada

    await cliente.query(
      `INSERT INTO pokemon (id, name, height, weight) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name,
         height = EXCLUDED.height, weight = EXCLUDED.weight`,
      [pokemon.id, pokemon.name, pokemon.height, pokemon.weight]
    );

    // Se reemplazan los movimientos y habilidades del pokémon
    await cliente.query('DELETE FROM pokemon_move WHERE pokemon_id = $1', [pokemon.id]);
    for (const [posicion, name] of pokemon.moves.entries()) {
      await cliente.query(
        'INSERT INTO pokemon_move (pokemon_id, posicion, name) VALUES ($1, $2, $3)',
        [pokemon.id, posicion, name]
      );
    }

    await cliente.query('DELETE FROM pokemon_ability WHERE pokemon_id = $1', [pokemon.id]);
    for (const [posicion, name] of pokemon.abilities.entries()) {
      await cliente.query(
        'INSERT INTO pokemon_ability (pokemon_id, posicion, name) VALUES ($1, $2, $3)',
        [pokemon.id, posicion, name]
      );
    }

    await cliente.query('COMMIT');
  } catch (error) {
    await cliente.query('ROLLBACK');
    throw error;
  } finally {
    cliente.release();
  }
}

export async function saveImage(pokemonId, posicion, image, imageType) {
  await pool.query(
    `INSERT INTO pokemon_image (pokemon_id, posicion, image, image_type) VALUES ($1, $2, $3, $4)
     ON CONFLICT (pokemon_id, posicion) DO UPDATE SET
       image = EXCLUDED.image, image_type = EXCLUDED.image_type`,
    [pokemonId, posicion, image, imageType]
  );
}

export async function imagePositions(pokemonId) {
  const { rows } = await pool.query(
    'SELECT posicion FROM pokemon_image WHERE pokemon_id = $1 ORDER BY posicion',
    [pokemonId]
  );
  return rows.map((r) => r.posicion);
}

// Trae el pokémon con sus movimientos y habilidades en un solo SELECT (con JOIN)
const CONSULTA = `
  SELECT p.id, p.name, p.height, p.weight,
    COALESCE((SELECT array_agg(m.name ORDER BY m.posicion)
              FROM pokemon_move m WHERE m.pokemon_id = p.id), '{}') AS moves,
    COALESCE((SELECT array_agg(a.name ORDER BY a.posicion)
              FROM pokemon_ability a WHERE a.pokemon_id = p.id), '{}') AS abilities
  FROM pokemon p
`;

export async function getPokemon(nameOrId) {
  const numero = Number(nameOrId);
  const { rows } = await pool.query(
    `${CONSULTA} WHERE p.name = $1 OR p.id = $2 LIMIT 1`,
    [String(nameOrId), Number.isInteger(numero) ? numero : -1]
  );
  return rows[0] ?? null;
}

export async function listPokemon(limit, offset) {
  const { rows } = await pool.query(`${CONSULTA} ORDER BY p.id LIMIT $1 OFFSET $2`, [limit, offset]);
  return rows;
}

export async function getImage(pokemonId, posicion) {
  const { rows } = await pool.query(
    'SELECT image, image_type FROM pokemon_image WHERE pokemon_id = $1 AND posicion = $2',
    [pokemonId, posicion]
  );
  return rows[0] ?? null;
}

export async function countPokemon() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM pokemon');
  return rows[0].total;
}

export async function ping() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
