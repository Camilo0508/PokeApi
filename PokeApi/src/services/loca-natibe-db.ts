import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('docentes.db');
db.execSync(`
    CREATE TABLE  IF NOT EXISTS docentes(
    id INTERGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    profesion TEXT, titulo TEXT, universidad TEXT, facultad TEXT, cargo TEXT,
    correo TEXT, experiencia INTEGER, resumen TEXT, foto TEXT
    );
    CREATE TABLE IF NOT EXISTS cola(
    seq INTERGER PRIMARY KEY AUTOINCRMENT,
    tipo TEXT NOT NULL,
    docente_id INTERGER NOT NULL, 
    datos TEXT);
    `);