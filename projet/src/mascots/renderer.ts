/**
 * renderer.ts — rendu et animation COMMUNS aux cinq mascottes.
 * Le code commun dessine n'importe quel design sans en modifier un autre :
 * il ne lit que `frames`, `palette`, `scale` et `animation`.
 */
import Phaser from 'phaser';
import { CELLULE_HAUTEUR, CELLULE_LARGEUR, DIRECTIONS } from './types';
import type { Direction, MascotDesign, MascotId } from './types';
import { MASCOT_SPRITE_SHEETS } from './assets';
import { mascotFrameIndex, SPRITE_FRAME_HEIGHT, SPRITE_FRAME_WIDTH } from './spriteSheet';

/** Facteur interne : chaque « pixel » de design est dessiné en 4×4 pixels de texture. */
const SUPER = 4;
export const TEXTURE_W = CELLULE_LARGEUR * SUPER; // 64
export const TEXTURE_H = CELLULE_HAUTEUR * SUPER; // 72

export type Frame = 'idle' | 'walkA' | 'walkB';

export function mascotTextureKey(id: MascotId, _dir?: Direction, _frame?: Frame) {
  return `mascot-sheet:${id}`;
}

export function walkAnimKey(id: string, dir: Direction) {
  return `mascot-walk:${id}:${dir}`;
}

/** Charge la feuille complète afin que l'identité choisie à la connexion soit disponible. */
export function preloadMascotSheet(scene: Phaser.Scene, mascotId: MascotId): void {
  const key = mascotTextureKey(mascotId);
  if (scene.textures.exists(key)) return;
  scene.load.spritesheet(key, MASCOT_SPRITE_SHEETS[mascotId], {
    frameWidth: SPRITE_FRAME_WIDTH,
    frameHeight: SPRITE_FRAME_HEIGHT,
  });
}

/** Décale les deux dernières lignes (chaussures) pour simuler une foulée. */
function shiftLegs(rows: string[], dx: number): string[] {
  const out = rows.slice();
  for (let i = rows.length - 2; i < rows.length; i++) {
    const row = rows[i];
    if (dx > 0) out[i] = '.' + row.slice(0, CELLULE_LARGEUR - dx);
    else if (dx < 0) out[i] = row.slice(-dx) + '.'.repeat(-dx);
  }
  return out;
}

/** Peint un design dans un contexte 2D (canvas). Utilisé par Phaser ET par l'UI React. */
export function paintMascot(
  ctx: CanvasRenderingContext2D,
  design: MascotDesign,
  dir: Direction,
  frame: Frame,
  pixel: number,
  originX = 0,
  originY = 0,
): void {
  let rows = design.frames[dir];
  if (frame === 'walkA') rows = shiftLegs(rows, 1);
  if (frame === 'walkB') {
    rows = shiftLegs(rows, -1);
    // le buste se soulève d'un pixel sur la seconde foulée
    rows = ['.'.repeat(CELLULE_LARGEUR), ...rows.slice(0, CELLULE_HAUTEUR - 1)];
  }
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.') continue;
      const color = design.palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(originX + x * pixel, originY + y * pixel, pixel, pixel);
    }
  }
}

/** Canvas hors-écran contenant une pose. */
export function mascotCanvas(design: MascotDesign, dir: Direction, frame: Frame, pixel = SUPER): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CELLULE_LARGEUR * pixel;
  canvas.height = CELLULE_HAUTEUR * pixel;
  const ctx = canvas.getContext('2d');
  if (ctx) paintMascot(ctx, design, dir, frame, pixel);
  return canvas;
}

/** Data-URL utilisable directement par React (avatar, aperçu d'inscription, cartes de listes). */
export function mascotDataUrl(design: MascotDesign, dir: Direction = 'down', frame: Frame = 'idle'): string {
  return mascotCanvas(design, dir, frame, SUPER).toDataURL('image/png');
}

/** Portrait recadré sur la tête (aperçu de mascotte). */
export function mascotPortraitDataUrl(design: MascotDesign, dir: Direction = 'down'): string {
  const full = mascotCanvas(design, dir, 'idle', SUPER);
  const head = document.createElement('canvas');
  head.width = full.width;
  head.height = full.height * 0.55;
  const ctx = head.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(full, 0, 0);
  }
  return head.toDataURL('image/png');
}

/** Enregistre textures + animations de marche d'un design dans une scène Phaser. */
export function registerMascotTextures(scene: Phaser.Scene, design: MascotDesign): void {
  const textureKey = mascotTextureKey(design.id);
  if (!scene.textures.exists(textureKey)) {
    throw new Error(`Spritesheet ${textureKey} must be preloaded before registering its animations`);
  }
  for (const dir of DIRECTIONS) {
    const animKey = walkAnimKey(design.id, dir);
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: [
          { key: textureKey, frame: mascotFrameIndex(dir, 'walkA') },
          { key: textureKey, frame: mascotFrameIndex(dir, 'idle') },
          { key: textureKey, frame: mascotFrameIndex(dir, 'walkB') },
          { key: textureKey, frame: mascotFrameIndex(dir, 'idle') },
        ],
        frameRate: 1000 / design.animation.walkFrameMs,
        repeat: -1,
      });
    }
  }
}

/** Sprite de mascotte prêt à l'emploi (échelle appliquée, origine aux pieds). */
export function createMascotSprite(
  scene: Phaser.Scene,
  design: MascotDesign,
  x: number,
  y: number,
  dir: Direction = 'down',
  depth = 10,
): Phaser.GameObjects.Sprite {
  const sprite = scene.add.sprite(
    x,
    y,
    mascotTextureKey(design.id),
    mascotFrameIndex(dir, 'idle'),
  );
  sprite.setOrigin(0.5, 1);
  sprite.setScale(design.scale * 0.6);
  sprite.setDepth(depth);
  return sprite;
}
