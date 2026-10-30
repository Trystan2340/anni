/**
 * effects.ts — boîte à outils d'effets visuels partagée par le village et les mini-jeux.
 * Toutes les textures sont générées : aucune ressource externe, aucun asset protégé.
 * Chaque effet est isolé et se détruit tout seul (pas de fuite de GameObject).
 */
import Phaser from 'phaser';
import { prefersReducedMotion, watchReducedMotion } from './motionPreference';

export type BurstKind = 'sparkle' | 'snow' | 'gift' | 'ember';

type AlphaTarget = Phaser.GameObjects.GameObject & { alpha: number };
type TransformTarget = Phaser.GameObjects.GameObject & { scaleX: number; scaleY: number };

const TEXTURES: Record<string, { w: number; h: number; paint: (ctx: CanvasRenderingContext2D) => void }> = {
  'fx-spark': {
    w: 10,
    h: 10,
    paint: (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(4, 0, 2, 10);
      ctx.fillRect(0, 4, 10, 2);
      ctx.fillStyle = '#ffe9a8';
      ctx.fillRect(3, 3, 4, 4);
    },
  },
  'fx-dot': {
    w: 6,
    h: 6,
    paint: (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(1, 1, 4, 4);
    },
  },
  'fx-flake': {
    w: 8,
    h: 8,
    paint: (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(2, 0, 4, 8);
      ctx.fillRect(0, 2, 8, 4);
      ctx.fillStyle = '#e8f2ff';
      ctx.fillRect(3, 3, 2, 2);
    },
  },
  'fx-confetti': {
    w: 8,
    h: 8,
    paint: (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 8, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillRect(2, 5, 4, 3);
    },
  },
  'fx-soft': {
    w: 64,
    h: 64,
    paint: (ctx) => {
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
      gradient.addColorStop(0.45, 'rgba(255,255,255,0.35)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
    },
  },
  // Cadre sombre : transparent au centre, assombri vers les bords (jamais un voile).
  'fx-vignette': {
    w: 512,
    h: 512,
    paint: (ctx) => {
      const gradient = ctx.createRadialGradient(256, 256, 112, 256, 256, 318);
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(0.66, 'rgba(0,0,0,0.10)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.58)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
    },
  },
};

export const FX_COLORS = ['#ff5d73', '#ffd166', '#7ae582', '#6cc6ff', '#c99bff', '#ffffff'];

/** Crée les textures d'effets si elles n'existent pas encore dans la scène. */
export function ensureFxTextures(scene: Phaser.Scene): void {
  for (const [key, spec] of Object.entries(TEXTURES)) {
    if (scene.textures.exists(key)) continue;
    const canvas = document.createElement('canvas');
    canvas.width = spec.w;
    canvas.height = spec.h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      spec.paint(ctx);
    }
    scene.textures.addCanvas(key, canvas);
  }
}

/** Gerbe de particules courte : étincelles, neige, cadeaux, braises. */
export function burst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options: {
    kind?: BurstKind;
    count?: number;
    speed?: number;
    scale?: number;
    colors?: number[];
    depth?: number;
    lifespan?: number;
  } = {},
): void {
  if (prefersReducedMotion()) return;
  ensureFxTextures(scene);
  const kind = options.kind ?? 'sparkle';
  const texture =
    kind === 'snow' ? 'fx-flake' : kind === 'gift' ? 'fx-confetti' : kind === 'ember' ? 'fx-dot' : 'fx-spark';
  const count = options.count ?? 10;
  const speed = options.speed ?? 140;
  const colors =
    options.colors ??
    (kind === 'ember'
      ? [0xffb347, 0xffd166]
      : kind === 'snow'
        ? [0xffffff, 0xe8f2ff]
        : [0xffffff, 0xffe9a8, 0xffd166]);

  const emitter = scene.add.particles(x, y, texture, {
    speed: { min: speed * 0.35, max: speed },
    angle: { min: 0, max: 360 },
    scale: { start: options.scale ?? 1, end: 0 },
    alpha: { start: 1, end: 0 },
    lifespan: options.lifespan ?? (kind === 'snow' ? 900 : 560),
    gravityY: kind === 'snow' ? 180 : kind === 'ember' ? -60 : 0,
    quantity: count,
    emitting: false,
    tint: colors,
  });
  emitter.setDepth(options.depth ?? 9000);
  emitter.explode(count);
  scene.time.delayedCall((options.lifespan ?? 900) + 120, () => emitter.destroy());
}

/** Pluie de confettis sur toute la largeur (victoire). */
export function confetti(
  scene: Phaser.Scene,
  options: { width?: number; height?: number; duration?: number } = {},
): void {
  if (prefersReducedMotion()) return;
  ensureFxTextures(scene);
  const width = options.width ?? scene.scale.width;
  const emitter = scene.add.particles(0, -20, 'fx-confetti', {
    x: { min: 0, max: width },
    y: -20,
    speedY: { min: 90, max: 220 },
    speedX: { min: -60, max: 60 },
    rotate: { start: 0, end: 360 },
    scale: { min: 0.7, max: 1.6 },
    lifespan: 3600,
    frequency: 26,
    tint: [0xff5d73, 0xffd166, 0x7ae582, 0x6cc6ff, 0xc99bff, 0xffffff],
    quantity: 2,
  });
  emitter.setDepth(9500);
  emitter.setScrollFactor(0);
  let removeMotionListener = () => {};
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    removeMotionListener();
    scene.events.off('shutdown', cleanup);
  };
  scene.events.once('shutdown', cleanup);
  removeMotionListener = watchReducedMotion((reduced) => {
    if (!reduced) return;
    emitter.stop(true);
    emitter.destroy();
    cleanup();
  });
  scene.time.delayedCall(options.duration ?? 2200, () => {
    if (!emitter.active) {
      cleanup();
      return;
    }
    emitter.stop();
    scene.time.delayedCall(3800, () => {
      emitter.destroy();
      cleanup();
    });
  });
}

/** Texte flottant (« +3 », « Combo ×2 », « +1 cadeau »). */
export function floatText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  options: { color?: string; size?: string; rise?: number; duration?: number } = {},
): void {
  if (prefersReducedMotion()) return;
  const text = scene.add
    .text(x, y, value, {
      fontFamily: 'Trebuchet MS, "Segoe UI", sans-serif',
      fontSize: options.size ?? '18px',
      color: options.color ?? '#ffe9a8',
      fontStyle: 'bold',
      stroke: '#0b1024',
      strokeThickness: 4,
    })
    .setOrigin(0.5)
    .setDepth(9400);
  scene.tweens.add({
    targets: text,
    y: y - (options.rise ?? 54),
    alpha: { from: 1, to: 0 },
    scale: { from: 0.7, to: 1.15 },
    duration: options.duration ?? 780,
    ease: 'Quad.easeOut',
    onComplete: () => text.destroy(),
  });
}

/** Voile coloré plein écran, pour marquer un impact ou une réussite. */
export function flash(scene: Phaser.Scene, color = 0xffffff, alpha = 0.35, duration = 320): void {
  if (prefersReducedMotion()) return;
  const cam = scene.cameras.main;
  const rect = scene.add
    .rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, color, alpha)
    .setDepth(9600)
    .setScrollFactor(0);
  scene.tweens.add({ targets: rect, alpha: 0, duration, onComplete: () => rect.destroy() });
}

export function shake(scene: Phaser.Scene, duration = 200, intensity = 0.005): void {
  if (prefersReducedMotion()) return;
  scene.cameras.main.shake(duration, intensity);
}

/** Halo doux qui pulse (lanterne, coffre prêt, porte active). */
export function softGlow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options: { color?: number; scale?: number; alpha?: number; depth?: number } = {},
): Phaser.GameObjects.Image {
  ensureFxTextures(scene);
  const glow = scene.add.image(x, y, 'fx-soft').setDepth(options.depth ?? -40);
  glow.setTint(options.color ?? 0xffe9a8);
  glow.setScale(options.scale ?? 1);
  glow.setAlpha(options.alpha ?? 0.25);
  if (prefersReducedMotion()) return glow;
  scene.tweens.add({
    targets: glow,
    alpha: (options.alpha ?? 0.25) * 0.45,
    scale: (options.scale ?? 1) * 1.18,
    duration: 2100,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  return glow;
}

/** Fait clignoter doucement une cible (guirlandes, étoiles). */
export function twinkle(
  scene: Phaser.Scene,
  target: AlphaTarget,
  min = 0.45,
  max = 1,
  duration = 1400,
): void {
  if (prefersReducedMotion()) return;
  scene.tweens.add({
    targets: target,
    alpha: { from: max, to: min },
    duration: Phaser.Math.Between(duration * 0.6, duration),
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
    delay: Phaser.Math.Between(0, 700),
  });
}

/** Pulse d'échelle, pour attirer l'œil sur un élément interactif. */
export function pulseScale(scene: Phaser.Scene, target: TransformTarget, amount = 1.06, duration = 900): void {
  if (prefersReducedMotion()) return;
  scene.tweens.add({
    targets: target,
    scaleX: amount,
    scaleY: amount,
    duration,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
}

/**
 * Neige : une couche de fond (lente, derrière le décor) et une couche d'avant-plan
 * (flocons diffus, devant tout) pour donner de la profondeur.
 */
export function snowLayers(
  scene: Phaser.Scene,
  width: number,
  height: number,
  cameraScroll = false,
): { back: Phaser.GameObjects.Particles.ParticleEmitter; front: Phaser.GameObjects.Particles.ParticleEmitter } {
  ensureFxTextures(scene);
  const back = scene.add.particles(0, 0, 'fx-dot', {
    x: { min: 0, max: width },
    y: -10,
    lifespan: 11000,
    speedY: { min: 18, max: 40 },
    speedX: { min: -14, max: 14 },
    scale: { min: 0.4, max: 0.9 },
    alpha: { start: 0.7, end: 0.1 },
    quantity: 2,
    frequency: 110,
  });
  back.setDepth(-60);

  const front = scene.add.particles(0, 0, 'fx-soft', {
    x: { min: 0, max: width },
    y: -20,
    lifespan: 9000,
    speedY: { min: 34, max: 74 },
    speedX: { min: -26, max: 26 },
    scale: { min: 0.08, max: 0.26 },
    alpha: { start: 0.5, end: 0 },
    quantity: 1,
    frequency: 130,
  });
  front.setDepth(9200);
  front.setBlendMode(Phaser.BlendModes.SCREEN);

  if (prefersReducedMotion()) {
    back.stop();
    front.stop();
  }

  if (!cameraScroll) {
    back.setScrollFactor(0);
    front.setScrollFactor(0);
  }
  return { back, front };
}

/**
 * Vignettage : cadre sombre très doux qui asseoit l'image.
 * Transparent au centre (aucune perte de luminosité), assombri seulement sur les bords.
 */
export function vignette(
  scene: Phaser.Scene,
  options: { strength?: number; scrollFactor?: number; depth?: number } = {},
): Phaser.GameObjects.Image {
  ensureFxTextures(scene);
  const cam = scene.cameras.main;
  const image = scene.add
    .image(cam.width / 2, cam.height / 2, 'fx-vignette')
    .setDisplaySize(cam.width * 1.04, cam.height * 1.04)
    .setAlpha(options.strength ?? 0.5)
    .setDepth(options.depth ?? 8500)
    .setScrollFactor(options.scrollFactor ?? 0);
  const destroyOnShutdown = () => image.destroy();
  scene.events.once('shutdown', destroyOnShutdown);
  image.once('destroy', () => scene.events.off('shutdown', destroyOnShutdown));
  return image;
}

/** Rais de lumière : cône doux qui tombe d'une fenêtre ou d'un lampadaire. */
export function lightShaft(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options: { width?: number; height?: number; color?: number; alpha?: number; depth?: number } = {},
): Phaser.GameObjects.Image {
  ensureFxTextures(scene);
  const shaft = scene.add.image(x, y, 'fx-soft').setDepth(options.depth ?? 250);
  shaft.setTint(options.color ?? 0xffe9a8);
  shaft.setDisplaySize(options.width ?? 120, options.height ?? 220);
  shaft.setAlpha(options.alpha ?? 0.12);
  shaft.setBlendMode(Phaser.BlendModes.ADD);
  if (prefersReducedMotion()) return shaft;
  scene.tweens.add({
    targets: shaft,
    alpha: shaft.alpha * 0.6,
    duration: Phaser.Math.Between(2600, 3800),
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });
  return shaft;
}
