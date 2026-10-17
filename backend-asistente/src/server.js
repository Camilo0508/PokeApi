import express from 'express';
import cors from 'cors';
import { responder } from './asistente.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

const PORT = process.env.PORT || 8003;
const TIPOS = ['pokemon', 'onepiece', 'docente'];

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

app.post('/chat', async (req, res, next) => {
  try {
    const { tipo, nombre } = req.body ?? {};

    if (!TIPOS.includes(tipo)) {
      return res.status(400).json({ error: 'tipo debe ser pokemon, onepiece o docente' });
    }
    if (typeof nombre !== 'string' || !nombre.trim() || nombre.length > 100) {
      return res.status(400).json({ error: 'Falta el nombre' });
    }

    const mensajes = sanearMensajes(req.body.mensajes);
    if (!mensajes.length) {
      return res.status(400).json({ error: 'Debes enviar al menos una pregunta' });
    }

    const respuesta = await responder({ tipo, nombre: nombre.trim(), mensajes });
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
});