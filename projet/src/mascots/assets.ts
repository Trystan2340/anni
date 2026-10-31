import type { MascotId } from './types';

export const MASCOT_SPRITE_SHEETS: Record<MascotId, string> = {
  Maman: new URL('./assets/Maman.png', import.meta.url).href,
  Papa: new URL('./assets/Papa.png', import.meta.url).href,
  Juju: new URL('./assets/Juju.png', import.meta.url).href,
  Chacha: new URL('./assets/Chacha.png', import.meta.url).href,
  Trystan: new URL('./assets/Trystan.png', import.meta.url).href,
};
