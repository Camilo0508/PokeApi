"""
Repositorio: los datos salen ÚNICAMENTE de MongoDB.

El servicio NO consulta las APIs de One Piece por su cuenta. Si un personaje no
está guardado, se responde que no está en la base de datos.

Los datos se cargan a propósito, con el comando:
    python -m app.seed --limit 10
(o insertándolos a mano en la base).
"""
import httpx

from . import database as db
from .config import TIMEOUT
from .extra_client import clave, fetch_hakis, get_catalogo
from .onepiece_client import fetch_image, fetch_page


# ---------- Consultas: solo base de datos ----------

def list_characters(limit: int, page: int) -> tuple[list[dict], str]:
    return db.list_characters(limit, (page - 1) * limit), "local"


def search_characters(texto: str, limit: int) -> tuple[list[dict], str]:
    return db.search_characters(texto, limit), "local"


def get_character(character_id: str) -> tuple[dict | None, str]:
    return db.get_character(character_id), "local"


# ---------- Carga manual: solo la usa el comando seed ----------

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
        pass  # si falla la segunda API, se guarda lo que haya
    return personaje


async def guardar(client: httpx.AsyncClient, personaje: dict, image_url: str | None) -> dict:
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


async def hay_internet() -> bool:
    """Queda disponible por si se necesita, pero ya no se usa en las consultas."""
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            await client.head("https://www.onepieceapi.com")
        return True
    except httpx.HTTPError:
        return False


async def descargar_pagina(limit: int, page: int) -> list[dict]:
    """Trae una página de la API y la guarda. Lo usa el comando seed."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        encontrados = await fetch_page(client, limit, page)
        return [await guardar(client, personaje, url) for personaje, url in encontrados]
