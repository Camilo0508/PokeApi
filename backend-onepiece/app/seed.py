"""
Carga personajes en MongoDB desde la consola.

    python -m app.seed                 # carga 10 (los de la primera página)
    python -m app.seed --limit 25      # carga 25
    python -m app.seed --page 2        # carga la siguiente página
"""
import argparse
import asyncio

from . import database as db
from . import repository


async def main() -> None:
    parser = argparse.ArgumentParser(description="Carga personajes de One Piece en MongoDB")
    parser.add_argument("--limit", type=int, default=10, help="cuántos personajes cargar")
    parser.add_argument("--page", type=int, default=1, help="página de la API")
    args = parser.parse_args()

    print(f"Descargando {args.limit} personajes (página {args.page})...")
    personajes = await repository.descargar_pagina(args.limit, args.page)

    for p in personajes:
        print(f"  ✓ {p['name']}")

    print(f"\nListo. En la base hay {db.count_characters()} personajes.")


if __name__ == "__main__":
    asyncio.run(main())
