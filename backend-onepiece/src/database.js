import Database from 'better-sqlite3';
import { DB_PATH } from './config.js';

const db = new Database(DB_PATH);

// Base local: es el respaldo cuando no hay internet
db.exec(`
  CREATE TABLE IF NOT EXISTS character (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    japones    TEXT,
    age        INTEGER,
    height     INTEGER,
    status     TEXT,
    blood_type TEXT,
    birthday   TEXT,
    bounty     INTEGER,
    crew       TEXT,
    fruit      TEXT,
    fruit_type TEXT,
    job        TEXT,
    haki       TEXT,
    orden      INTEGER,
    image      BLOB,
    image_type TEXT
  )
`);

// Si la tabla ya existía sin las columnas nuevas, se agregan sin borrar datos
const columnas = db.prepare('PRAGMA table_info(character)').all().map((c) => c.name);
for (const nueva of ['crew', 'fruit', 'fruit_type', 'job', 'haki']) {
  if (!columnas.includes(nueva)) db.exec(`ALTER TABLE character ADD COLUMN ${nueva} TEXT`);
}

// Los hakis se guardan como texto JSON y aquí vuelven a ser un arreglo
const toCharacter = (row) => row && { ...row, haki: JSON.parse(row.haki ?? '[]') };

export function saveCharacter(personaje) {
  db.prepare(`
    INSERT INTO character (id, name, japones, age, height, status, blood_type, birthday, bounty,
                           crew, fruit, fruit_type, job, haki, orden)
    VALUES (@id, @name, @japones, @age, @height, @status, @blood_type, @birthday, @bounty,
            @crew, @fruit, @fruit_type, @job, @haki, @orden)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name, japones = excluded.japones, age = excluded.age,
      height = excluded.height, status = excluded.status, blood_type = excluded.blood_type,
      birthday = excluded.birthday, bounty = excluded.bounty,
      crew = COALESCE(excluded.crew, character.crew),
      fruit = COALESCE(excluded.fruit, character.fruit),
      fruit_type = COALESCE(excluded.fruit_type, character.fruit_type),
      job = COALESCE(excluded.job, character.job),
      haki = COALESCE(excluded.haki, character.haki),
      orden = COALESCE(excluded.orden, character.orden)
  `).run({
    crew: null, fruit: null, fruit_type: null, job: null, orden: null, // valores por defecto
    ...personaje,
    haki: personaje.haki ? JSON.stringify(personaje.haki) : null,
  });
}

export function saveImage(id, image, imageType) {
  db.prepare('UPDATE character SET image = ?, image_type = ? WHERE id = ?').run(image, imageType, id);
}

// ¿ya tiene los datos de la segunda API? Así no se piden dos veces
export function tieneExtras(id) {
  return !!db.prepare('SELECT 1 FROM character WHERE id = ? AND haki IS NOT NULL').get(id);
}

export function hasImage(id) {
  return !!db.prepare('SELECT 1 FROM character WHERE id = ? AND image IS NOT NULL').get(id);
}

const COLUMNAS =
  'id, name, japones, age, height, status, blood_type, birthday, bounty, crew, fruit, fruit_type, job, haki';

export function getCharacter(id) {
  return toCharacter(db.prepare(`SELECT ${COLUMNAS} FROM character WHERE id = ?`).get(id));
}

export function listCharacters(limit, offset) {
  return db
    .prepare(`SELECT ${COLUMNAS} FROM character ORDER BY orden IS NULL, orden, name LIMIT ? OFFSET ?`)
    .all(limit, offset)
    .map(toCharacter);
}

// Búsqueda por nombre dentro de la base local (para cuando no hay internet)
export function searchCharacters(texto, limit) {
  return db
    .prepare(`SELECT ${COLUMNAS} FROM character WHERE name LIKE ? ORDER BY orden IS NULL, orden, name LIMIT ?`)
    .all(`%${texto}%`, limit)
    .map(toCharacter);
}

export function getImage(id) {
  return db.prepare('SELECT image, image_type FROM character WHERE id = ? AND image IS NOT NULL').get(id);
}

export function countCharacters() {
  return db.prepare('SELECT COUNT(*) AS total FROM character').get().total;
}
