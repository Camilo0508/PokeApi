import { POKEMON_API_URL, ONEPIECE_API_URL, DOCENTES_API_URL } from './config.js';

async function pedir(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
    return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : null };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

// Las imágenes y fotos no le sirven a la IA y gastan tokens
const sinImagenes = ({ images, image, foto, ...resto }) => resto;

// "Pokémon Señor-Mime!" -> "pokemon senor mime"
const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// Cada servicio: cómo pedir una página y cómo se llama el campo del nombre
const FUENTES = {
  pokemon: {
    pagina: (i) => `${POKEMON_API_URL}/pokemon?limit=50&offset=${i * 50}`,
    porPagina: 50,
    nombre: (r) => r.name,
  },
  onepiece: {
    pagina: (i) => `${ONEPIECE_API_URL}/characters?limit=100&page=${i + 1}`,
    porPagina: 100,
    nombre: (r) => r.name,
  },
  docente: {
    pagina: (i) => `${DOCENTES_API_URL}/docentes?limit=100&page=${i + 1}`,
    porPagina: 100,
    nombre: (r) => r.nombre,
  },
};

const CATEGORIA = { pokemon: 'pokémon', onepiece: 'personaje de One Piece', docente: 'docente' };

// Se guarda la lista 2 minutos para no pedirla en cada pregunta
const DURACION_CACHE = 2 * 60 * 1000;
const cache = {};

async function listarTodos(tipo) {
  const guardado = cache[tipo];
  if (guardado && Date.now() - guardado.hora < DURACION_CACHE) return guardado.registros;

  const fuente = FUENTES[tipo];
  const registros = [];
  for (let i = 0; i < 20; i++) {
    const r = await pedir(fuente.pagina(i));
    if (!r.ok) {
      if (i === 0) return null; // el servicio no respondió
      break;
    }
    const pagina = r.data?.results ?? [];
    registros.push(...pagina);
    if (pagina.length < fuente.porPagina) break;
  }

  cache[tipo] = { hora: Date.now(), registros };
  return registros;
}

// Palabras de un nombre que no sirven para reconocerlo solas
const IGNORAR = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y', 'san', 'the', 'd']);

// Qué tan bien aparece un nombre en el texto: nombre completo vale más que una sola palabra
function puntaje(texto, nombre) {
  const completo = normalizar(nombre);
  if (!completo) return 0;
  if (` ${texto} `.includes(` ${completo} `)) return 1000 + completo.length;

  let puntos = 0;
  for (const palabra of completo.split(' ')) {
    if (palabra.length >= 4 && !IGNORAR.has(palabra) && ` ${texto} `.includes(` ${palabra} `)) {
      puntos += palabra.length;
    }
  }
  return puntos;
}

// Busca en el texto el nombre de algún registro de las tres bases de datos, SIN IA
async function buscarEnTexto(texto) {
  const tipos = Object.keys(FUENTES);
  const listas = await Promise.all(tipos.map(listarTodos));

  const candidatos = [];
  const caidos = [];
  tipos.forEach((tipo, i) => {
    if (listas[i] === null) return caidos.push(tipo);
    for (const registro of listas[i]) {
      const puntos = puntaje(texto, FUENTES[tipo].nombre(registro));
      if (puntos > 0) candidatos.push({ tipo, registro, puntos });
    }
  });

  if (candidatos.length === 0) return { caidos };

  const mejor = Math.max(...candidatos.map((c) => c.puntos));
  const empatados = candidatos.filter((c) => c.puntos === mejor);
  return { caidos, empatados };
}

// "¿Quién es Goku?" nombra a alguien nuevo: si no existe, no se debe seguir con el anterior
const PIDE_ALGUIEN = /\b(quien es|quien era|que sabes de|hablame de|cuentame de|informacion de|info de|datos de|sobre)\s+\w/;

/**
 * Revisa los mensajes del usuario, del más nuevo al más viejo, buscando a quién se refiere.
 * Así "¿y cuánto pesa?" sigue hablando del último que se nombró.
 */
export async function detectar(mensajes) {
  let delUsuario = mensajes.filter((m) => m.role === 'user').reverse();
  if (PIDE_ALGUIEN.test(normalizar(delUsuario[0]?.content))) delUsuario = delUsuario.slice(0, 1);
  let caidos = [];

  for (const mensaje of delUsuario) {
    const resultado = await buscarEnTexto(normalizar(mensaje.content));
    caidos = resultado.caidos;
    if (!resultado.empatados) continue;

    if (resultado.empatados.length > 1) {
      return {
        varios: resultado.empatados
          .slice(0, 6)
          .map((c) => `${FUENTES[c.tipo].nombre(c.registro)} (${CATEGORIA[c.tipo]})`),
      };
    }

    const { tipo, registro } = resultado.empatados[0];
    return {
      encontrado: true,
      tipo,
      categoria: CATEGORIA[tipo],
      nombre: FUENTES[tipo].nombre(registro),
      datos: sinImagenes(registro),
    };
  }

  return { encontrado: false, caidos: caidos.map((t) => CATEGORIA[t]) };
}
