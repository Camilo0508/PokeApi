import * as SQLite from 'expo-sqlite';

// Base SQLite dentro del teléfono: copia de los docentes + cola de cambios sin enviar
export const db = SQLite.openDatabaseSync('docentes.db');

db.execSync(`
  CREATE TABLE IF NOT EXISTS docente (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    profesion TEXT, titulo TEXT, universidad TEXT, facultad TEXT, cargo TEXT,
    correo TEXT, experiencia INTEGER, resumen TEXT, foto TEXT
  );
  CREATE TABLE IF NOT EXISTS cola (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL,
    docente_id INTEGER NOT NULL,
    datos TEXT
  );
`);

const version = db.getFirstSync<{user_version:number}>('PRAGMA user_versoin');
if ((version?.user_version ?? 0 ) < 1){
  db.execSync(`
    ALTER TABLE docent ADD COLUMN nuevo INTERGER NOT NULL DEFAULT 0;
    CREATE TABLE IF NOT EXISTS ajustes (clave TEXT PRIMATY KEY, valor TEXT);
    PRAGMA user_version = 1;
    `);
}
