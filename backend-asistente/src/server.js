import express from 'express';
import cors from 'cors';
import { responder } from './asistente.js';
import { diagnostico, precargar } from './buscar.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

const PORT = process.env.PORT || 8003;

function sanearMensajes(entrada) {
  if (!Array.isArray(entrada)) return [];

  let mensajes = entrada
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim() !== ''
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    .slice(-10);

  while (mensajes.length && mensajes[0].role !== 'user') mensajes.shift();
  if (!mensajes.length || mensajes[mensajes.length - 1].role !== 'user') return [];

  return mensajes;
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'asistente' });
});

// Revisa si el asistente alcanza los otros tres servicios
app.get('/diagnostico', async (req, res, next) => {
  try {
    res.json(await diagnostico());
  } catch (err) {
    next(err);
  }
});

app.post('/chat', async (req, res, next) => {
  try {
    const mensajes = sanearMensajes(req.body?.mensajes);
    if (!mensajes.length) {
      return res.status(400).json({ error: 'Debes enviar al menos una pregunta' });
    }

    const respuesta = await responder(mensajes);
    res.json({ respuesta });
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del asistente' });
});

app.listen(PORT, () => {
  console.log(`Asistente escuchando en http://localhost:${PORT}`);
  // Deja las listas en memoria desde el arranque y las renueva antes de que venzan
  precargar();
  setInterval(precargar, 9 * 60 * 1000);
});