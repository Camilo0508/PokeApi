import { DataSource } from '@/types/pokemon';

export interface Haki {
  name: string;
  awaken: boolean; // si lo tiene despertado
}

export interface Character {
  id: string;
  name: string;
  japones: string | null;
  age: number | null;
  height: number | null; // en centímetros
  status: string | null;
  blood_type: string | null;
  birthday: string | null;
  bounty: number | null; // recompensa en berries
  crew: string | null; // tripulación
  fruit: string | null; // fruta del diablo
  fruit_type: string | null; // Paramecia, Zoan, Logia...
  job: string | null;
  haki: Haki[];
  image: string;
}

export interface CharacterListResponse {
  source: DataSource;
  results: Character[];
}

export interface CharacterResponse {
  source: DataSource;
  character: Character;
}
