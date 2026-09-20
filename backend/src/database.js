import Database from 'better-sqlite3';
import { DB_PATH } from './config.js';

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS pokemon (
    id         INTEGER PRIMARY KEY,
    name       TEXT UNIQUE NOT NULL,
    height     INTEGER NOT NULL,
    weight     INTEGER NOT NULL,
    moves      TEXT,
    image      BLOB,
    image_type TEXT
  )
`);

// moves se guarda como texto JSON y aquí se convierte de nuevo en arreglo
const toPokemon = (row) => row && { ...row, moves: JSON.parse(row.moves ?? '[]') };

export function savePokemon(pokemon, image, imageType) {
  db.prepare(`
    INSERT INTO pokemon (id, name, height, weight, moves, image, image_type)
    VALUES (@id, @name, @height, @weight, @moves, @image, @imageType)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, height = excluded.height, weight = excluded.weight,
      moves = excluded.moves,
      image = COALESCE(excluded.image, pokemon.image),
      image_type = COALESCE(excluded.image_type, pokemon.image_type)
  `).run({ ...pokemon, moves: JSON.stringify(pokemon.moves), image, imageType });
}

export function hasImage(id) {
  return !!db.prepare('SELECT 1 FROM pokemon WHERE id = ? AND image IS NOT NULL').get(id);
}

export function getPokemon(nameOrId) {
  const row = db
    .prepare('SELECT id, name, height, weight, moves FROM pokemon WHERE name = ? OR id = ?')
    .get(nameOrId, nameOrId);
  return toPokemon(row);
}

export function listPokemon(limit, offset) {
  return db
    .prepare('SELECT id, name, height, weight, moves FROM pokemon ORDER BY id LIMIT ? OFFSET ?')
    .all(limit, offset)
    .map(toPokemon);
}

export function getImage(id) {
  return db.prepare('SELECT image, image_type FROM pokemon WHERE id = ? AND image IS NOT NULL').get(id);
}

export function countPokemon() {
  return db.prepare('SELECT COUNT(*) AS total FROM pokemon').get().total;
}
