/**
 * types.ts — interface commune aux cinq mascottes.
 * AUCUNE permission, AUCUNE règle métier, AUCUN mini-jeu ici : contrat de design uniquement.
 */

export type MascotId = 'Maman' | 'Papa' | 'Juju' | 'Chacha' | 'Trystan';

/** Directions exigées : repos/face/dos/profil (profil = regard vers la droite, miroir pour gauche). */
export type Direction = 'down' | 'up' | 'side';

export const DIRECTIONS: Direction[] = ['down', 'up', 'side'];

/**
 * Chaque mascotte est un pixel art de 16 × HAUTEUR_CELLULES pixels.
 * Lettres de palette :
 *  .  transparent        K  contour        S  peau           M  ombre de peau
 *  H  cheveux            h  cheveux sombre C  vêtement       c  vêtement sombre
 *  D  détail/col         A  accessoire     B  chaussures     E  yeux
 *  W  blanc              G  verre/lunettes R  joues
 * Une mascotte peut ajouter ses propres lettres dans `palette`.
 */
export const CELLULE_LARGEUR = 16;
export const CELLULE_HAUTEUR = 18;

export interface MascotAnimation {
  /** Durée d'une étape de marche, en ms. */
  walkFrameMs: number;
  /** Amplitude du rebond vertical en pixels de texture. */
  bobPx: number;
}

export interface MascotAccessory {
  name: string;
  /** Lettre de palette utilisée dans les sprites. */
  letter: string;
  note?: string;
}

export interface MascotDesign {
  id: MascotId;
  displayName: string;
  /** Rôle narratif, purement descriptif (pas une permission). */
  role: 'joueur' | 'presentateur';
  /** Palette lettre → couleur CSS. */
  palette: Record<string, string>;
  /** Sprites par direction : tableau de lignes de 16 caractères. */
  frames: Record<Direction, string[]>;
  /** Taille de rendu relative (1 = 3 px de texture par pixel de jeu). */
  scale: number;
  animation: MascotAnimation;
  accessories: MascotAccessory[];
  /** Texte libre : souvenirs, couleurs, intentions artistiques. */
  notes?: string;
}

/** Validation de design, appelée au démarrage : empêche un fichier cassé de casser les autres. */
export function validateDesign(design: MascotDesign): string[] {
  const errors: string[] = [];
  if (!design.id) errors.push('id manquant');
  if (!design.palette) errors.push('palette manquante');
  for (const dir of DIRECTIONS) {
    const rows = design.frames?.[dir];
    if (!rows || rows.length === 0) {
      errors.push(`frames.${dir} manquant`);
      continue;
    }
    if (rows.length !== CELLULE_HAUTEUR) {
      errors.push(`frames.${dir} : ${rows.length} lignes (attendu ${CELLULE_HAUTEUR})`);
    }
    rows.forEach((row, index) => {
      if (row.length !== CELLULE_LARGEUR) {
        errors.push(`frames.${dir}[${index}] : ${row.length} colonnes (attendu ${CELLULE_LARGEUR})`);
      }
      for (const ch of row) {
        if (ch !== '.' && !design.palette[ch]) {
          errors.push(`frames.${dir}[${index}] : lettre « ${ch} » absente de la palette`);
        }
      }
    });
  }
  return errors;
}
