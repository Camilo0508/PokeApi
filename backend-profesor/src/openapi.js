/**
 * Documentación OpenAPI (Swagger) hecha a mano.
 *
 * Como el microservicio es agnóstico (sin Express), tampoco se usa
 * "swagger-ui-express": la página /docs es un HTML que carga Swagger UI
 * desde internet y lee /openapi.json.
 */

const Docente = {
  type: 'object',
  properties: {
    id: { type: 'integer', example: 1 },
    nombre: { type: 'string', example: 'Carlos Pérez' },
    profesion: { type: 'string', example: 'Ingeniero de Sistemas' },
    titulo: { type: 'string', example: 'Magíster en Ingeniería de Software' },
    universidad: { type: 'string', example: 'Fundación Universitaria Uninpahu' },
    facultad: { type: 'string', example: 'Facultad de Ingeniería' },
    cargo: { type: 'string', example: 'Docente de tiempo completo' },
    correo: { type: 'string', example: 'carlos.perez@uninpahu.edu.co' },
    experiencia: { type: 'integer', description: 'Años de experiencia', example: 8 },
    resumen: { type: 'string', description: 'Texto largo para la pantalla de detalle' },
    foto: { type: 'string', format: 'uri' },
  },
};

// Los mismos campos, pero como query params para crear y actualizar
const camposQuery = (obligatorioNombre) =>
  Object.entries(Docente.properties)
    .filter(([campo]) => campo !== 'id')
    .map(([campo, esquema]) => ({
      name: campo,
      in: 'query',
      required: obligatorioNombre && campo === 'nombre',
      description: esquema.description,
      schema: { type: esquema.type, example: esquema.example },
    }));

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Docentes Uninpahu Service',
    version: '1.0.0',
    description:
      'Microservicio **agnóstico** en Node.js: usa solo el módulo `node:http`, sin Express ' +
      'ni ningún framework web.\n\n' +
      'Los datos se envían por **path params** (`/docentes/1`) y **query params** ' +
      '(`?nombre=Carlos`). **No se usa body.**\n\n' +
      'Base de datos: PostgreSQL en la nube (Render).',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Docentes', description: 'Consulta de los docentes guardados' },
    { name: 'Administración', description: 'Crear, actualizar y eliminar' },
    { name: 'Estado', description: 'Salud del servicio' },
  ],
  paths: {
    '/docentes': {
      get: {
        tags: ['Docentes'],
        summary: 'Lista de docentes',
        description: 'Devuelve los docentes guardados. Se puede filtrar por nombre, profesión o facultad.',
        parameters: [
          {
            name: 'buscar',
            in: 'query',
            description: 'Texto a buscar en nombre, profesión o facultad',
            schema: { type: 'string', example: 'ingenier' },
          },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
        ],
        responses: {
          200: {
            description: 'Lista de docentes',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    source: { type: 'string', example: 'local' },
                    results: { type: 'array', items: Docente },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Administración'],
        summary: 'Crear un docente (por query params)',
        description: 'Ejemplo: `/docentes?nombre=Carlos%20Pérez&profesion=Ingeniero%20de%20Sistemas`',
        parameters: camposQuery(true),
        responses: {
          201: {
            description: 'Docente creado',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { docente: Docente } },
              },
            },
          },
          400: { description: 'Faltan datos o son inválidos' },
        },
      },
    },
    '/docentes/{id}': {
      get: {
        tags: ['Docentes'],
        summary: 'Ficha completa de un docente',
        description: 'Es lo que abre el botón "Ver más" de la aplicación.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } }],
        responses: {
          200: {
            description: 'El docente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { source: { type: 'string' }, docente: Docente },
                },
              },
            },
          },
          404: { description: 'No está en la base de datos' },
        },
      },
      put: {
        tags: ['Administración'],
        summary: 'Actualizar un docente (por query params)',
        description: 'Solo se cambian los campos que envíes. Ejemplo: `/docentes/1?cargo=Director`',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } },
          ...camposQuery(false),
        ],
        responses: {
          200: { description: 'Docente actualizado' },
          400: { description: 'No llegó ningún campo' },
          404: { description: 'No está en la base de datos' },
        },
      },
      delete: {
        tags: ['Administración'],
        summary: 'Eliminar un docente',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } }],
        responses: {
          200: { description: 'Docente eliminado' },
          404: { description: 'No está en la base de datos' },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Estado'],
        summary: 'Estado del servicio y de la base',
        responses: {
          200: {
            description: 'Estado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    servicio: { type: 'string', example: 'docentes' },
                    database: { type: 'string', example: 'PostgreSQL' },
                    saved_docentes: { type: 'integer', example: 5 },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

/** Página /docs: Swagger UI cargado desde su CDN, sin librerías instaladas */
export function paginaSwagger() {
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Docentes Uninpahu · API</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger' });
    </script>
  </body>
</html>`;
}
