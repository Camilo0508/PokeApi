/**
 * Microservicio de Docentes de Uninpahu.
 *
 * AGNÓSTICO: usa solo el módulo "node:http" que trae Node, sin Express ni
 * ningún otro framework. El enrutamiento y el CORS están hechos a mano.
 *
 * Los datos entran por PATH PARAMS (/docentes/5) y QUERY PARAMS
 * (?nombre=Carlos&profesion=Ingeniero). No se usa el cuerpo de la petición.
 */
import { createServer } from 'node:http';

import { PORT } from './config.js';
import * as db from './database.js';
import * as docentes from './docenteService.js';
import { openapi, paginaSwagger } from './openapi.js';

// ---------- Utilidades de respuesta ----------

function responder(res, status, datos) {
  const cuerpo = JSON.stringify(datos);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(cuerpo),
    // CORS a mano, porque no tenemos la librería cors
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(cuerpo);
}

function responderHtml(res, html) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

// ---------- Lectura de los parámetros ----------

/** Convierte los query params en los campos del docente */
function datosDesdeQuery(params) {
  const datos = {};
  for (const campo of [
    'nombre',
    'profesion',
    'titulo',
    'universidad',
    'facultad',
    'cargo',
    'correo',
    'resumen',
    'foto',
  ]) {
    if (params.has(campo)) datos[campo] = params.get(campo);
  }
  // experiencia viene como texto en la URL y debe quedar como número
  if (params.has('experiencia')) {
    const anios = Number(params.get('experiencia'));
    datos.experiencia = Number.isInteger(anios) ? anios : params.get('experiencia');
  }
  return datos;
}

// ---------- Enrutamiento ----------

const RUTA_DOCENTE = /^\/docentes\/(\d+)$/; // path param: el id

async function manejar(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const ruta = url.pathname.replace(/\/+$/, '') || '/';
  const params = url.searchParams;

  // Permiso previo del navegador (CORS)
  if (req.method === 'OPTIONS') return responder(res, 204, {});

  // Documentación
  if (ruta === '/' && req.method === 'GET') {
    res.writeHead(302, { Location: '/docs' });
    return res.end();
  }
  if (ruta === '/docs' && req.method === 'GET') return responderHtml(res, paginaSwagger());
  if (ruta === '/openapi.json' && req.method === 'GET') return responder(res, 200, openapi);

  if (ruta === '/health' && req.method === 'GET') {
    return responder(res, 200, await docentes.estado());
  }

  // Lista con query params: ?buscar=&limit=&page=
  if (ruta === '/docentes' && req.method === 'GET') {
    const results = await docentes.listar({
      buscar: params.get('buscar') ?? '',
      limit: Number(params.get('limit')) || 20,
      page: Number(params.get('page')) || 1,
    });
    return responder(res, 200, { source: 'local', results });
  }

  // Alta con query params (no body)
  if (ruta === '/docentes' && req.method === 'POST') {
    const datos = datosDesdeQuery(params);
    const errores = docentes.validar(datos);
    if (errores.length > 0) return responder(res, 400, { detail: errores.join(', ') });

    return responder(res, 201, { docente: await docentes.crear(datos) });
  }

  // Rutas con path param: /docentes/{id}
  const conId = ruta.match(RUTA_DOCENTE);
  if (conId) {
    const id = Number(conId[1]);

    if (req.method === 'GET') {
      const docente = await docentes.buscar(id);
      if (!docente) return responder(res, 404, { detail: 'Este docente no está en la base de datos' });
      return responder(res, 200, { source: 'local', docente });
    }

    if (req.method === 'PUT') {
      const datos = datosDesdeQuery(params);
      if (Object.keys(datos).length === 0) {
        return responder(res, 400, { detail: 'No llegó ningún campo para actualizar' });
      }
      const docente = await docentes.actualizar(id, datos);
      if (!docente) return responder(res, 404, { detail: 'Este docente no está en la base de datos' });
      return responder(res, 200, { docente });
    }

    if (req.method === 'DELETE') {
      const borrado = await docentes.eliminar(id);
      if (!borrado) return responder(res, 404, { detail: 'Este docente no está en la base de datos' });
      return responder(res, 200, { detail: 'Docente eliminado' });
    }
  }

  responder(res, 404, { detail: `No existe la ruta ${req.method} ${ruta}` });
}

// ---------- Arranque ----------

const servidor = createServer((req, res) => {
  manejar(req, res).catch((error) => {
    console.error(error);
    responder(res, 500, { detail: error.message });
  });
});

servidor.listen(PORT, () => {
  console.log(`Microservicio de Docentes (sin Express) en el puerto ${PORT}`);
  console.log('Swagger en /docs');
});

// La tabla se crea sola; si la base tarda, se reintenta sin tumbar el servicio
(async function prepararBase(intentos = 10) {
  for (let i = 1; i <= intentos; i++) {
    try {
      await db.initDb();
      return console.log('Tabla docente lista en PostgreSQL');
    } catch (error) {
      console.error(`Intento ${i}/${intentos} de conectar a PostgreSQL: ${error.message}`);
      await new Promise((listo) => setTimeout(listo, 5000));
    }
  }
})();
