import express from 'express';
import cors from 'cors';
import { responder } from './asistente.js';
import { diagnostico, precargar } from './buscar.js';
import { IA_POR_DEFECTO, listarIas } from './ia/index.js';

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
  res.json({ status: 'ok', service: 'asistente', ia: IA_POR_DEFECTO });
});

// La app pide esta lista para mostrar con qué IA se puede hablar
app.get('/ias', (req, res) => {
  res.json({ porDefecto: IA_POR_DEFECTO, ias: listarIas() });
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

    // Tiempo de espera que eligió la app (20, 40, 80 o 160 s). La IA debe terminar un poco
    // antes, para que el backend alcance a contestar aunque sea con un aviso.
    const espera = Number(req.body?.espera);
    const esperaSeg = Number.isFinite(espera) ? Math.min(Math.max(espera, 5), 160) : 40;
    const esperaMs = Math.max(esperaSeg * 1000 - 3000, 3000);

    const ia = typeof req.body?.ia === 'string' ? req.body.ia : undefined;
    const respuesta = await responder(mensajes, { ia, esperaMs });
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