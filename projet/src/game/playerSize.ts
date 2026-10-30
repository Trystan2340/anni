import type Phaser from 'phaser';

/** Taille du personnage jouable, commune au village et au chalet. */
export const PLAYER_SCALE_FACTOR = 0.58;

/**
 * Garde la zone de collision aux pieds à sa taille d'origine malgré
 * l'agrandissement visuel, pour conserver les passages et interactions.
 */
export function configurePlayerBody(body: Phaser.Physics.Arcade.Body): void {
  const ratio = 0.44 / PLAYER_SCALE_FACTOR;
  const width = 30 * ratio;
  const height = 18 * ratio;
  const originalCenterY = 54 + 18 / 2;
  const originY = 72 * 0.94;
  const centerY = originY + (originalCenterY - originY) * ratio;
  body.setSize(width, height);
  body.setOffset((64 - width) / 2, centerY - height / 2);
}
