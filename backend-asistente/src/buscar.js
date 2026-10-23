import { POKEMON_API_URL, ONEPIECE_API_URL, DOCENTES_API_URL } from './config.js';

async function pedirUnaVez(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
    return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : null };
  } catch (err) {
    return { ok: false, status: 0, data: null, motivo: err.message };
  }
}

// Si falla se intenta una vez más: en Render gratis el primer intento puede ser el que lo despierta
async function pedir(url) {
  let r = await pedirUnaVez(url);
  if (!r.ok) r = await pedirUnaVez(url);
  if (!r.ok) console.error(`No respondió ${url} (status ${r.status}${r.motivo ? `, ${r.motivo}` : ''})`);
  return r;
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

// Las listas se guardan 10 minutos en memoria: así la mayoría de preguntas no esperan a las bases de datos
const DURACION_CACHE = 10 * 60 * 1000;
const cache = {};

async function listarTodos(tipo, forzar = false) {
  const guardado = cache[tipo];
  if (!forzar && guardado && Date.now() - guardado.hora < DURACION_CACHE) return guardado.registros;

  const fuente = FUENTES[tipo];
  const registros = [];
  for (let i = 0; i < 20; i++) {
    const r = await pedir(fuente.pagina(i));
    if (!r.ok) {
      // El servicio no respondió: mejor la lista anterior que nada
      if (i === 0) return guardado?.registros ?? null;
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

// Trae las listas de las tres bases de datos (una sola vez por pregunta)
async function traerListas(forzar = false) {
  const tipos = Object.keys(FUENTES);
  const listas = await Promise.all(tipos.map((tipo) => listarTodos(tipo, forzar)));
  return {
    listas: tipos.map((tipo, i) => ({ tipo, registros: listas[i] ?? [] })),
    caidos: tipos.filter((_, i) => listas[i] === null).map((t) => CATEGORIA[t]),
    // Respondieron pero sin ningún registro: casi siempre es una URL que apunta a otra base
    vacias: tipos.filter((_, i) => listas[i]?.length === 0).map((t) => CATEGORIA[t]),
  };
}

// Busca en un texto el nombre de algún registro, SIN IA
function buscarEnTexto(texto, listas) {
  const candidatos = [];
  for (const { tipo, registros } of listas) {
    for (const registro of registros) {
      const puntos = puntaje(texto, FUENTES[tipo].nombre(registro));
      if (puntos > 0) candidatos.push({ tipo, registro, puntos });
    }
  }
  if (candidatos.length === 0) return null;

  const mejor = Math.max(...candidatos.map((c) => c.puntos));
  return candidatos.filter((c) => c.puntos === mejor);
}

// "¿Quién es Goku?" nombra a alguien nuevo: si no existe, no se debe seguir con el anterior
const PIDE_ALGUIEN = /\b(quien es|quien era|que sabes de|hablame de|cuentame de|informacion de|info de|datos de|sobre)\s+\w/;

/**
 * Revisa los mensajes del usuario, del más nuevo al más viejo, buscando a quién se refiere.
 * Así "¿y cuánto pesa?" sigue hablando del último que se nombró.
 * Devuelve también "desde": la posición del mensaje donde se nombró, para que a la IA
 * solo le llegue la conversación sobre ese registro y no se mezcle con los anteriores.
 */
export async function detectar(mensajes, forzar = false) {
  const { listas, caidos, vacias } = await traerListas(forzar);

  const ultimo = mensajes.length - 1;
  const ultimoTexto = normalizar(mensajes[ultimo]?.content);
  // Si se pide a alguien nuevo, o algún servicio falló, no se sigue con el tema anterior
  const soloElUltimo = PIDE_ALGUIEN.test(ultimoTexto) || caidos.length > 0;

  for (let i = ultimo; i >= 0; i--) {
    if (mensajes[i].role !== 'user') continue;
    if (soloElUltimo && i !== ultimo) break;

    const empatados = buscarEnTexto(normalizar(mensajes[i].content), listas);
    if (!empatados) continue;

    if (empatados.length > 1) {
      return {
        varios: empatados.slice(0, 6).map((c) => `${FUENTES[c.tipo].nombre(c.registro)} (${CATEGORIA[c.tipo]})`),
      };
    }

    const { tipo, registro } = empatados[0];
    return {
      encontrado: true,
      desde: i,
      tipo,
      categoria: CATEGORIA[tipo],
      nombre: FUENTES[tipo].nombre(registro),
      datos: sinImagenes(registro),
    };
  }

  // Puede que lo hayan guardado hace poco y la lista en memoria sea vieja: se revisa una vez con datos frescos
  if (!forzar && caidos.length === 0) return detectar(mensajes, true);
  return { encontrado: false, caidos, vacias };
}

// Carga las tres listas en segundo plano (al arrancar y cada 9 minutos),
// para que las preguntas encuentren todo listo en memoria
export async function precargar() {
  const inicio = Date.now();
  const { listas, caidos } = await traerListas(true);
  const conteo = listas.map((l) => `${l.tipo}: ${l.registros.length}`).join(', ');
  console.log(`Listas precargadas en ${Date.now() - inicio} ms (${conteo})${caidos.length ? ` · sin respuesta: ${caidos.join(', ')}` : ''}`);
}

// Para revisar desde el navegador si el asistente alcanza los otros servicios
export async function diagnostico() {
  const urls = { pokemon: POKEMON_API_URL, onepiece: ONEPIECE_API_URL, docente: DOCENTES_API_URL };
  const resultado = {};
  for (const [tipo, url] of Object.entries(urls)) {
    const r = await pedirUnaVez(`${url}/health`);
    const registros = (await listarTodos(tipo)) ?? [];
    resultado[tipo] = {
      url,
      responde: r.ok,
      status: r.status,
      ...(r.motivo ? { motivo: r.motivo } : {}),
      // Cuántos registros lee el asistente de esa base y algunos nombres, para comprobar que es la correcta
      registros: registros.length,
      ejemplos: registros.slice(0, 5).map((x) => FUENTES[tipo].nombre(x)),
    };
  }
  return resultado;
}
