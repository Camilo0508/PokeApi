import * as api from '@/services/docentes-api';
import {SinConeccionError} from '@/services/docentes-api';
import {db} from '@/services/local-db';
import { Docente, DocenteDatos, DocenteListResponse, DocenteResponse } from '@/types/docente';

export { getDocentesHealth } from '@/services/docentes-api';

type Tipo = 'crear' | 'actualizar' | 'eliminar';
interface Operacion { seq: number; tipo: Tipo; docente_id: number; datos: string | null }

const CAMPOS = ['nombre', 'profesion', 'titulo', 'universidad', 'facultad',
  'cargo', 'correo', 'experiencia', 'resumen', 'foto'] as const;

  //Copia local

  async function guardarEnCache(d: Docente) {
  await db!.runAsync(
    `INSERT OR REPLACE INTO docente (id, ${CAMPOS.join(', ')}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [d.id, ...CAMPOS.map((c) => d[c])]
  );
}

async function idsPendientes() {
  const filas = await db!.getAllAsync<{ docente_id: number }>('SELECT DISTINCT docente_id FROM cola');
  return new Set(filas.map((f) => f.docente_id));
}

async function encolar(tipo: Tipo, id: number, datos?: DocenteDatos) {
  await db!.runAsync('INSERT INTO cola (tipo, docente_id, datos) VALUES (?, ?, ?)',
    [tipo, id, datos ? JSON.stringify(datos) : null]);
}

export async function contarPendientes() {
  if (!db) return 0;
  const fila = await db.getFirstAsync<{ total: number }>('SELECT COUNT(*) AS total FROM cola');
  return fila?.total ?? 0;
}

// ---------- Sincronización ----------

let enCurso: Promise<boolean> | null = null;

/** Envía la cola al microservicio, en orden. Devuelve true si quedó vacía */
export function sincronizar(): Promise<boolean> {
  if (!db) return Promise.resolve(true);
  enCurso ??= enviarCola().finally(() => { enCurso = null; }); // nunca dos a la vez
  return enCurso;
}

async function enviarCola(): Promise<boolean> {
  const cola = await db!.getAllAsync<Operacion>('SELECT * FROM cola ORDER BY seq');
  for (const op of cola) {
    try {
      if (op.tipo === 'crear') {
        const { docente } = await api.crearDocente(JSON.parse(op.datos!));
        // El id temporal (negativo) se cambia por el real que dio el servidor
        await db!.withTransactionAsync(async () => {
          await db!.runAsync('UPDATE docente SET id = ? WHERE id = ?', [docente.id, op.docente_id]);
          await db!.runAsync('UPDATE cola SET docente_id = ? WHERE docente_id = ?', [docente.id, op.docente_id]);
        });
      } else if (op.tipo === 'actualizar') {
        await api.actualizarDocente(op.docente_id, JSON.parse(op.datos!));
      } else {
        await api.eliminarDocente(op.docente_id);
      }
    } catch (e) {
      if (e instanceof SinConeccionError) return false; 
      console.warn(`Cambio descartado (${op.tipo} ${op.docente_id}):`, (e as Error).message);
      if (op.tipo === 'crear') {
        await db!.runAsync('DELETE FROM docente WHERE id = ?', [op.docente_id]);
        await db!.runAsync('DELETE FROM cola WHERE docente_id = ?', [op.docente_id]);
      }
    }
    await db!.runAsync('DELETE FROM cola WHERE seq = ?', [op.seq]);
  }
  return true;
}

// ---------- Lectura ----------

export async function getDocentes(buscar = ''): Promise<DocenteListResponse> {
  if (!db) return api.getDocentes(buscar);
  const texto = buscar.trim();
  let source = 'servidor';
  try {
    await sincronizar();
    const { results } = await api.getDocentes(texto, 1, 100);
    const pendientes = await idsPendientes();
    await db.withTransactionAsync(async () => {
        // Sin búsqueda llega la lista completa: lo que ya no está en el servidor se borra, menos lo que tiene cambios sin enviar
      if (!texto) await db!.runAsync('DELETE FROM docente WHERE id NOT IN (SELECT docente_id FROM cola)');
      for (const d of results) if (!pendientes.has(d.id)) await guardarEnCache(d);
    });
  } catch (e) {
    if (!(e instanceof SinConeccionError)) throw e;
    source = 'teléfono (sin conexión)';
  }
  // Siempre se muestra lo del teléfono: así se ven también los cambios pendientes
  const like = `%${texto}%`;
  const results = await db.getAllAsync<Docente>(
    `SELECT * FROM docente WHERE nombre LIKE ? OR profesion LIKE ? OR facultad LIKE ?
     ORDER BY nombre LIMIT 100`, [like, like, like]);
  return { source, results };
}

export async function getDocente(id: Docente['id']): Promise<DocenteResponse> {
  if (!db) return api.getDocente(id);
  // Si tiene cambios sin enviar, la versión buena es la del teléfono
  if (id > 0 && !(await idsPendientes()).has(id)) {
    try {
      const data = await api.getDocente(id);
      await guardarEnCache(data.docente);
      return data;
    } catch (e) {
      if (!(e instanceof SinConeccionError)) throw e;
    }
  }
  const docente = await db.getFirstAsync<Docente>('SELECT * FROM docente WHERE id = ?', [id]);
  if (!docente) throw new Error('Este docente no está guardado en el teléfono');
  return { source: 'teléfono', docente };
}

// ---------- Escritura ----------
// Si no hay conexión: se guarda en el teléfono y se encola.

export async function crearDocente(datos: DocenteDatos) {
  if (!db) return api.crearDocente(datos);
  if (await sincronizar()) {
    try {
      const data = await api.crearDocente(datos);
      await guardarEnCache(data.docente);
      return data;
    } catch (e) {
      if (!(e instanceof SinConeccionError)) throw e;
    }
  }
  const docente: Docente = { id: -Date.now(), ...datos }; // id temporal
  await guardarEnCache(docente);
  await encolar('crear', docente.id, datos);
  return { docente };
}

export async function actualizarDocente(id: Docente['id'], datos: DocenteDatos) {
  if (!db) return api.actualizarDocente(id, datos);
  if (id > 0 && (await sincronizar())) {
    try {
      const data = await api.actualizarDocente(id, datos);
      await guardarEnCache(data.docente);
      return data;
    } catch (e) {
      if (!(e instanceof SinConeccionError)) throw e;
    }
  }
  const docente: Docente = { id, ...datos };
  await guardarEnCache(docente);
  await encolar('actualizar', id, datos);
  return { docente };
}

export async function eliminarDocente(id: Docente['id']) {
  if (!db) return api.eliminarDocente(id);
  if (id < 0) {
    // Nunca llegó al servidor: basta con olvidarlo
    await db.runAsync('DELETE FROM cola WHERE docente_id = ?', [id]);
    await db.runAsync('DELETE FROM docente WHERE id = ?', [id]);
    return { detail: 'Docente eliminado' };
  }
  if (await sincronizar()) {
    try {
      const data = await api.eliminarDocente(id);
      await db.runAsync('DELETE FROM docente WHERE id = ?', [id]);
      return data;
    } catch (e) {
      if (!(e instanceof SinConeccionError)) throw e;
    }
  }
  await db.runAsync('DELETE FROM docente WHERE id = ?', [id]);
  await encolar('eliminar', id);
  return { detail: 'Eliminado en el teléfono; se enviará cuando haya conexión' };
}