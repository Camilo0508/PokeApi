"""Cliente de la API principal de One Piece (nombre, imagen, recompensa, ficha)."""
import httpx

from .config import ONEPIECE_URL, TIMEOUT


class CharacterNotFound(Exception):
    pass


def _extraer(data: dict, orden: int | None = None) -> tuple[dict, str | None]:
    """Del JSON de la API nos quedamos solo con lo que muestra la app."""
    recompensas = data.get("bounties") or []
    activa = next((b for b in recompensas if b.get("is_active")), recompensas[0] if recompensas else None)
    nombre = data.get("name") or {}
    cumple = (data.get("birthday") or {}).get("label") or {}

    personaje = {
        "id": data["id"],
        "name": nombre.get("en") or "Sin nombre",
        "japones": nombre.get("jp"),
        "age": data.get("age"),
        "height": data.get("height"),
        "status": data.get("status"),
        "blood_type": data.get("blood_type"),
        "birthday": cumple.get("en"),
        "bounty": activa.get("amount") if activa else None,
        "orden": orden,
    }
    return personaje, data.get("image_url")


async def fetch_page(client: httpx.AsyncClient, limit: int, page: int) -> list[tuple[dict, str | None]]:
    # La API pagina con ?limit=&page= (ignora offset) y el máximo por página es 100
    res = await client.get(ONEPIECE_URL, params={"limit": limit, "page": page})
    res.raise_for_status()
    return [_extraer(p, (page - 1) * limit + i) for i, p in enumerate(res.json())]


async def fetch_search(client: httpx.AsyncClient, texto: str, limit: int) -> list[tuple[dict, str | None]]:
    res = await client.get(ONEPIECE_URL, params={"q": texto, "limit": limit})
    res.raise_for_status()
    return [_extraer(p) for p in res.json()]


async def fetch_character(client: httpx.AsyncClient, character_id: str) -> tuple[dict, str | None]:
    res = await client.get(f"{ONEPIECE_URL}/{character_id}")
    if res.status_code == 404:
        raise CharacterNotFound(character_id)
    res.raise_for_status()
    return _extraer(res.json())


async def fetch_image(client: httpx.AsyncClient, url: str) -> tuple[bytes, str]:
    res = await client.get(url)
    res.raise_for_status()
    return res.content, res.headers.get("content-type", "image/webp")
