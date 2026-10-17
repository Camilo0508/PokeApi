import * as api from '@/services/docentes-api';
import {SinConeccionError} from '@/services/docentes-api';
import {db} from '@/services/local-db';
import {Docente, DocenteDatos, DocenteListResponse, DocenteResponse} from '@/types/docente';

export {getDocentesHealth} from '@/services/docentes-api';
type Tipo = 'crear' | 'actualizar' | 'eliminar';
interface Operacion {seq:number; tipo: Tipo; docente_id:number; datos:string|null}

const CAMPOS = ['nombre', 'profesion', 'titulo', 'universidad', 'facultad',
    'cargo', 'correo', 'experiencia', 'resumen', 'foto'] as const;

//Copia local

//insertar o actualizar un docente en sqlite, nuevo solo se utiliza insertaral actualizar se respeta la bandera que ya se tenia 
async function guardarEnCache(d: Docente, nuevo = 0) {
  await db!.runAsync(
    `INSERT INTO docente (id, ${CAMPOS.join(', ')}, nuevo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET ${CAMPOS.map((c) => `${c} = excluded.${c}`).join(', ')}`,
    [d.id, ...CAMPOS.map((c) => d[c]), nuevo]
  );
}

async function idsPendientes(){
    const filas = await db!.getAllAsync<{docente_id: number}>(`SELECT DISTINCT docente_id FROM cola`);
    return new Set(filas.map((f) => f.docente_id));
}

async function encolar(tipo: Tipo, id:number, datos?: DocenteDatos){
    await db!.runAsync('insert into cola (tipo, docente_id, datos) values (?,?,?)', [tipo, id, datos? JSON.stringify(datos): null]);
}

export async function contarPendientes(){
    if (!db) return 0;
    const fila = await db.getFirstAsync<{total:number}>('select count(*) as total from cola');
    return fila?.total ?? 0;
}
//docentes que llegaron de la nube y el usuario no los a visto

export async function contarNuevos(){
    if (!db) return 0;
    const fila = await db.getFirstAsync<{total:number}>('select count(*) as total from docente where nuevo = 1')
    return fila?.total ?? 0;
}

// sequita la bandera nuevo de un docente de todos si no se pasa id 

export async function  marcarVisto(id?:number){
    if (!db) return 0;
    if (id == null) await db.runAsync('update docente set nuevo = 0');
    else await db.runAsync('update docente set nuevo = 0 where id = ?'[id]);
}

//Ajuste 
export async function leerAjuste(clave: string){
    if (!db) return null;
    const fila = await db.getFirstAsync<{valor: string}>(`select valor from ajustes where clave = ? `,[clave]);
    return fila?.valor ?? null;
}

export async function guardarAjuste(clave:string, valor: string){
    if (!db) return;
    await db.runAsync('insert or replace into ajustes (clave, valor) values (?,?)' ,[clave,valor]);
}

//Posibles conflictos

const limpio = (texto:string | null) => (texto ?? '').trim().toLowerCase();

function mismoDocente(a: DocenteDatos, b:DocenteDatos){
    if (a.correo && b.correo) return limpio(a.correo) === limpio(b.correo);
    return limpio (a.nombre) === limpio(b.nombre);
}

async function buscarEnNube(datos: DocenteDatos){
    const {results} = await api.getDocentes('',1,100);
    return results.find((d) => mismoDocente(d,datos)) ?? null;
}

//saber cunatos docentes repetido se unieron al sincronizar
let fusionados = 0;
export function tomarFusionados(){
    const total = fusionados;
    fusionados = 0;
    return total;
}
//subir la cola telelefono nube

let enCurso: Promise<boolean> | null = null;
// Enviar en orden
export function sincronizar(): Promise <boolean>{
    if(!db) return Promise.resolve(true);
    enCurso ??= enviarCola().finally(() => {enCurso = null;});
    return enCurso;
}
//sincronizar datos
async function enviarCola(): Promise<boolean> {
  const cola = await db!.getAllAsync<Operacion>('SELECT * FROM cola ORDER BY seq');
  for (const op of cola) {
    try {
      if (op.tipo === 'crear') {
        const datos: DocenteDatos = JSON.parse(op.datos!);
        //si la nube gana no se crae uno nuevamente
        const repetido = await buscarEnNube(datos);
        const docente = repetido ?? (await api.crearDocente(datos)).docente;
        await db!.withTransactionAsync(async () => {
// Se quita la copia con id temporal (negativo) y se guarda la de la nube con su id real
          await db!.runAsync('DELETE FROM docente WHERE id = ?', [op.docente_id]);
          await guardarEnCache(docente);
          await db!.runAsync('UPDATE docente SET nuevo = 0 WHERE id = ?', [docente.id]); // lo creó el usuario
          await db!.runAsync('UPDATE cola SET docente_id = ? WHERE docente_id = ?', [docente.id, op.docente_id]);
        });
        if (repetido) fusionados++;
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
    await db!.runAsync('delete from cola where seq = ?', [op.seq]);
  }
  return true;
}
//bajar los cambios de la nube
let revisando: Promise<boolean | null> | null = null;
//compara la nube con la informacion del telefono retonrna si hay coneccion
export function revisarNube(): Promise<boolean | null> {
  if (!db) return Promise.resolve(false);
  revisando ??= compararConNube().finally(() => { revisando = null; }); // con 2 s no se pisan
  return revisando;
}

async function compararConNube(): Promise<boolean | null> {
  // Primero se suben los cambios del teléfono para que la nube no los pise
  if (!(await sincronizar())) return null;

  let nube: Docente[];
  try {
    nube = (await api.getDocentes('', 1, 100)).results;
  } catch (e) {
    if (e instanceof SinConeccionError) return null;
    throw e;
  }

  const locales = await db!.getAllAsync<Docente>('select * from docente where id > 0');
  const porId = new Map(locales.map((d) => [d.id, d]));
  const pendientes = await idsPendientes();
 
  const primeraVez = (await leerAjuste('sincronizado')) == null;
  let huboCambios = false;

  await db!.withTransactionAsync(async () => {
    for (const d of nube) {
      const local = porId.get(d.id);
      porId.delete(d.id);
      if (pendientes.has(d.id)) continue; // si se tiene cambios del teléfono sin enviar
      if (!local) {
        await guardarEnCache(d, primeraVez ? 0 : 1); // lo insertaron en la nube
        huboCambios = true;
      } else if (CAMPOS.some((c) => local[c] !== d[c])) {
        await guardarEnCache(d); // lo editaron en la nube
        huboCambios = true;
      }
    }
    // Lo que sobró ya no existe en la nube lo eliminaron allá
    for (const id of porId.keys()) {
      if (pendientes.has(id)) continue;
      await db!.runAsync('DELETE FROM docente WHERE id = ?', [id]);
      huboCambios = true;
    }
  });

  await guardarAjuste('sincronizado', '1');
  return huboCambios;
}
//lectura
export async function getDocentes(buscar = ''): Promise<DocenteListResponse> {
  if (!db) return api.getDocentes(buscar);
  const cambios = await revisarNube();
  const source = cambios === null ? 'teléfono (sin conexión)' : 'servidor';

// Siempre se muestra lo del teléfono con los nuevos primero
  const like = `%${buscar.trim()}%`;
  const results = await db.getAllAsync<Docente>(
    `select * from docente where nombre like ? or profesion like ? or facultad like ?
     order by nuevo desc, nombre limit 100`, [like, like, like]);
  return { source, results };
}

export async function getDocente(id: Docente['id']): Promise<DocenteResponse> {
  if (!db) return api.getDocente(id);
  // Si tiene cambios sin enviar la versión buena es la del teléfono
  if (id > 0 && !(await idsPendientes()).has(id)) {
    try {
      const data = await api.getDocente(id);
      await guardarEnCache(data.docente);
      return data;
    } catch (e) {
      if (!(e instanceof SinConeccionError)) throw e;
    }
  }
  const docente = await db.getFirstAsync<Docente>('select * from docente where id = ?', [id]);
  if (!docente) throw new Error('Este docente no está guardado en el teléfono');
  return { source: 'teléfono', docente };
}

// Escritura 
// Con conexión va directo a la nube sin conexión se guarda en el teléfono y se encola.

export async function crearDocente(datos: DocenteDatos) {
  if (!db) return api.crearDocente(datos);
  if (await sincronizar()) {
    try {
      // Con conexión también se evita el duplicado pero aquí se le avisa al usuario
      const repetido = await buscarEnNube(datos);
      if (repetido) throw new Error(`Ya existe en la nube un docente con esos datos: ${repetido.nombre}`);
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
    // Nunca llegó al servidor basta con olvidarlo
    await db.runAsync('delete from cola where docente_id = ?', [id]);
    await db.runAsync('delete from docente where id = ?', [id]);
    return { detail: 'Docente eliminado' };
  }
  if (await sincronizar()) {
    try {
      const data = await api.eliminarDocente(id);
      await db.runAsync('delete from docente where id = ?', [id]);
      return data;
    } catch (e) {
      if (!(e instanceof SinConeccionError)) throw e;
    }
  }
  await db.runAsync('delete from docente where id = ?', [id]);
  await encolar('eliminar', id);
  return { detail: 'Eliminado en el teléfono; se enviará cuando haya conexión' };
}