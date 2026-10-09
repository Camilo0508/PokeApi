import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';

import { PORT } from './config.js';
import * as db from './database.js';
import { openapi } from './openapi.js';
import * as repository from './repository.js';

const app = express();
app.set('trust proxy', true); // en Render, para que las URLs de las imágenes salgan con https
app.use(cors());
app.use(express.json({ limit: '2mb' })); // para recibir pokémon en JSON
// Para recibir imágenes: llegan como bytes en el cuerpo de la petición
app.use(express.raw({ type: ['image/*', 'application/octet-stream'], limit: '8mb' }));

// Documentación Swagger: se puede leer y probar cada endpoint desde el navegador
app.get('/openapi.json', (req, res) => res.json(openapi));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.get('/', (req, res) => res.redirect('/docs'));

// Las imágenes las sirve este mismo backend desde PostgreSQL.
// images[0] = gif animado, images[1] = artwork oficial, images[2] = sprite clásico
function withImages(req, p) {
  const base = `${req.protocol}://${req.get('host')}/images/${p.id}`;
  const images = [0, 1, 2].map((posicion) => `${base}/${posicion}`);
  return { ...p, images, image: images[0] };
}

app.get('/health', async (req, res) => {
  res.json({
    internet: true,
    saved_pokemon: await db.countPokemon(),
    database: (await db.ping()) ? 'PostgreSQL' : 'sin conexión',
  });
});

app.get('/pokemon', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Number(req.query.offset) || 0;
    const { results, source } = await repository.listPokemon(limit, offset);
    res.json({ source, results: results.map((p) => withImages(req, p)) });
  } catch (error) {
    next(error);
  }
});

app.get('/pokemon/:name', async (req, res, next) => {
  try {
    const { pokemon, source } = await repository.getPokemon(req.params.name);
    if (!pokemon) {
      return res.status(404).json({ detail: 'Este pokémon no se encuentra en la base de datos' });
    }
    res.json({ source, pokemon: withImages(req, pokemon) });
  } catch (error) {
    next(error);
  }
});

// ---------- Alta manual (desde Swagger o con curl) ----------

app.post('/pokemon', async (req, res, next) => {
  try {
    const { id, name, height, weight, types, abilities, moves } = req.body ?? {};

    if (!Number.isInteger(id) || !name || !Number.isInteger(height) || !Number.isInteger(weight)) {
      return res.status(400).json({
        detail: 'Faltan datos: id, name, height y weight son obligatorios (id, height y weight enteros)',
      });
    }

    await db.savePokemon({
      id,
      name: String(name).trim().toLowerCase(),
      height,
      weight,
      types: types ?? [],
      abilities: abilities ?? [],
      moves: moves ?? [],
    });

    const guardado = await db.getPokemon(String(id));
    res.status(201).json({ source: 'local', pokemon: withImages(req, guardado) });
  } catch (error) {
    next(error);
  }
});

// ---------- Editar y eliminar (CRUD) ----------
// Quedan listos en el backend; la app todavía no los consume.

app.put('/pokemon/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const actual = Number.isInteger(id) ? await db.getPokemon(String(id)) : null;
    if (!actual) {
      return res.status(404).json({ detail: 'Este pokémon no se encuentra en la base de datos' });
    }

    // Solo se cambian los campos que lleguen; el id no se puede cambiar
    const { name, height, weight, types, abilities, moves } = req.body ?? {};
    const errores = [];
    if (name !== undefined && !String(name).trim()) errores.push('name no puede ir vacío');
    if (height !== undefined && !Number.isInteger(height)) errores.push('height debe ser entero');
    if (weight !== undefined && !Number.isInteger(weight)) errores.push('weight debe ser entero');
    for (const [campo, valor] of Object.entries({ types, abilities, moves })) {
      if (valor !== undefined && !Array.isArray(valor)) errores.push(`${campo} debe ser una lista`);
    }
    if (errores.length > 0) return res.status(400).json({ detail: errores.join(', ') });

    await db.savePokemon({
      id,
      name: name !== undefined ? String(name).trim().toLowerCase() : actual.name,
      height: height ?? actual.height,
      weight: weight ?? actual.weight,
      types: types ?? actual.types,
      abilities: abilities ?? actual.abilities,
      moves: moves ?? actual.moves,
    });

    const guardado = await db.getPokemon(String(id));
    res.json({ source: 'local', pokemon: withImages(req, guardado) });
  } catch (error) {
    next(error);
  }
});

app.delete('/pokemon/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || !(await db.deletePokemon(id))) {
      return res.status(404).json({ detail: 'Este pokémon no se encuentra en la base de datos' });
    }
    res.json({ detail: 'Pokémon eliminado' });
  } catch (error) {
    next(error);
  }
});

// Sube una de las tres imágenes de un pokémon que ya exista
app.put('/images/:id/:posicion', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const posicion = Number(req.params.posicion);

    if (![0, 1, 2].includes(posicion)) {
      return res.status(400).json({ detail: 'La posición debe ser 0, 1 o 2' });
    }
    if (!(await db.getPokemon(String(id)))) {
      return res.status(404).json({ detail: 'Primero crea el pokémon con POST /pokemon' });
    }
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ detail: 'No llegó ninguna imagen en el cuerpo de la petición' });
    }

    await db.saveImage(id, posicion, req.body, req.get('content-type') ?? 'image/png');
    res.json({ detail: 'Imagen guardada', bytes: req.body.length });
  } catch (error) {
    next(error);
  }
});

app.get('/images/:id/:posicion', async (req, res, next) => {
  try {
    const row = await db.getImage(Number(req.params.id), Number(req.params.posicion));
    if (!row) return res.status(404).json({ detail: 'Imagen no guardada' });
    res.type(row.image_type).send(row.image);
  } catch (error) {
    next(error);
  }
});

// Cualquier error inesperado se responde en el mismo formato que los demás
app.use((error, req, res, _next) => {
  console.error(error);
  res.status(500).json({ detail: error.message });
});

// El servidor arranca de una vez: si la base todavía no responde (pasa en Render
// cuando apenas se está creando), se reintenta en segundo plano en vez de caerse.
app.listen(PORT, () => {
  console.log(`Backend Pokémon (PostgreSQL) escuchando en el puerto ${PORT}`);
  console.log(`Swagger en /docs`);
});

async function prepararBase(intentos = 10) {
  for (let i = 1; i <= intentos; i++) {
    try {
      await db.initDb(); // crea las tablas si no existen
      console.log('Tablas listas en PostgreSQL');
      return;
    } catch (error) {
      console.error(`Intento ${i}/${intentos} de conectar a PostgreSQL falló: ${error.message}`);
      await new Promise((listo) => setTimeout(listo, 5000));
    }
  }
  console.error('No se pudo conectar a PostgreSQL. Revisa la variable DATABASE_URL.');
}

prepararBase();
