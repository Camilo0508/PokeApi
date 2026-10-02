"""
Base de datos NO relacional (MongoDB).

Cada personaje es un documento; los hakis van dentro como una lista,
sin necesidad de otra tabla como pasaría en una base relacional.
"""
from pymongo import ASCENDING, MongoClient
from bson import Binary

from .config import MONGODB_DB, MONGODB_URI

_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=8000)
_db = _client[MONGODB_DB]
characters = _db["characters"]

# Índices: uno para ordenar la lista y otro para buscar por nombre
characters.create_index([("orden", ASCENDING)])
characters.create_index([("name", ASCENDING)])


def save_character(personaje: dict) -> None:
    """Guarda o actualiza el documento sin borrar la imagen ya descargada."""
    documento = {k: v for k, v in personaje.items() if k != "id"}
    characters.update_one({"_id": personaje["id"]}, {"$set": documento}, upsert=True)


def save_image(character_id: str, contenido: bytes, tipo: str) -> None:
    characters.update_one(
        {"_id": character_id},
        {"$set": {"image_data": Binary(contenido), "image_type": tipo}},
    )


def has_image(character_id: str) -> bool:
    return characters.count_documents({"_id": character_id, "image_data": {"$ne": None}}) > 0


def has_extras(character_id: str) -> bool:
    return characters.count_documents({"_id": character_id, "haki": {"$exists": True}}) > 0


# Al leer no traemos la imagen (pesa) ni los campos internos
SIN_IMAGEN = {"image_data": 0, "image_type": 0}


def _to_character(doc: dict | None) -> dict | None:
    if not doc:
        return None
    doc["id"] = doc.pop("_id")
    doc.setdefault("haki", [])
    return doc


def get_character(character_id: str) -> dict | None:
    return _to_character(characters.find_one({"_id": character_id}, SIN_IMAGEN))


def list_characters(limit: int, skip: int) -> list[dict]:
    cursor = characters.find({}, SIN_IMAGEN).sort("orden", ASCENDING).skip(skip).limit(limit)
    return [_to_character(doc) for doc in cursor]  # type: ignore[misc]


def search_characters(texto: str, limit: int) -> list[dict]:
    # $regex con "i" = búsqueda sin distinguir mayúsculas, el equivalente al LIKE de SQL
    cursor = (
        characters.find({"name": {"$regex": texto, "$options": "i"}}, SIN_IMAGEN)
        .sort("orden", ASCENDING)
        .limit(limit)
    )
    return [_to_character(doc) for doc in cursor]  # type: ignore[misc]


def get_image(character_id: str) -> tuple[bytes, str] | None:
    doc = characters.find_one({"_id": character_id}, {"image_data": 1, "image_type": 1})
    if not doc or not doc.get("image_data"):
        return None
    return bytes(doc["image_data"]), doc.get("image_type", "image/webp")


def count_characters() -> int:
    return characters.count_documents({})


def ping() -> bool:
    try:
        _client.admin.command("ping")
        return True
    except Exception:
        return False
