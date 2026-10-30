/**
 * index.ts — registre des cinq designs.
 * Point d'entrée unique : ajouter/modifier une mascotte ne touche ici qu'une ligne.
 */
import type { MascotDesign, MascotId } from './types';
import { validateDesign } from './types';
import { Maman } from './Maman';
import { Papa } from './Papa';
import { Juju } from './Juju';
import { Chacha } from './Chacha';
import { Trystan } from './Trystan';

export const MASCOT_DESIGNS: Record<MascotId, MascotDesign> = {
  Maman,
  Papa,
  Juju,
  Chacha,
  Trystan,
};

/** Ordre d'affichage stable des cinq mascottes (les 4 joueurs puis le présentateur). */
export const MASCOT_ORDER: MascotId[] = ['Maman', 'Papa', 'Juju', 'Chacha', 'Trystan'];

export const PLAYER_MASCOT_IDS: MascotId[] = ['Maman', 'Papa', 'Juju', 'Chacha'];

export const MASCOTS: MascotDesign[] = MASCOT_ORDER.map((id) => MASCOT_DESIGNS[id]);

export function getMascot(id: MascotId): MascotDesign {
  return MASCOT_DESIGNS[id];
}

/** Diagnostic au démarrage : un design incomplet n'empêche pas les autres de s'afficher. */
export function auditDesigns(): { id: MascotId; errors: string[] }[] {
  return MASCOTS.map((design) => ({ id: design.id, errors: validateDesign(design) })).filter(
    (entry) => entry.errors.length > 0,
  );
}

export { validateDesign, DIRECTIONS } from './types';
export type { MascotDesign, MascotId, Direction } from './types';
export { MASCOT_SPRITE_SHEETS } from './assets';
export { mascotFrameIndex, SPRITE_FRAME_HEIGHT, SPRITE_FRAME_WIDTH } from './spriteSheet';
export type { MascotFrame } from './spriteSheet';
export * from './renderer';
