/**
 * Capa de datos: la única que sabe que esto es PostgreSQL.
 * Si mañana se cambia por Mongo, solo se reescribe este archivo.
 */
import pg from 'pg';

import { DATABASE_URL } from './config.js';

// SSL: en la nube el host tiene punto (…render.com); en local no
function necesitaSsl(url) {
  try {
    const host = new URL(url).hostname;
    return host !== 'localhost' && host !== '127.0.0.1' && host.includes('.');
  } catch {
    return false;
  }
}

export const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: necesitaSsl(DATABASE_URL) ? { rejectUnauthorized: false } : false,
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS docente (
      id          SERIAL PRIMARY KEY,
      nombre      TEXT NOT NULL,
      profesion   TEXT,
      titulo      TEXT,
      universidad TEXT NOT NULL DEFAULT 'Fundación Universitaria Uninpahu',
      facultad    TEXT,
      cargo       TEXT,
      correo      TEXT,
      experiencia INTEGER,
      resumen     TEXT,
      foto        TEXT
    );
  `);
}

const CAMPOS = [
  'nombre',
  'profesion',
  'titulo',
  'universidad',
  'facultad',
  'cargo',
  'correo',
  'experiencia',
  'resumen',
  'foto',
];

export async function insertDocente(docente) {
  const valores = CAMPOS.map((c) => docente[c] ?? null);
  const marcadores = CAMPOS.map((_, i) => `$${i + 1}`).join(', ');

  const { rows } = await pool.query(
    `INSERT INTO docente (${CAMPOS.join(', ')}) VALUES (${marcadores}) RETURNING *`,
    valores
  );
  return rows[0];
}

export async function updateDocente(id, cambios) {
  // Solo se actualizan los campos que llegaron
  const presentes = CAMPOS.filter((c) => cambios[c] !== undefined);
  if (presentes.length === 0) return getDocente(id);

  const asignaciones = presentes.map((c, i) => `${c} = $${i + 2}`).join(', ');
  const { rows } = await pool.query(
    `UPDATE docente SET ${asignaciones} WHERE id = $1 RETURNING *`,
    [id, ...presentes.map((c) => cambios[c])]
  );
  return rows[0] ?? null;
}

export async function getDocente(id) {
  const { rows } = await pool.query('SELECT * FROM docente WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function listDocentes({ buscar, limit, offset }) {
  if (buscar) {
    const { rows } = await pool.query(
      `SELECT * FROM docente
       WHERE nombre ILIKE $1 OR profesion ILIKE $1 OR facultad ILIKE $1
       ORDER BY nombre LIMIT $2 OFFSET $3`,
      [`%${buscar}%`, limit, offset]
    );
    return rows;
  }

  const { rows } = await pool.query('SELECT * FROM docente ORDER BY nombre LIMIT $1 OFFSET $2', [
    limit,
    offset,
  ]);
  return rows;
}

export async function deleteDocente(id) {
  const { rowCount } = await pool.query('DELETE FROM docente WHERE id = $1', [id]);
  return rowCount > 0;
}

export async function countDocentes() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS total FROM docente');
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
