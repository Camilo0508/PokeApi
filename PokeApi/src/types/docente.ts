export interface Docente {
  id: number;
  nombre: string;
  profesion: string | null;
  titulo: string | null;
  universidad: string;
  facultad: string | null;
  cargo: string | null;
  correo: string | null;
  experiencia: number | null; // años
  resumen: string | null;     // texto largo, se ve en "Ver más"
  foto: string | null;
}

export interface DocenteListResponse {
  source: string;
  results: Docente[];
}

export interface DocenteResponse {
  source: string;
  docente: Docente;
}

// Lo que se manda al crear o editar (todo menos el id)
export type DocenteDatos = Omit<Docente, 'id'>;
