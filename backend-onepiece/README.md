# Microservicio One Piece — Python + FastAPI + MongoDB

Microservicio **no relacional** del proyecto. Cada personaje es un documento de
MongoDB, con sus hakis y su imagen dentro del mismo documento.

El otro microservicio (Pokémon) está en `../backend`: Node + Express + PostgreSQL.

## Ejecutar en local
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # ajusta MONGODB_URI si hace falta
uvicorn app.main:app --reload --port 8001
```
Documentación interactiva: http://localhost:8001/docs

## Cargar personajes desde la consola
```bash
python -m app.seed                 # carga 10
python -m app.seed --limit 25      # carga 25
python -m app.seed --page 2        # la siguiente página
```

## Endpoints
| Método | Ruta                          | Descripción                        |
|--------|-------------------------------|------------------------------------|
| GET    | `/characters?limit=20&page=1` | Lista paginada                     |
| GET    | `/characters?q=luffy`         | Búsqueda por nombre                |
| GET    | `/characters/{id}`            | Un personaje                       |
| GET    | `/images/{id}`                | Imagen guardada en MongoDB         |
| GET    | `/health`                     | Internet, cuántos guardados, base  |
| GET    | `/docs`                       | Swagger: documentación y pruebas   |
| GET    | `/openapi.json`               | Especificación OpenAPI en JSON     |

Las consultas se responden **solo con lo que hay en MongoDB**: el servicio no consulta las
APIs de One Piece. Si un personaje no está guardado, la búsqueda sale vacía y el detalle
responde 404. Los datos entran con `python -m app.seed` o insertándolos a mano en la base.

`"source": "local"` = salió de MongoDB.

## Fuentes de datos (solo se usan al cargar con `seed`)
- `onepieceapi.com`: nombre, imagen, recompensa, edad, estatura, cumpleaños.
- `api-onepiece.com`: tripulación, fruta del diablo, trabajo y hakis (se cruzan por nombre).
