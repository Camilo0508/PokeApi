"""
Repositorio: decide de dónde salen los datos.

Ahora la base de datos (MongoDB) es la fuente principal:
  1. Se responde con lo que hay guardado.
  2. Si no hay nada guardado y hay internet, se trae de las APIs y se guarda.

La carga inicial de personajes se hace con el comando de consola:
    python -m app.seed --limit 10
"""
import httpx

from . import database as db
from .config import TIMEOUT
from .extra_client import clave, fetch_hakis, get_catalogo
from .onepiece_client import (
    CharacterNotFound,
    fetch_character,
    fetch_image,
    fetch_page,
    fetch_search,
)


async def _agregar_extras(client: httpx.AsyncClient, personaje: dict) -> dict:
    """Completa el personaje con tripulación, fruta, trabajo y hakis de la segunda API."""
    try:
        catalogo = await get_catalogo(client)
        extra = catalogo.get(clave(personaje["name"]))
        if not extra:
            personaje["haki"] = []  # no está en la otra API
            return personaje

        try:
            personaje["haki"] = await fetch_hakis(client, extra["extra_id"])
        except httpx.HTTPError:
            personaje["haki"] = []

        personaje.update(
            crew=extra["crew"],
            fruit=extra["fruit"],
            fruit_type=extra["fruit_type"],
            job=extra["job"],
        )
    except httpx.HTTPError:
        pass  # sin internet para la segunda API: se guarda lo que haya
    return personaje


async def guardar(client: httpx.AsyncClient, personaje: dict, image_url: str | None) -> dict:
    """Completa, guarda y descarga la imagen de un personaje."""
    if not db.has_extras(personaje["id"]):
        personaje = await _agregar_extras(client, personaje)

    db.save_character(personaje)

    if image_url and not db.has_image(personaje["id"]):
        try:
            contenido, tipo = await fetch_image(client, image_url)
            db.save_image(personaje["id"], contenido, tipo)
        except httpx.HTTPError:
            pass  # sin imagen no es grave

    return db.get_character(personaje["id"]) or personaje


async def descargar_pagina(limit: int, page: int) -> list[dict]:
    """Trae una página de la API y la guarda. Lo usa el comando seed."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        encontrados = await fetch_page(client, limit, page)
        return [await guardar(client, personaje, url) for personaje, url in encontrados]


async def list_characters(limit: int, page: int) -> tuple[list[dict], str]:
    guardados = db.list_characters(limit, (page - 1) * limit)
    if guardados:
        return guardados, "local"

    # La base está vacía en esta página: se intenta traer de la API
    try:
        return await descargar_pagina(limit, page), "api"
    except httpx.HTTPError:
        return [], "local"


async def search_characters(texto: str, limit: int) -> tuple[list[dict], str]:
    guardados = db.search_characters(texto, limit)
    if guardados:
        return guardados, "local"

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            encontrados = await fetch_search(client, texto, limit)
            return [await guardar(client, p, url) for p, url in encontrados], "api"
    except httpx.HTTPError:
        return [], "local"


async def get_character(character_id: str) -> tuple[dict | None, str]:
    guardado = db.get_character(character_id)
    if guardado:
        return guardado, "local"

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            personaje, url = await fetch_character(client, character_id)
            return await guardar(client, personaje, url), "api"
    except CharacterNotFound:
        return None, "api"
    except httpx.HTTPError:
        return None, "local"


async def hay_internet() -> bool:
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            await client.head("https://www.onepieceapi.com")
        return True
    except httpx.HTTPError:
        return False
