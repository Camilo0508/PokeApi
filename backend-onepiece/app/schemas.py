"""Forma de los datos que devuelve el servicio."""
from typing import Literal

from pydantic import BaseModel

# Siempre "local": los datos salen de MongoDB. "api" queda por compatibilidad.
Source = Literal["api", "local"]


class Haki(BaseModel):
    name: str
    awaken: bool


class Character(BaseModel):
    id: str
    name: str
    japones: str | None = None
    age: int | None = None
    height: int | None = None
    status: str | None = None
    blood_type: str | None = None
    birthday: str | None = None
    bounty: int | None = None
    crew: str | None = None
    fruit: str | None = None
    fruit_type: str | None = None
    job: str | None = None
    haki: list[Haki] = []
    image: str = ""


class CharacterListResponse(BaseModel):
    source: Source
    results: list[Character]


class CharacterResponse(BaseModel):
    source: Source
    character: Character


class HealthResponse(BaseModel):
    internet: bool
    saved_characters: int
    database: str


class ErrorResponse(BaseModel):
    detail: str
