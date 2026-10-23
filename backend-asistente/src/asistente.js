import { detectar } from './buscar.js';
import { elegirIa } from './ia/index.js';

const SISTEMA = `Eres el asistente de una aplicación de pokémon, personajes de One Piece y docentes.
El backend ya comprobó que el registro de abajo SÍ existe en nuestra base de datos.

Reglas:
1. Primero usa los datos del REGISTRO: son la fuente principal y van siempre primero.
2. POKÉMON y ONE PIECE: si te preguntan algo de ESE MISMO pokémon o personaje que no está en el registro,
   NO respondas que no está: respóndelo con lo que sabes del anime, el manga, las series, las películas o
   los videojuegos (por ejemplo: en qué capítulos aparece, quién es su entrenador, su historia, sus peleas,
   curiosidades, evoluciones, debilidades). Empieza esa parte con
   "📚 Información general (no está en nuestra base de datos):" para que se note la diferencia.
   Ejemplo: "¿Quién es el entrenador de Pikachu?" → explica que el más famoso es Ash Ketchum en el anime.
3. DOCENTES: usa SOLO los datos del registro, porque es una persona real y no debes inventar ni suponer
   nada sobre ella. Solo en este caso, si el dato no está, responde: "Ese dato no está en nuestra base de datos."
4. Si no sabes algo con seguridad, dilo; no inventes.
5. Si la pregunta no trata sobre este registro, responde: "Solo puedo responder sobre los pokémon,
   personajes de One Piece y docentes de nuestra base de datos."
6. La altura de los pokémon está en decímetros y el peso en hectogramos: conviértelos a metros y kilogramos.
7. Si piden información general ("¿qué sabes de...?", "¿quién es...?"), haz una presentación completa pero
   sin listas enormes: de los movimientos menciona como máximo 10 y di cuántos tiene en total.
8. Formato: texto plano para un chat de celular. NO uses markdown (nada de **, # ni tablas).
   Separa por secciones con un emoji al inicio y usa "•" para las listas.
9. Responde siempre en español, de forma amable y clara.`;

/**
 * @param mensajes la conversación
 * @param opciones.ia la IA que escogió la app (groq, gemini, claude, openai, deepseek)
 * @param opciones.esperaMs cuánto espera la app; la IA debe terminar antes
 */
export async function responder(mensajes, { ia, esperaMs }) {
  // 1. El backend busca en el texto el nombre de un registro de las bases de datos, sin IA
  const resultado = await detectar(mensajes);

  // 2. Varios con el mismo nombre: se pide que sea más específico
  if (resultado.varios) {
    return `Encontré varios con ese nombre:\n${resultado.varios.map((n) => `• ${n}`).join('\n')}\n\n¿De cuál me hablas? Escribe el nombre completo.`;
  }

  // 3. No existe: se responde aquí y la IA no se consulta
  if (!resultado.encontrado) {
    if (resultado.caidos.length === 3) {
      return '⏳ No pude conectarme con las bases de datos (pokémon, One Piece y docentes). Si están en Render pueden estar despertando: intenta de nuevo en un minuto.';
    }
    let aviso = resultado.caidos.length
      ? `\n\n(No pude revisar ${resultado.caidos.join(' ni ')}: el servicio no respondió, intenta de nuevo en un momento.)`
      : '';
    if (resultado.vacias?.length) {
      aviso += `\n\n(El servicio de ${resultado.vacias.join(' y ')} respondió sin ningún registro: revisa su URL en el asistente.)`;
    }
    return `Ese personaje o persona no está en nuestra base de datos. Puedes preguntarme por los pokémon, los personajes de One Piece o los docentes que tenemos guardados.${aviso}`;
  }

  // 4. Sí existe: la IA elegida responde con ese registro
  const sistema = `${SISTEMA}\n\nREGISTRO (${resultado.categoria}: ${resultado.nombre}):\n${JSON.stringify(resultado.datos)}`;
  // Solo la conversación sobre este registro, para que no se mezcle con temas anteriores
  const conversacion = mensajes.slice(resultado.desde);
  const elegida = elegirIa(ia);
  console.log(`Pregunta sobre ${resultado.nombre} con ${elegida.nombre}`);
  return elegida.preguntar(sistema, conversacion, esperaMs);
}
