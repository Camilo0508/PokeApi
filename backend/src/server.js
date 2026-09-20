import cors from 'cors';
import express from 'express';

import { PORT } from './config.js';
import * as db from './database.js';
import * as repository from './repository.js';

const app = express();
app.use(cors());

// Agrega la URL completa de la imagen (servida por este mismo backend)
const withImage = (req, p) => ({ ...p, image: `${req.protocol}://${req.get('host')}/images/${p.id}` });

app.get('/health', async (req, res) => {
  res.json({ internet: await repository.hasInternet(), saved_pokemon: db.countPokemon() });
});

app.get('/pokemon', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const offset = Number(req.query.offset) || 0;
  const { results, source } = await repository.listPokemon(limit, offset);
  res.json({ source, results: results.map((p) => withImage(req, p)) });
});

app.get('/pokemon/:name', async (req, res) => {
  const { pokemon, source } = await repository.getPokemon(req.params.name);
  if (!pokemon) {
    const detail = source === 'api' ? 'Pokémon no encontrado' : 'Sin internet y no está guardado';
    return res.status(404).json({ detail }); // la app lee "detail", igual que con FastAPI
  }
  res.json({ source, pokemon: withImage(req, pokemon) });
});

app.get('/images/:id', (req, res) => {
  const row = db.getImage(Number(req.params.id));
  if (!row) return res.status(404).json({ detail: 'Imagen no guardada' });
  res.type(row.image_type).send(row.image);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend Node en http://localhost:${PORT}`);
});
