/**
 * hotspots.ts — zones d'interaction du village, en fonctions pures.
 * Aucune dépendance à Phaser : facile à tester et à faire évoluer.
 */
import type { PlayerProgress } from '../../data/types';
import { CHALET_DOOR, HOUSES, PRESENTER } from './villageArt';

export type HotspotType = 'house' | 'chalet' | 'presenter' | 'signpost';

export interface Hotspot {
  type: HotspotType;
  x: number;
  y: number;
  radius: number;
  label: string;
  /** Clé de maison (maman, papa, juju, chacha) pour l'ouverture du mini-jeu. */
  houseKey?: string;
  gameId?: string;
}

export const SIGNE = { x: 780, y: 566 };

/** Construit la liste des zones interactives selon la progression du joueur. */
export function buildHotspots(progress?: PlayerProgress | null): Hotspot[] {
  const hotspots: Hotspot[] = [
    ...HOUSES.map<Hotspot>((house) => ({
      type: 'house',
      x: house.doorX,
      y: house.doorY,
      radius: 86,
      label: house.name,
      houseKey: house.id.replace('maison-', ''),
      gameId: house.id.replace('maison-', ''),
    })),
    { type: 'presenter', x: PRESENTER.x, y: PRESENTER.y - 10, radius: 96, label: 'Parler à Trystan' },
    { type: 'chalet', x: CHALET_DOOR.x, y: CHALET_DOOR.y, radius: 108, label: 'Entrer dans le chalet' },
  ];

  // Le panneau apparaît après la résolution de l'image mystère.
  if (progress?.chestOpened && progress.mysterySolved) {
    hotspots.push({
      type: 'signpost',
      x: SIGNE.x,
      y: SIGNE.y + 20,
      radius: 96,
      label: 'Consulter la liste de Noël',
    });
  }
  return hotspots;
}

/** Zone la plus proche dans son rayon d'action (null si aucune). */
export function nearestHotspot(x: number, y: number, hotspots: Hotspot[]): Hotspot | null {
  let best: Hotspot | null = null;
  let bestDistance = Infinity;
  for (const spot of hotspots) {
    const distance = Math.hypot(spot.x - x, spot.y - y);
    if (distance < spot.radius && distance < bestDistance) {
      best = spot;
      bestDistance = distance;
    }
  }
  return best;
}

/** Texte affiché dans la pastille d'interaction. */
export function hotspotPromptLabel(spot: Hotspot): string {
  if (spot.type === 'chalet') return 'Entrer dans le chalet';
  if (spot.type === 'presenter') return 'Parler à Trystan';
  if (spot.type === 'signpost') return 'Consulter la liste de Noël';
  return spot.label;
}
