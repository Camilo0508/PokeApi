import { POKEMON_API_URL, ONEPIECE_API_URL, DOCENTES_API_URL } from './config.js';

async function pedir(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(90000) });
    return { ok: res.ok, status: res.status, data: res.ok ? await res.json() : null };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

const sinImagenes = ({ images, image, ...resto }) => resto;

// Las listas pueden venir como arreglo o dentro de items/results/data
const comoLista = (data) =>
  Array.isArray(data) ? data : data?.items ?? data?.results ?? data?.data ?? [];

const igual = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

export async function buscar(tipo, nombre) {
  const n = encodeURIComponent(nombre.trim().toLowerCase());

  if (tipo === 'pokemon') {
    const r = await pedir(`${POKEMON_API_URL}/pokemon/${n}`);
    if (r.status === 404) return { encontrado: false };
    if (!r.ok) return { error: true };
    return { encontrado: true, datos: sinImagenes(r.data) };
  }

  if (tipo === 'onepiece') {
    const r = await pedir(`${ONEPIECE_API_URL}/characters?q=${n}&limit=5`);
    if (!r.ok) return { error: true };
    const lista = comoLista(r.data);
    if (lista.length === 0) return { encontrado: false };
    const exacto = lista.find((p) => igual(p.name ?? p.nombre, nombre)) ?? lista[0];
    return { encontrado: true, datos: sinImagenes(exacto) };
  }

  if (tipo === 'docente') {
    const r = await pedir(`${DOCENTES_API_URL}/docentes?buscar=${n}&limit=20`);
    if (!r.ok) return { error: true };
    const lista = comoLista(r.data);
    if (lista.length === 0) return { encontrado: false };
    return { encontrado: true, datos: lista.length === 1 ? lista[0] : lista };
  }

  return { encontrado: false };
}