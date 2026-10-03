/**
 * Documentación OpenAPI (Swagger) del microservicio Pokémon.
 * Se ve y se prueba en /docs; el JSON crudo queda en /openapi.json.
 */
export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Pokémon Service',
    version: '1.0.0',
    description:
      'Microservicio en Node + Express con PostgreSQL (base relacional).\n\n' +
      'Las consultas se responden **únicamente con lo que hay en PostgreSQL**. ' +
      'El servicio no consulta la PokeAPI: si un pokémon no está guardado, responde 404.\n\n' +
      'Los datos se cargan a propósito, desde la consola con `npm run seed` ' +
      'o insertándolos directamente en la base.\n\n' +
      '`"source": "local"` = salió de PostgreSQL.',
  },
  // URL relativa: "Try it out" funciona igual en local y en Render
  servers: [{ url: '/' }],
  tags: [
    { name: 'Pokémon', description: 'Consulta de los pokémon guardados en PostgreSQL' },
    { name: 'Imágenes', description: 'Imágenes guardadas en PostgreSQL' },
    { name: 'Alta manual', description: 'Insertar pokémon e imágenes a mano, sin la PokeAPI' },
    { name: 'Estado', description: 'Salud del servicio' },
  ],
  paths: {
    '/pokemon': {
      post: {
        tags: ['Alta manual'],
        summary: 'Insertar un pokémon a mano',
        description:
          'Guarda el pokémon en PostgreSQL. Si el id ya existe, lo actualiza.\n\n' +
          'Las imágenes se suben aparte, con PUT /images/{id}/{posicion}.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PokemonNuevo' },
              example: {
                id: 132,
                name: 'ditto',
                height: 3,
                weight: 40,
                types: ['normal'],
                abilities: ['limber', 'imposter'],
                moves: ['transform'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Pokémon guardado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PokemonResponse' } } },
          },
          400: {
            description: 'Faltan datos obligatorios',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          500: { $ref: '#/components/responses/Error' },
        },
      },
      get: {
        tags: ['Pokémon'],
        summary: 'Lista paginada de los pokémon guardados en la base',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            description: 'Cuántos traer (máximo 50)',
            schema: { type: 'integer', default: 20, minimum: 1, maximum: 50 },
          },
          {
            name: 'offset',
            in: 'query',
            description: 'Cuántos saltar desde el inicio',
            schema: { type: 'integer', default: 0, minimum: 0 },
          },
        ],
        responses: {
          200: {
            description: 'Página de pokémon',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PokemonList' } } },
          },
          500: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/pokemon/{name}': {
      get: {
        tags: ['Pokémon'],
        summary: 'Un pokémon guardado, por nombre o id',
        parameters: [
          {
            name: 'name',
            in: 'path',
            required: true,
            description: 'Nombre (pikachu) o número de la pokédex (25)',
            schema: { type: 'string', example: 'pikachu' },
          },
        ],
        responses: {
          200: {
            description: 'Pokémon encontrado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PokemonResponse' } } },
          },
          404: {
            description: 'No está guardado en la base de datos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { detail: 'Este pokémon no se encuentra en la base de datos' },
              },
            },
          },
          500: { $ref: '#/components/responses/Error' },
        },
      },
    },
    '/images/{id}/{posicion}': {
      put: {
        tags: ['Alta manual'],
        summary: 'Subir una imagen del pokémon',
        description:
          'Sube el archivo de imagen y lo guarda en PostgreSQL.\n\n' +
          'El pokémon debe existir antes (POST /pokemon).\n\n' +
          'posicion: 0 = gif animado · 1 = artwork oficial · 2 = sprite clásico',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 132 } },
          {
            name: 'posicion',
            in: 'path',
            required: true,
            schema: { type: 'integer', enum: [0, 1, 2], example: 0 },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'image/png': { schema: { type: 'string', format: 'binary' } },
            'image/gif': { schema: { type: 'string', format: 'binary' } },
            'image/jpeg': { schema: { type: 'string', format: 'binary' } },
            'image/webp': { schema: { type: 'string', format: 'binary' } },
          },
        },
        responses: {
          200: {
            description: 'Imagen guardada',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { detail: { type: 'string' }, bytes: { type: 'integer' } } },
              },
            },
          },
          400: {
            description: 'Posición inválida o cuerpo vacío',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          404: {
            description: 'El pokémon no existe todavía',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
      get: {
        tags: ['Imágenes'],
        summary: 'Imagen de un pokémon',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Id del pokémon',
            schema: { type: 'integer', example: 25 },
          },
          {
            name: 'posicion',
            in: 'path',
            required: true,
            description: '0 = gif animado · 1 = artwork oficial · 2 = sprite clásico',
            schema: { type: 'integer', enum: [0, 1, 2], example: 0 },
          },
        ],
        responses: {
          200: {
            description: 'La imagen',
            content: {
              'image/gif': { schema: { type: 'string', format: 'binary' } },
              'image/png': { schema: { type: 'string', format: 'binary' } },
            },
          },
          404: {
            description: 'Imagen no guardada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: { detail: 'Imagen no guardada' },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Estado'],
        summary: 'Cuántos pokémon hay guardados y estado de la base',
        responses: {
          200: {
            description: 'Estado del servicio',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Health' } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Source: {
        type: 'string',
        enum: ['local'],
        description: 'Siempre "local": los datos salen de PostgreSQL',
      },
      Pokemon: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 25 },
          name: { type: 'string', example: 'pikachu' },
          height: { type: 'integer', description: 'En decímetros', example: 4 },
          weight: { type: 'integer', description: 'En hectogramos', example: 60 },
          moves: { type: 'array', items: { type: 'string' }, example: ['mega-punch', 'pay-day'] },
          abilities: { type: 'array', items: { type: 'string' }, example: ['static', 'lightning-rod'] },
          types: { type: 'array', items: { type: 'string' }, example: ['fire', 'flying'] },
          images: {
            type: 'array',
            description: '[gif animado, artwork oficial, sprite clásico]',
            items: { type: 'string', format: 'uri' },
          },
          image: { type: 'string', format: 'uri', description: 'Igual a images[0]' },
        },
      },
      PokemonNuevo: {
        type: 'object',
        required: ['id', 'name', 'height', 'weight'],
        properties: {
          id: { type: 'integer', description: 'Número de la Pokédex', example: 132 },
          name: { type: 'string', example: 'ditto' },
          height: { type: 'integer', description: 'En decímetros (3 = 0.3 m)', example: 3 },
          weight: { type: 'integer', description: 'En hectogramos (40 = 4 kg)', example: 40 },
          types: {
            type: 'array',
            description: 'Da el color y el icono de la tarjeta: normal, fire, water, grass...',
            items: { type: 'string' },
            example: ['normal'],
          },
          abilities: { type: 'array', items: { type: 'string' }, example: ['limber', 'imposter'] },
          moves: { type: 'array', items: { type: 'string' }, example: ['transform'] },
        },
      },
      PokemonList: {
        type: 'object',
        properties: {
          source: { $ref: '#/components/schemas/Source' },
          results: { type: 'array', items: { $ref: '#/components/schemas/Pokemon' } },
        },
      },
      PokemonResponse: {
        type: 'object',
        properties: {
          source: { $ref: '#/components/schemas/Source' },
          pokemon: { $ref: '#/components/schemas/Pokemon' },
        },
      },
      Health: {
        type: 'object',
        properties: {
          internet: { type: 'boolean', description: 'Se deja por compatibilidad; siempre true' },
          saved_pokemon: { type: 'integer', description: 'Cuántos hay en la base' },
          database: { type: 'string', example: 'PostgreSQL' },
        },
      },
      Error: {
        type: 'object',
        properties: { detail: { type: 'string' } },
      },
    },
    responses: {
      Error: {
        description: 'Error inesperado del servidor',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
};
