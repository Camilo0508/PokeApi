# Microservicio Pokémon — Node + Express + PostgreSQL

Microservicio **relacional** del proyecto. Cuatro tablas con llaves foráneas:

```
pokemon 1──< pokemon_move
        1──< pokemon_ability
        1──< pokemon_image
```

El otro microservicio (One Piece) está en `../backend-onepiece`: Python + FastAPI + MongoDB.

## Ejecutar en local
```bash
npm install
cp .env.example .env          # ajusta DATABASE_URL si hace falta
npm run dev
```
Documentación interactiva (Swagger): http://localhost:8000/docs

## Cargar pokémon desde la consola
```bash
npm run seed                    # carga 10
npm run seed -- --limit 25      # carga 25
npm run seed -- --offset 10     # los 10 siguientes
```

## Endpoints
| Método | Ruta                          | Descripción                        |
|--------|-------------------------------|------------------------------------|
| GET    | `/pokemon?limit=20&offset=0`  | Lista paginada                     |
| GET    | `/pokemon/{nombre o id}`      | Un pokémon                         |
| GET    | `/images/{id}/{0,1,2}`        | Gif, artwork y sprite              |
| GET    | `/health`                     | Internet, cuántos guardados, base  |
| GET    | `/docs`                       | Swagger: documentación y pruebas   |
| GET    | `/openapi.json`               | Especificación OpenAPI en JSON     |

Las consultas se responden **solo con lo que hay en PostgreSQL**: el servicio no consulta
la PokeAPI. Si un pokémon no está guardado, responde 404 "Este pokémon no se encuentra en
la base de datos". Los datos entran con `npm run seed` o insertándolos a mano en la base.

`"source": "local"` = salió de PostgreSQL.
