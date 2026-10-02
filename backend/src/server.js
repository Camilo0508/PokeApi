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
    internet: await repository.hasInternet(),
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
      const detail = source === 'api' ? 'Pokémon no encontrado' : 'Sin internet y no está guardado';
      return res.status(404).json({ detail });
    }
    res.json({ source, pokemon: withImages(req, pokemon) });
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

await db.initDb(); // crea las tablas si no existen

app.listen(PORT, () => {
  console.log(`Backend Pokémon (PostgreSQL) en http://localhost:${PORT}`);
  console.log(`Swagger en http://localhost:${PORT}/docs`);
});
