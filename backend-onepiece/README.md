# Microservicio One Piece (Node + Express + SQLite)

Segundo microservicio del proyecto. Corre en el **puerto 8001**, aparte del de
pokémon (8000). Si hay internet consulta https://www.onepieceapi.com y guarda los
personajes y sus imágenes en `onepiece.db`; si no hay internet, responde con lo guardado.

## Ejecutar
```bash
npm install
npm run dev
```

## Endpoints
| Método | Ruta                          | Descripción                     |
|--------|-------------------------------|---------------------------------|
| GET    | `/characters?limit=20&page=1` | Lista paginada                  |
| GET    | `/characters?q=luffy`         | Búsqueda por nombre             |
| GET    | `/characters/{id}`            | Un personaje                    |
| GET    | `/images/{id}`                | Imagen guardada                 |
| GET    | `/health`                     | ¿Hay internet? ¿Cuántos guardados? |

Cada respuesta trae `"source": "api"` o `"source": "local"`.
