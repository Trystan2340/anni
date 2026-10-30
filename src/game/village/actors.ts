/**
 * actors.ts — acteurs du village : coffre, présentateur, panneau des listes.
 * Chaque fabrique renvoie un objet avec ses méthodes de mise à jour, pour que la
 * scène n'ait pas à connaître les détails de rendu.
 */
import Phaser from 'phaser';
import type { PlayerProgress } from '../../data/types';
import { getMascot } from '../../mascots';
import { createMascotSprite, registerMascotTextures } from '../../mascots/renderer';
import { CHEST, PRESENTER, paintChest } from './villageArt';
import { SIGNE } from './hotspots';
import { softGlow, twinkle } from '../fx/effects';
import { prefersReducedMotion, watchReducedMotion } from '../fx/motionPreference';

export interface ChestActor {
  sprite: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  sparkle?: Phaser.GameObjects.Particles.ParticleEmitter;
  refresh(progress: PlayerProgress): void;
}

function paintChestTexture(scene: Phaser.Scene, progress: PlayerProgress) {
  const deposited = Object.values(progress.keys).filter((key) => key.deposited).length;
  if (scene.textures.exists('chest')) scene.textures.remove('chest');
  const canvas = document.createElement('canvas');
  canvas.width = CHEST.w + 8;
  canvas.height = CHEST.h + 40;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(4, progress.chestOpened ? 34 : 6);
  paintChest(ctx, deposited, progress.chestOpened);
  scene.textures.addCanvas('chest', canvas);
}

/** Petit coffre du chalet : texture régénérée à chaque changement d'état, halo pulsé. */
export function createChest(scene: Phaser.Scene, initial: PlayerProgress): ChestActor {
  paintChestTexture(scene, initial);
  const size = 0.68;
  const glow = softGlow(scene, CHEST.x, CHEST.y - 6, { color: 0xffe9a8, scale: 1.55, alpha: 0.22, depth: CHEST.y - 1 });
  const sprite = scene.add.image(CHEST.x, CHEST.y, 'chest').setOrigin(0.5, 0.5).setScale(size).setDepth(CHEST.y);
  scene.tweens.add({
    targets: sprite,
    scaleX: size * 1.02,
    scaleY: size * 1.03,
    duration: 1800,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  let currentProgress = initial;
  const actor: ChestActor = {
    sprite,
    glow,
    refresh(progress: PlayerProgress) {
      currentProgress = progress;
      paintChestTexture(scene, progress);
      sprite.setTexture('chest');
      const ready = Object.values(progress.keys).some((key) => key.acquired && !key.deposited);
      glow.setTint(progress.chestOpened ? 0x9fe8ab : ready ? 0xfff1c4 : 0x8fa6c9);
      glow.setAlpha(progress.chestOpened ? 0.4 : ready ? 0.32 : 0.14);

      // étincelles au-dessus du coffre dès qu'une clé attend d'être déposée
      if (ready && !actor.sparkle && !prefersReducedMotion()) {
        actor.sparkle = scene.add.particles(CHEST.x, CHEST.y - 24, 'fx-spark', {
          x: { min: -42, max: 42 },
          y: { min: -16, max: 6 },
          speedY: { min: -48, max: -18 },
          speedX: { min: -14, max: 14 },
          scale: { start: 0.7, end: 0 },
          alpha: { start: 0.9, end: 0 },
          lifespan: 1300,
          frequency: 260,
          tint: [0xffe9a8, 0xffffff, 0xffd166],
        });
        actor.sparkle.setDepth(CHEST.y + 1);
      } else if (!ready && actor.sparkle) {
        actor.sparkle.destroy();
        actor.sparkle = undefined;
      }
    },
  };
  const removeMotionListener = watchReducedMotion((reduced) => {
    if (reduced && actor.sparkle) {
      actor.sparkle.destroy();
      actor.sparkle = undefined;
    } else if (!reduced) {
      actor.refresh(currentProgress);
    }
  });
  scene.events.once('shutdown', removeMotionListener);
  actor.refresh(initial);
  return actor;
}

/** Trystan présentateur : petite animation de respiration + écharpe qui flotte. */
export function createPresenter(scene: Phaser.Scene): Phaser.GameObjects.Sprite {
  const design = getMascot('Trystan');
  registerMascotTextures(scene, design);
  const sprite = createMascotSprite(scene, design, PRESENTER.x, PRESENTER.y, 'side', PRESENTER.y);
  sprite.setScale(design.scale * 0.44);
  scene.tweens.add({
    targets: sprite,
    y: PRESENTER.y - 3,
    duration: 1500,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  const label = scene.add
    .text(PRESENTER.x, PRESENTER.y + 8, 'Trystan', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '12px',
      color: '#20304d',
      backgroundColor: 'rgba(255,255,255,0.5)',
      padding: { x: 4, y: 1 },
    })
    .setOrigin(0.5)
    .setDepth(PRESENTER.y + 1);
  twinkle(scene, label, 0.72, 1, 2600);
  return sprite;
}

/** Panneau « liste de Noël » : apparaît quand le coffre est ouvert. */
export function createSignpost(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const reducedMotion = prefersReducedMotion();
  const container = scene.add.container(0, 0).setDepth(SIGNE.y);
  const g = scene.add.graphics();
  g.fillStyle(0x5a3a22, 1);
  g.fillRect(SIGNE.x - 6, SIGNE.y - 10, 12, 62);
  g.fillStyle(0x8a5a2b, 1);
  g.fillRect(SIGNE.x - 74, SIGNE.y - 46, 148, 52);
  g.fillStyle(0xa8743a, 1);
  g.fillRect(SIGNE.x - 70, SIGNE.y - 42, 140, 44);
  g.lineStyle(3, 0xf2c14e, 1);
  g.strokeRect(SIGNE.x - 70, SIGNE.y - 42, 140, 44);
  const label = scene.add
    .text(SIGNE.x, SIGNE.y - 20, 'LISTE DE NOËL', {
      fontFamily: 'Trebuchet MS, sans-serif',
      fontSize: '15px',
      color: '#3b2330',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  container.add([g, label]);
  container.setAlpha(reducedMotion ? 1 : 0);
  container.setScale(reducedMotion ? 1 : 0.85);
  if (!reducedMotion) {
    scene.tweens.add({ targets: container, alpha: 1, scale: 1, duration: 420, ease: 'Back.easeOut' });
    scene.tweens.add({
      targets: label,
      alpha: 0.6,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    let removeMotionListener = () => {};
    const removeListeners = () => {
      removeMotionListener();
      scene.events.off('shutdown', removeListeners);
    };
    removeMotionListener = watchReducedMotion((reduced) => {
      if (!reduced) return;
      scene.tweens.killTweensOf([container, label]);
      container.setAlpha(1).setScale(1);
      label.setAlpha(1);
      removeListeners();
    });
    scene.events.once('shutdown', removeListeners);
  }
  return container;
}
