"""Microservicio de One Piece: Python + FastAPI + MongoDB (base NO relacional)."""
from fastapi import FastAPI, File, HTTPException, Path, Query, Request, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from . import database as db
from . import repository
from .schemas import (
    CharacterListResponse,
    CharacterNuevo,
    CharacterResponse,
    ErrorResponse,
    HealthResponse,
)

DESCRIPCION = """
Microservicio en Python + FastAPI con MongoDB (base NO relacional).

Las consultas se responden **únicamente con lo que hay en MongoDB**.
El servicio no consulta las APIs de One Piece: si un personaje no está guardado,
la búsqueda devuelve vacío y el detalle responde 404.

Los datos se cargan a propósito, desde la consola con `python -m app.seed`
o insertándolos directamente en la base.

`"source": "local"` = salió de MongoDB.
"""

# Swagger queda en /docs y el JSON crudo en /openapi.json
app = FastAPI(
    title="One Piece Service",
    description=DESCRIPCION,
    version="1.0.0",
    openapi_tags=[
        {"name": "Personajes", "description": "Consulta y búsqueda de los personajes guardados en MongoDB"},
        {"name": "Imágenes", "description": "Imágenes guardadas en MongoDB"},
        {"name": "Alta manual", "description": "Insertar personajes e imágenes a mano, sin las APIs externas"},
        {"name": "Estado", "description": "Salud del servicio"},
    ],
)

# Permite que la app (celular o navegador) consulte este servicio
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def con_imagen(personaje: dict, request: Request) -> dict:
    base = str(request.base_url).rstrip("/")
    return {**personaje, "image": f"{base}/images/{personaje['id']}"}


@app.get("/", include_in_schema=False)
def inicio():
    return RedirectResponse("/docs")


@app.get("/health", response_model=HealthResponse, tags=["Estado"],
         summary="Cuántos personajes hay guardados y estado de la base")
def health():
    return HealthResponse(
        internet=True,
        saved_characters=db.count_characters(),
        database="MongoDB" if db.ping() else "sin conexión",
    )


@app.get("/characters", response_model=CharacterListResponse, tags=["Personajes"],
         summary="Lista paginada o búsqueda por nombre, dentro de la base")
async def list_characters(
    request: Request,
    limit: int = Query(20, ge=1, le=100, description="Cuántos traer (máximo 100)"),
    page: int = Query(1, ge=1, description="Número de página, empieza en 1"),
    q: str = Query("", description="texto a buscar en el nombre"),
):
    texto = q.strip()
    if texto:
        results, source = repository.search_characters(texto, limit)
    else:
        results, source = repository.list_characters(limit, page)

    return CharacterListResponse(source=source, results=[con_imagen(p, request) for p in results])


@app.get("/characters/{character_id}", response_model=CharacterResponse, tags=["Personajes"],
         summary="Un personaje guardado, por id",
         responses={404: {"model": ErrorResponse,
                          "description": "No está guardado en la base de datos"}})
async def get_character(
    request: Request,
    character_id: str = Path(description="Id del personaje", examples=["1"]),
):
    personaje, source = repository.get_character(character_id)
    if personaje is None:
        raise HTTPException(
            status_code=404, detail="Este personaje no se encuentra en la base de datos"
        )
    return CharacterResponse(source=source, character=con_imagen(personaje, request))


@app.post(
    "/characters",
    response_model=CharacterResponse,
    status_code=201,
    tags=["Alta manual"],
    summary="Insertar un personaje a mano",
    description=(
        "Guarda el personaje en MongoDB. Si el id ya existe, lo actualiza.\n\n"
        "La imagen se sube aparte, con PUT /characters/{id}/image."
    ),
)
def crear_character(nuevo: CharacterNuevo, request: Request):
    personaje = nuevo.model_dump()
    db.save_character(personaje)
    guardado = db.get_character(personaje["id"])
    return CharacterResponse(source="local", character=con_imagen(guardado, request))


@app.put(
    "/characters/{character_id}/image",
    tags=["Alta manual"],
    summary="Subir la imagen de un personaje",
    description="El personaje debe existir antes (POST /characters).",
    responses={404: {"model": ErrorResponse, "description": "El personaje no existe todavía"}},
)
async def subir_imagen(
    character_id: str = Path(description="Id del personaje"),
    archivo: UploadFile = File(description="Archivo de imagen (png, jpg, webp, gif)"),
):
    if db.get_character(character_id) is None:
        raise HTTPException(status_code=404, detail="Primero crea el personaje con POST /characters")

    contenido = await archivo.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo llegó vacío")

    db.save_image(character_id, contenido, archivo.content_type or "image/png")
    return {"detail": "Imagen guardada", "bytes": len(contenido)}


@app.get("/images/{character_id}", tags=["Imágenes"], summary="Imagen de un personaje",
         response_class=Response,
         responses={200: {"content": {"image/png": {}, "image/jpeg": {}, "image/webp": {}},
                          "description": "La imagen"},
                    404: {"model": ErrorResponse, "description": "Imagen no guardada"}})
def get_image(character_id: str = Path(description="Id del personaje", examples=["1"])):
    imagen = db.get_image(character_id)
    if imagen is None:
        raise HTTPException(status_code=404, detail="Imagen no guardada")
    contenido, tipo = imagen
    return Response(content=contenido, media_type=tipo)
