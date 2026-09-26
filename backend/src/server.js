import cors from 'cors';
import express from 'express';

import { PORT } from './config.js';
import * as db from './database.js';
import * as repository from './repository.js';

const app = express();
app.use(cors());

// Agrega las URLs de las imágenes (servidas por este mismo backend).
// images[0] = gif animado, images[1] = artwork oficial, images[2] = sprite clásico
function withImages(req, p) {
  const base = `${req.protocol}://${req.get('host')}/images/${p.id}`;
  const images = [0, 1, 2].map((posicion) => `${base}/${posicion}`);
  return { ...p, images, image: images[0] };
}

app.get('/health', async (req, res) => {
  res.json({ internet: await repository.hasInternet(), saved_pokemon: db.countPokemon() });
});

app.get('/pokemon', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const offset = Number(req.query.offset) || 0;
  const { results, source } = await repository.listPokemon(limit, offset);
  res.json({ source, results: results.map((p) => withImages(req, p)) });
});

app.get('/pokemon/:name', async (req, res) => {
  const { pokemon, source } = await repository.getPokemon(req.params.name);
  if (!pokemon) {
    const detail = source === 'api' ? 'Pokémon no encontrado' : 'Sin internet y no está guardado';
    return res.status(404).json({ detail }); // la app lee "detail", igual que con FastAPI
  }
  res.json({ source, pokemon: withImages(req, pokemon) });
});

app.get('/images/:id/:posicion', (req, res) => {
  const row = db.getImage(Number(req.params.id), Number(req.params.posicion));
  if (!row) return res.status(404).json({ detail: 'Imagen no guardada' });
  res.type(row.image_type).send(row.image);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend Node en http://localhost:${PORT}`);
});
