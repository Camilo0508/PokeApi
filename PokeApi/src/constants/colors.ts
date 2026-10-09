export const Themas = {

  claro: {
    primary: '#E3350D',
    background: '#F4F4F6',
    backgroundElement: '#EDEDF2', // cajitas internas (altura/peso)
    card: '#FFFFFF',
    border: 'rgba(0, 0, 0, 0.08)',
    text: '#1C1C1E',
    textSecondary: '#6B6B73',
    online: '#2E9E4F',
    offline: '#D98E04',
  },

  oscuro: {
    primary: '#FF3B30',
    background: '#090B0E',        // "obsidiana"
    backgroundElement: '#000000',
    card: '#181E29',
    border: 'rgba(255, 255, 255, 0.10)',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    online: '#10B981',
    offline: '#F59E0B',
  },

};
export type NombreTema = keyof typeof Themas;
export type Paleta = typeof Themas.claro;
