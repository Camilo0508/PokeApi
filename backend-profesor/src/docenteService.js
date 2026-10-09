/**
 * Lógica del negocio: código AGNÓSTICO.
 *
 * Este archivo no sabe nada de HTTP ni de PostgreSQL: solo recibe y devuelve
 * objetos. Por eso podría usarse igual desde otro servidor o con otra base.
 */
import * as db from './database.js';

const UNIVERSIDAD = 'Fundación Universitaria Uninpahu';

/**
 * Revisa los datos antes de guardarlos.
 * parcial = true al actualizar: el nombre solo se exige si llegó.
 */
export function validar(datos, { parcial = false } = {}) {
  const errores = [];

  const faltaNombre = !datos.nombre || !datos.nombre.trim();
  if (faltaNombre && (!parcial || datos.nombre !== undefined)) errores.push('nombre es obligatorio');
  if (datos.correo && !datos.correo.includes('@')) errores.push('correo inválido');
  if (datos.experiencia != null && !Number.isInteger(datos.experiencia)) {
    errores.push('experiencia debe ser un número entero de años');
  }

  return errores;
}

/** Deja los datos listos y parejos antes de guardarlos */
export function normalizar(datos) {
  return {
    nombre: datos.nombre?.trim(),
    profesion: datos.profesion?.trim() ?? null,
    titulo: datos.titulo?.trim() ?? null,
    universidad: datos.universidad?.trim() || UNIVERSIDAD, // por defecto, Uninpahu
    facultad: datos.facultad?.trim() ?? null,
    cargo: datos.cargo?.trim() ?? null,
    correo: datos.correo?.trim().toLowerCase() ?? null,
    experiencia: datos.experiencia ?? null,
    resumen: datos.resumen?.trim() ?? null,
    foto: datos.foto?.trim() ?? null,
  };
}

export async function crear(datos) {
  return db.insertDocente(normalizar(datos));
}

export async function actualizar(id, datos) {
  // Solo se mandan los campos que de verdad llegaron
  // y ya limpios (trim, correo en minúscula...), igual que al crear
  const limpios = normalizar(datos);
  const cambios = {};
  for (const campo of Object.keys(datos)) {
    if (limpios[campo] !== undefined) cambios[campo] = limpios[campo];
  }
  return db.updateDocente(id, cambios);
}

export function buscar(id) {
  return db.getDocente(id);
}

export function listar({ buscar: texto = '', limit = 20, page = 1 } = {}) {
  const porPagina = Math.min(Math.max(limit, 1), 100);
  const pagina = Math.max(page, 1);
  return db.listDocentes({ buscar: texto, limit: porPagina, offset: (pagina - 1) * porPagina });
}

export function eliminar(id) {
  return db.deleteDocente(id);
}

export async function estado() {
  return {
    servicio: 'docentes',
    database: (await db.ping()) ? 'PostgreSQL' : 'sin conexión',
    saved_docentes: await db.countDocentes(),
  };
}
