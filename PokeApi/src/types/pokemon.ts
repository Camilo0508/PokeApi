// "api" = el backend lo trajo de la PokeAPI, "local" = de la base de datos SQLite
export type DataSource = 'api' | 'local';

export interface Pokemon {
  id: number;
  name: string;
  height: number; // decímetros
  weight: number; // hectogramos
  moves: string[]; // todos los movimientos
  image: string;    // la primera imagen (gif), para las tarjetas
  images: string[]; // las tres: gif animado, artwork oficial y sprite clásico
  abilities: string[]; // todas las habilidades
  types: string[]; // fuego, planta, agua... (de 1 a 2)
}

export interface PokemonResponse {
  source: DataSource;
  pokemon: Pokemon;
}

export interface PokemonListResponse {
  source: DataSource;
  results: Pokemon[];
}

export interface HealthResponse {
  internet: boolean;
  saved_pokemon: number;
  database: string; // PostgreSQL
}
