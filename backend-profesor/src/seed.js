/**
 * Carga docentes de EJEMPLO en la base, para probar la aplicación.
 *
 *   npm run seed
 *
 * Los datos son inventados, para demostración. Los docentes reales se
 * registran desde Swagger (/docs) con POST /docentes?nombre=...
 */
import { initDb, countDocentes, listDocentes, pool } from './database.js';
import { crear } from './docenteService.js';

const EJEMPLOS = [
  {
    nombre: 'Carlos Pérez',
    profesion: 'Ingeniero de Sistemas',
    titulo: 'Magíster en Ingeniería de Software',
    facultad: 'Facultad de Ingeniería',
    cargo: 'Docente de tiempo completo',
    correo: 'carlos.perez@uninpahu.edu.co',
    experiencia: 8,
    resumen:
      'Docente del programa de Ingeniería de Software. Trabaja en desarrollo de aplicaciones ' +
      'móviles y arquitecturas de microservicios. Dirige proyectos de grado relacionados con ' +
      'aplicaciones multiplataforma.',
  },
  {
    nombre: 'Ana Gómez',
    profesion: 'Diseñadora Gráfica',
    titulo: 'Especialista en Experiencia de Usuario',
    facultad: 'Facultad de Comunicación y Diseño',
    cargo: 'Docente de cátedra',
    correo: 'ana.gomez@uninpahu.edu.co',
    experiencia: 5,
    resumen:
      'Orienta las asignaturas de diseño de interfaces y usabilidad. Su trabajo se centra en ' +
      'accesibilidad y en el diseño centrado en el usuario.',
  },
  {
    nombre: 'Luis Martínez',
    profesion: 'Administrador de Empresas',
    titulo: 'Magíster en Gestión de Proyectos',
    facultad: 'Facultad de Ciencias Económicas y Administrativas',
    cargo: 'Coordinador de programa',
    correo: 'luis.martinez@uninpahu.edu.co',
    experiencia: 12,
    resumen:
      'Coordina el programa de Administración y acompaña los semilleros de emprendimiento ' +
      'de la institución.',
  },
];

await initDb();

if ((await countDocentes()) > 0) {
  console.log('La base ya tiene docentes; no se agrega nada.');
  console.log((await listDocentes({ buscar: '', limit: 50, offset: 0 })).map((d) => `  · ${d.nombre}`).join('\n'));
} else {
  for (const docente of EJEMPLOS) {
    const guardado = await crear(docente);
    console.log(`  ✓ ${guardado.nombre} (id ${guardado.id})`);
  }
  console.log(`\nListo. En la base hay ${await countDocentes()} docentes.`);
}

await pool.end();
