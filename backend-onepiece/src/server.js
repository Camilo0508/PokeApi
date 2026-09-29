import cors from 'cors';
import express from 'express';

import { PORT } from './config.js';
import * as db from './database.js';
import * as repository from './repository.js';

const app = express();
app.use(cors());

// La imagen la sirve este mismo backend desde su base de datos
const withImage = (req, p) => ({
  ...p,
  image: `${req.protocol}://${req.get('host')}/images/${p.id}`,
});

app.get('/health', async (req, res) => {
  res.json({ internet: await repository.hasInternet(), saved_characters: db.countCharacters() });
});

app.get('/characters', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const page = Math.max(Number(req.query.page) || 1, 1);
  const texto = (req.query.q ?? '').toString().trim();

  const { results, source } = texto
    ? await repository.searchCharacters(texto, limit)
    : await repository.listCharacters(limit, page);

  res.json({ source, results: results.map((p) => withImage(req, p)) });
});

app.get('/characters/:id', async (req, res) => {
  const { character, source } = await repository.getCharacter(req.params.id);
  if (!character) {
    const detail = source === 'api' ? 'Personaje no encontrado' : 'Sin internet y no está guardado';
    return res.status(404).json({ detail });
  }
  res.json({ source, character: withImage(req, character) });
});

app.get('/images/:id', (req, res) => {
  const row = db.getImage(req.params.id);
  if (!row) return res.status(404).json({ detail: 'Imagen no guardada' });
  res.type(row.image_type).send(row.image);
});

app.listen(PORT, () => {
  console.log(`Backend One Piece en http://localhost:${PORT}`);
});
