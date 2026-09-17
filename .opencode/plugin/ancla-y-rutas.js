import fs from 'node:fs';
import path from 'node:path';

/**
 * Dos guardias que corren ANTES de que la herramienta se ejecute.
 *
 * opencode dispara `tool.execute.before` justo antes de invocar la herramienta,
 * y si el hook lanza, la herramienta no llega a correr. Ese es el único punto
 * del sistema donde se puede parar una llamada condenada: el orquestador lanza
 * opencode como proceso y solo ve el flujo de eventos DESPUÉS, así que desde
 * fuera no hay nada que interceptar.
 *
 * Lo que se para aquí es una sola cosa, mirada desde dos ángulos: el actor
 * reteclea literales largos de memoria en vez de copiarlos, y un solo carácter
 * perdido invalida la llamada entera.
 *
 *   · Rutas — 942 llamadas con ruta en los logs del proyecto, todas absolutas,
 *     todas con 58 caracteres de prefijo tecleados a mano. 41 lecturas perdidas
 *     por un segmento caído: `ciclo\com\` por `ciclo\comun\` (V-010),
 *     `OneDrive\OneDrive\` (V-008), `ciclo\app\fase-1\` (V-002).
 *
 *   · Anclas de parche — 15 de 23 `apply_patch` fallidos fueron "Failed to find
 *     expected lines", todos en el turno de cierre. En V-010 el ancla ni siquiera
 *     era media línea del archivo: era una FUSIÓN de las líneas 315 y 347 de la
 *     bitácora, reconstruida de memoria. Como `apply_patch` rechaza el parche
 *     entero, esos 15 se llevaron por delante unas 35 ediciones de otros archivos
 *     que sí encajaban.
 *
 * Ninguno de los dos guardias corrige la llamada por su cuenta. Devuelven el
 * dato que faltaba —la ruta real, la línea real— y dejan que el actor reintente
 * sabiendo. Un arreglo silencioso convertiría un fallo visible en uno invisible.
 */

/** Cuánto se parecen dos líneas, por prefijo común. Barato y suficiente. */
function parecido(a, b) {
  const x = a.trim();
  const y = b.trim();
  if (!x || !y) return 0;
  let i = 0;
  while (i < x.length && i < y.length && x[i] === y[i]) i += 1;
  return i / Math.max(x.length, y.length);
}

/** La línea del archivo que más se parece a la que el actor se inventó. */
function lineaMasParecida(lineas, buscada) {
  let mejor = { texto: '', numero: 0, puntuacion: 0 };
  lineas.forEach((texto, i) => {
    const puntuacion = parecido(texto, buscada);
    if (puntuacion > mejor.puntuacion) mejor = { texto, numero: i + 1, puntuacion };
  });
  return mejor.puntuacion >= 0.3 ? mejor : null;
}

/** Los bloques de un parche: un archivo y las líneas que dice que ya están ahí. */
function bloquesDelParche(patchText) {
  const bloques = [];
  let actual = null;
  for (const linea of String(patchText).split(/\r?\n/)) {
    const cabecera = linea.match(/^\*\*\* (Update|Add|Delete) File: (.+)$/);
    if (cabecera) {
      actual = { accion: cabecera[1], archivo: cabecera[2].trim(), esperadas: [] };
      bloques.push(actual);
      continue;
    }
    if (!actual || actual.accion !== 'Update') continue;
    if (linea.startsWith('@@') || linea.startsWith('***')) continue;
    // Contexto y borrados son lo que el parche AFIRMA que hay en el archivo.
    // Las altas (`+`) no se comprueban: todavía no existen.
    if (linea.startsWith(' ') || linea.startsWith('-')) {
      const texto = linea.slice(1);
      if (texto.trim()) actual.esperadas.push(texto);
    }
  }
  return bloques;
}

/**
 * El parche afirma cosas sobre archivos. Aquí se comprueban contra el disco.
 *
 * No reimplementa el emparejador de `apply_patch` —eso exige la secuencia
 * contigua— sino algo más flojo y más útil: que cada línea que el parche da por
 * existente exista EN ALGUNA PARTE del archivo. Es lo que caza el fallo real, que
 * es inventarse la línea, y no produce falsos positivos por un hunk desplazado.
 */
export function revisarParche(patchText, leer = (p) => fs.readFileSync(p, 'utf8')) {
  const bloques = bloquesDelParche(patchText);
  const problemas = [];

  const archivos = [...new Set(bloques.map((b) => b.archivo))];
  if (archivos.length > 1) {
    problemas.push(
      `Este parche toca ${archivos.length} archivos a la vez: ${archivos.map((a) => path.basename(a)).join(', ')}.\n` +
        'apply_patch es todo o nada: si UNA sola ancla no encaja, se rechaza el parche ENTERO, incluidos los\n' +
        'cambios de los demás archivos que sí encajaban. En este proyecto eso ya tiró unas 35 ediciones buenas\n' +
        'en 15 turnos, siempre al cerrar. **Manda un parche por archivo.**',
    );
  }

  for (const bloque of bloques) {
    if (bloque.accion !== 'Update') continue;
    let contenido;
    try {
      contenido = leer(bloque.archivo);
    } catch {
      problemas.push(
        `No se puede leer \`${bloque.archivo}\`. Comprueba la ruta antes de parchear: si la compusiste a mano,\n` +
          'localízala con `glob` y copia la que te devuelva.',
      );
      continue;
    }
    const lineas = contenido.split(/\r?\n/);
    const presentes = new Set(lineas);
    for (const esperada of bloque.esperadas) {
      if (presentes.has(esperada)) continue;
      const cerca = lineaMasParecida(lineas, esperada);
      problemas.push(
        `En \`${bloque.archivo}\` esta línea del parche NO existe en el archivo:\n` +
          `    ${esperada.trim().slice(0, 160)}\n` +
          (cerca
            ? `Lo más parecido está en la línea ${cerca.numero}, y no es igual:\n    ${cerca.texto.trim().slice(0, 160)}\n` +
              'Cópiala TAL CUAL desde el archivo. apply_patch compara líneas completas, carácter a carácter.'
            : 'No hay nada parecido en el archivo. Vuelve a leerlo antes de anclar: la línea que recuerdas no está.'),
      );
      break; // Una por archivo basta: el actor tiene que releer de todas formas.
    }
  }
  return problemas;
}

/**
 * La ruta no existe, pero hay una casi idéntica al lado.
 *
 * Devuelve la candidata para decírsela, nunca para sustituirla por su cuenta.
 * Corregir la llamada en silencio escondería el fallo justo cuando por fin se
 * puede ver, y el actor seguiría creyendo que compone bien.
 */
export function rutaParecida(ruta, listar = (d) => fs.readdirSync(d), existe = (p) => fs.existsSync(p)) {
  if (existe(ruta)) return null;
  const carpeta = path.dirname(ruta);
  const nombre = path.basename(ruta);

  // La carpeta padre tampoco existe: el segmento perdido está ahí, no en el
  // nombre del archivo. Es la forma de `ciclo\com\` por `ciclo\comun\`.
  if (!existe(carpeta)) {
    const abuelo = path.dirname(carpeta);
    if (!existe(abuelo)) return null;
    let mejor = null;
    for (const entrada of listar(abuelo)) {
      const p = parecido(entrada, path.basename(carpeta));
      if (p > 0.5 && (!mejor || p > mejor.p)) mejor = { p, ruta: path.join(abuelo, entrada, nombre) };
    }
    return mejor && existe(mejor.ruta) ? mejor.ruta : null;
  }

  let mejor = null;
  for (const entrada of listar(carpeta)) {
    const p = parecido(entrada, nombre);
    if (p > 0.5 && (!mejor || p > mejor.p)) mejor = { p, ruta: path.join(carpeta, entrada) };
  }
  return mejor ? mejor.ruta : null;
}

export default (async () => ({
  'tool.execute.before': async (input, output) => {
    const args = output?.args ?? {};

    if (input.tool === 'apply_patch' && typeof args.patchText === 'string') {
      const problemas = revisarParche(args.patchText);
      if (problemas.length > 0) {
        throw new Error(
          'El parche se ha parado ANTES de ejecutarse, así que no has perdido ningún cambio: el archivo está\n' +
            'como estaba y puedes reenviarlo corregido.\n\n' +
            problemas.join('\n\n'),
        );
      }
    }

    const ruta = typeof args.filePath === 'string' ? args.filePath : typeof args.path === 'string' ? args.path : null;
    if (ruta && path.isAbsolute(ruta)) {
      const candidata = rutaParecida(ruta);
      if (candidata) {
        throw new Error(
          `\`${ruta}\` no existe. La ruta buena es casi seguro:\n\n    ${candidata}\n\n` +
            'Se te ha parado antes de gastar la llamada. Copia esa ruta tal cual — no la reconstruyas de memoria,\n' +
            'que es de donde sale este fallo.',
        );
      }
    }
  },
}));
