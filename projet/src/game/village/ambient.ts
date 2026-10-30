/**
 * ambient.ts — ambiance du village : ciel, aurores, guirlandes animées,
 * fumée de cheminée, neige sur deux plans, halos et empreintes dans la neige.
 * Tous les effets sont générés par du code, aucune image externe.
 */
import Phaser from 'phaser';
import { CHALET, CHALET_DOOR, HOUSES, VILLAGE_H, VILLAGE_W, guirlandePositions, treeLightPositions } from './villageArt';
import { ensureFxTextures, lightShaft, snowLayers, softGlow, twinkle, vignette } from '../fx/effects';
import { prefersReducedMotion, watchReducedMotion } from '../fx/motionPreference';

/** Lumières de guirlande animées, posées au-dessus du décor peint. */
function addFairyLights(scene: Phaser.Scene) {
  const colors = [0xff5d73, 0xffd166, 0x7ae582, 0x6cc6ff, 0xc99bff];
  guirlandePositions().forEach((point, index) => {
    const light = scene.add.circle(point.x, point.y, 3.4, colors[index % colors.length], 0.95).setDepth(320);
    light.setBlendMode(Phaser.BlendModes.ADD);
    twinkle(scene, light, 0.25, 1, 1500 + (index % 5) * 220);
  });
}

/** Quelques lumières discrètes sur les sapins et les quatre chalets. */
function addHouseAndTreeLights(scene: Phaser.Scene) {
  const colors = [0xffd166, 0xff7184, 0x6cc6ff, 0x7ae582];
  const points = treeLightPositions().map((point, index) => ({ ...point, color: colors[index % colors.length] }));
  HOUSES.forEach((house, houseIndex) => {
    for (const i of [2, 5, 8]) {
      points.push({
        x: house.x + (house.entryFacing === 'north' ? 24 + i * 21 : 22 + i * 20) + 2,
        y: house.y + (house.entryFacing === 'north' ? 56 : 71 + Math.sin(i * 0.8) * 4),
        color: colors[(houseIndex + i) % colors.length],
      });
    }
  });
  points.forEach(({ x, y, color }, index) => {
    const light = scene.add.circle(x, y, 2.2, color, 0.8).setDepth(320);
    light.setBlendMode(Phaser.BlendModes.ADD);
    twinkle(scene, light, 0.3, 0.85, 1700 + (index % 4) * 200);
  });
}

/** Fumée légère sur le grand chalet et les quatre maisons du village. */
function addChimneySmoke(scene: Phaser.Scene) {
  ensureFxTextures(scene);
  const chimneys = [
    { x: CHALET.x + 39, y: CHALET.y + 11 },
    ...HOUSES.map((house) => ({ x: house.x + 180, y: house.y + 12 })),
  ];
  chimneys.forEach(({ x, y }) => {
    const emitter = scene.add.particles(x, y, 'fx-dot', {
      speedY: { min: -30, max: -16 },
      speedX: { min: -8, max: 9 },
      scale: { start: 0.55, end: 1.8 },
      alpha: { start: 0.32, end: 0 },
      lifespan: 2700,
      frequency: 440,
      tint: 0xe7edf5,
      maxParticles: 9,
    });
    emitter.setDepth(-20);
  });
}

/** Aurores boréales douces au-dessus des maisons du haut. */
function addAurora(scene: Phaser.Scene) {
  const aurora = scene.add.graphics().setDepth(-95);
  aurora.fillGradientStyle(0x6cc6ff, 0x7ae582, 0x6cc6ff, 0x7ae582, 0.16, 0.1, 0.16, 0.1);
  aurora.fillRect(0, 0, VILLAGE_W, 210);
  const wave = scene.add.graphics().setDepth(-94);
  for (let i = 0; i < 3; i++) {
    wave.fillStyle([0x7ae582, 0x6cc6ff, 0xc99bff][i], 0.05);
    wave.fillEllipse(VILLAGE_W / 2, 40 + i * 40, VILLAGE_W * (1 - i * 0.15), 90);
  }
  scene.tweens.add({ targets: aurora, alpha: { from: 0.55, to: 1 }, duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  scene.tweens.add({ targets: wave, x: { from: -40, to: 40 }, duration: 7200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
}

/** Rais de lumière doux qui tombent des fenêtres éclairées. */
function addLightShafts(scene: Phaser.Scene) {
  const windows = [
    { x: 116, y: 178, w: 120, h: 190 },
    { x: 236, y: 178, w: 120, h: 190 },
    { x: 1056, y: 178, w: 120, h: 190 },
    { x: 1176, y: 178, w: 120, h: 190 },
    { x: 116, y: 618, w: 120, h: 190 },
    { x: 236, y: 618, w: 120, h: 190 },
    { x: 1056, y: 618, w: 120, h: 190 },
    { x: 1176, y: 618, w: 120, h: 190 },
  ];
  windows.forEach((w, index) => {
    lightShaft(scene, w.x, w.y + w.h / 2, {
      width: w.w,
      height: w.h,
      color: [0xffe9a8, 0xfff1c4, 0xffd9a8][index % 3],
      alpha: 0.07,
      depth: 240,
    });
  });
}

/** Petit halo lumineux sous chaque lanterne du village. */
function addLamps(scene: Phaser.Scene) {
  const lamps = [
    { x: 536, y: 299 },
    { x: 744, y: 299 },
    { x: CHALET_DOOR.x, y: CHALET_DOOR.y - 18 },
    { x: 520, y: 474 },
    { x: 760, y: 474 },
  ];
  lamps.forEach((lamp) => {
    softGlow(scene, lamp.x, lamp.y, { color: 0xfff1c4, scale: 1.1, alpha: 0.16, depth: 300 });
  });
  softGlow(scene, CHALET_DOOR.x, CHALET_DOOR.y - 8, { color: 0xfff1c4, scale: 2.4, alpha: 0.18, depth: -40 });
}

/** Neige animée sur deux plans (loin derrière le décor, gros flocons devant). */
export function addSnow(scene: Phaser.Scene) {
  snowLayers(scene, VILLAGE_W, VILLAGE_H, true);
}

/** Empreintes dans la neige, éphémères et limitées en nombre. */
export class FootprintTrail {
  private prints: Phaser.GameObjects.Ellipse[] = [];
  private last = 0;
  private side = 1;
  private reducedMotion = false;
  private destroyed = false;

  constructor(private scene: Phaser.Scene) {}

  /** À appeler à chaque frame de marche : crée une empreinte toutes les ~140 ms. */
  step(x: number, y: number, now: number) {
    if (this.reducedMotion || this.destroyed || now - this.last < 140) return;
    this.last = now;
    this.side *= -1;
    const print = this.scene.add
      .ellipse(x + this.side * 7, y - 2, 9, 5, 0xbfd0e6, 0.55)
      .setDepth(Math.floor(y) - 1);
    this.prints.push(print);
    this.scene.tweens.add({
      targets: print,
      alpha: 0,
      duration: 4200,
      delay: 1200,
      onComplete: () => {
        print.destroy();
        this.prints = this.prints.filter((entry) => entry !== print);
      },
    });
    if (this.prints.length > 26) {
      const oldest = this.prints.shift();
      oldest?.destroy();
    }
  }

  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
    if (reduced) this.clear();
  }

  destroy(): void {
    this.destroyed = true;
    this.clear();
  }

  private clear(): void {
    this.scene.tweens.killTweensOf(this.prints);
    this.prints.forEach((print) => print.destroy());
    this.prints = [];
  }
}

export interface AmbientController {
  trail: FootprintTrail;
  setReducedMotion(reduced: boolean): void;
  destroy(): void;
}

/** Assemble l'ambiance et contrôle ses animations selon la préférence système. */
export function addAmbient(scene: Phaser.Scene): AmbientController {
  const trail = new FootprintTrail(scene);
  const originalTweenScale = scene.tweens.timeScale;
  let reduced = false;
  let destroyed = false;
  let motionObjects: Phaser.GameObjects.GameObject[] = [];
  let motionTweens: Phaser.Tweens.Tween[] = [];
  let removeMediaListener = () => {};

  const startEffects = () => {
    if (destroyed || motionObjects.length > 0) return;
    const existingObjects = new Set(scene.children.list);
    const existingTweens = new Set(scene.tweens.getTweens());
    addAurora(scene);
    addLamps(scene);
    addLightShafts(scene);
    vignette(scene, { strength: 0.5, scrollFactor: 0, depth: 8600 });
    addFairyLights(scene);
    addHouseAndTreeLights(scene);
    addChimneySmoke(scene);
    addSnow(scene);
    motionObjects = scene.children.list.filter((object) => !existingObjects.has(object));
    motionTweens = scene.tweens.getTweens().filter((tween) => !existingTweens.has(tween));
  };

  const stopEffects = () => {
    motionTweens.forEach((tween) => tween.destroy());
    motionTweens = [];
    motionObjects.slice().reverse().forEach((object) => object.destroy());
    motionObjects = [];
  };

  const controller: AmbientController = {
    trail,
    setReducedMotion(value) {
      if (destroyed || reduced === value) return;
      reduced = value;
      scene.data.set('reducedMotion', reduced);
      trail.setReducedMotion(reduced);
      if (reduced) {
        scene.tweens.timeScale = 0;
        scene.cameras.main.resetFX();
        stopEffects();
      } else {
        scene.tweens.timeScale = originalTweenScale;
        startEffects();
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      removeMediaListener();
      scene.events.off('shutdown', controller.destroy);
      stopEffects();
      trail.destroy();
      scene.tweens.timeScale = originalTweenScale;
    },
  };

  scene.events.once('shutdown', controller.destroy);
  removeMediaListener = watchReducedMotion((value) => controller.setReducedMotion(value));
  const initiallyReduced = prefersReducedMotion();
  scene.data.set('reducedMotion', initiallyReduced);
  if (initiallyReduced) controller.setReducedMotion(true);
  else startEffects();
  return controller;
}
