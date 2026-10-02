"""
Segunda fuente: api-onepiece.com.
De aquí salen la tripulación, la fruta del diablo, el trabajo y los hakis,
que la API principal no tiene. Los dos catálogos se cruzan por el nombre.
"""
import re
import unicodedata

import httpx

from .config import EXTRA_URL, TIMEOUT

_catalogo: dict[str, dict] | None = None


def clave(nombre: str) -> str:
    """'Monkey D. Luffy' y 'Monkey D Luffy' deben dar la misma clave."""
    sin_tildes = unicodedata.normalize("NFD", nombre).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", sin_tildes.lower())


async def get_catalogo(client: httpx.AsyncClient) -> dict[str, dict]:
    global _catalogo
    if _catalogo is not None:
        return _catalogo

    res = await client.get(f"{EXTRA_URL}/characters/en")
    res.raise_for_status()

    _catalogo = {}
    for p in res.json():
        fruta = p.get("fruit") or {}
        _catalogo[clave(p["name"])] = {
            "extra_id": p["id"],
            "crew": (p.get("crew") or {}).get("name"),
            "fruit": fruta.get("name"),
            "fruit_type": fruta.get("type"),
            "job": p.get("job"),
        }
    return _catalogo


async def fetch_hakis(client: httpx.AsyncClient, extra_id: int) -> list[dict]:
    res = await client.get(f"{EXTRA_URL}/hakis/en/character/{extra_id}")
    res.raise_for_status()
    return [{"name": h["haki"]["name"], "awaken": bool(h["haki"].get("awaken"))} for h in res.json()]
