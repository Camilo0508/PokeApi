"""Configuración del microservicio de One Piece."""
import os

from dotenv import load_dotenv

load_dotenv()

# Base de datos NO relacional
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27018")
MONGODB_DB = os.getenv("MONGODB_DB", "onepiece")

# APIs externas
ONEPIECE_URL = "https://www.onepieceapi.com/api/characters"
EXTRA_URL = "https://api.api-onepiece.com/v2"  # de aquí salen fruta, tripulación y hakis

TIMEOUT = 8.0
PORT = int(os.getenv("PORT", "8001"))
