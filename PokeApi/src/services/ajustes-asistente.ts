import { db } from '@/services/local-db';

// Se recuerda qué IA y qué tiempo de espera escogió la persona.
// En el teléfono va en la tabla "ajustes" de SQLite; en la web, en localStorage.

export async function leerAjusteAsistente(clave: string): Promise<string | null> {
  if (db) {
    const fila = await db.getFirstAsync<{ valor: string }>('SELECT valor FROM ajustes WHERE clave = ?', [clave]);
    return fila?.valor ?? null;
  }
  try {
    return globalThis.localStorage?.getItem(clave) ?? null;
  } catch {
    return null;
  }
}

export async function guardarAjusteAsistente(clave: string, valor: string) {
  if (db) {
    await db.runAsync('INSERT OR REPLACE INTO ajustes (clave, valor) VALUES (?, ?)', [clave, valor]);
    return;
  }
  try {
    globalThis.localStorage?.setItem(clave, valor);
  } catch {
    // Sin almacenamiento (modo privado): el ajuste dura hasta cerrar la app
  }
}
