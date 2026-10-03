# Microservicio de Docentes Uninpahu — Node **sin Express**

Tercer microservicio del proyecto. Cumple con ser **agnóstico**: usa únicamente el
módulo `node:http` que trae Node, sin Express ni ningún framework web. El
enrutamiento, el CORS y la página de Swagger están hechos a mano.

Los datos entran por **path params** (`/docentes/1`) y **query params**
(`?nombre=Carlos`). **No se usa body en ninguna petición.**

Base de datos: **PostgreSQL en la nube** (la misma de Render, con su tabla `docente`).

## Ejecutar
```bash
npm install
cp .env.example .env     # pon la External Database URL de Render
npm run dev              # http://localhost:8002
npm run seed             # carga 3 docentes de ejemplo
```
Documentación: http://localhost:8002/docs

## Endpoints
| Método | Ruta | Parámetros |
|--------|------|------------|
| GET    | `/docentes` | query: `buscar`, `limit`, `page` |
| GET    | `/docentes/{id}` | path: `id` |
| POST   | `/docentes` | query: `nombre` (obligatorio), `profesion`, `titulo`, `universidad`, `facultad`, `cargo`, `correo`, `experiencia`, `resumen`, `foto` |
| PUT    | `/docentes/{id}` | path: `id` + los query params que quieras cambiar |
| DELETE | `/docentes/{id}` | path: `id` |
| GET    | `/health` · `/docs` · `/openapi.json` | — |

Ejemplo de alta sin body:
```
POST /docentes?nombre=Carlos%20Pérez&profesion=Ingeniero%20de%20Sistemas&experiencia=8
```

## Las capas
| Capa | Archivo | De qué sabe |
|------|---------|-------------|
| Transporte | `src/server.js` | HTTP puro (`node:http`) |
| Lógica **agnóstica** | `src/docenteService.js` | de nada externo |
| Datos | `src/database.js` | PostgreSQL |
| Documentación | `src/openapi.js` | OpenAPI 3 + Swagger UI por CDN |
