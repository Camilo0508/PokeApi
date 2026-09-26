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
    abilities  TEXT,
    image      BLOB,
    image_type TEXT
  )
`);
const columnas = db.prepare('PRAGMA table_info(pokemon)').all().map((c) => c.name);
if (!columnas.includes('abilities')) {
  db.exec('ALTER TABLE pokemon ADD COLUMN abilities TEXT');
}

// Cada pokémon tiene varias imágenes: posicion 0 = gif, 1 = artwork, 2 = sprite
db.exec(`
  CREATE TABLE IF NOT EXISTS pokemon_image (
    pokemon_id INTEGER NOT NULL,
    posicion   INTEGER NOT NULL,
    image      BLOB NOT NULL,
    image_type TEXT NOT NULL,
    PRIMARY KEY (pokemon_id, posicion)
  )
`);

// moves se guarda como texto JSON y aquí se convierte de nuevo en arreglo
const toPokemon = (row) =>
  row &&
{ ...row, moves: JSON.parse(row.moves ?? '[]'), abilities: JSON.parse(row.abilities ?? '[]') };

export function savePokemon(pokemon) {
  db.prepare(`
    INSERT INTO pokemon (id, name, height, weight, moves, abilities)
    VALUES (@id, @name, @height, @weight, @moves, @abilities)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, height = excluded.height, weight = excluded.weight,
      moves = excluded.moves,
      abilities = excluded.abilities
  `).run({ ...pokemon, moves: JSON.stringify(pokemon.moves), abilities: JSON.stringify(pokemon.abilities) });
}

export function saveImage(pokemonId, posicion, image, imageType) {
  db.prepare(`
    INSERT INTO pokemon_image (pokemon_id, posicion, image, image_type)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(pokemon_id, posicion) DO UPDATE SET
      image = excluded.image, image_type = excluded.image_type
  `).run(pokemonId, posicion, image, imageType);
}

// Posiciones de las imágenes ya guardadas, por ejemplo [0, 1, 2]
export function imagePositions(pokemonId) {
  return db
    .prepare('SELECT posicion FROM pokemon_image WHERE pokemon_id = ? ORDER BY posicion')
    .all(pokemonId)
    .map((row) => row.posicion);
}

export function getPokemon(nameOrId) {
  const row = db
    .prepare('SELECT id, name, height, weight, moves, abilities FROM pokemon WHERE name = ? OR id = ?')
    .get(nameOrId, nameOrId);
  return toPokemon(row);
}

export function listPokemon(limit, offset) {
  return db
    .prepare('SELECT id, name, height, weight, moves, abilities FROM pokemon ORDER BY id LIMIT ? OFFSET ?')
    .all(limit, offset)
    .map(toPokemon);
}

export function getImage(pokemonId, posicion) {
  return db
    .prepare('SELECT image, image_type FROM pokemon_image WHERE pokemon_id = ? AND posicion = ?')
    .get(pokemonId, posicion);
}

export function countPokemon() {
  return db.prepare('SELECT COUNT(*) AS total FROM pokemon').get().total;
}
