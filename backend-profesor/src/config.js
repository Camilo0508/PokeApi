// La base está en la nube: si falta la variable, es mejor fallar de una vez
if (!process.env.DATABASE_URL) {
  throw new Error('Falta DATABASE_URL. Ponla en el archivo .env (o en el panel de Render).');
}

export const DATABASE_URL = process.env.DATABASE_URL;
export const PORT = Number(process.env.PORT ?? 8002);
