/**
 * ChachaRunner.ts — « La Course du Père Noël » (maison de Chacha, clé violette).
 * Piste enneigée à trois couloirs, progression automatique.
 * Objectif : 600 unités de distance, 15 cadeaux ramassés, au moins un cœur restant.
 *
 * Optimisations : obstacles et effets réutilisés via un pool, motifs toujours
 * franchissables (un couloir libre minimum), difficulté progressive plafonnée.
 */
import Phaser from 'phaser';
import { MinigameScene, type MinigameMeta } from '../common/MinigameScene';
import { audio } from '../../audio/audio';
import { burst, floatText, shake, vignette } from '../../game/fx/effects';
import { prefersReducedMotion } from '../../game/fx/motionPreference';
import { bus } from '../../game/bus';
import { getMascot } from '../../mascots';
import { createMascotSprite, preloadMascotSheet, registerMascotTextures } from '../../mascots/renderer';
import { FONT, drawPixelCanvas, hudText, showOverlay } from '../common/shell';
import { bindSceneSwipes, type SwipeDirection } from '../common/gesture';
import { runnerObstacleInterval, runnerSpeed } from '../common/difficulty';

const LANES = [-1, 0, 1];
let WORLD_WIDTH = 1280;
let WORLD_HEIGHT = 720;
let HORIZON_Y = 176;
let PLAYER_Y = 632;
let HALF_TOP = 96;
let HALF_BOTTOM = 392;
let CENTER_X = 640;

/** Demi-largeur de la piste à une profondeur z (0 = horizon, 1 = bas de l'écran). */
function trackHalf(z: number): number {
  return HALF_TOP + (HALF_BOTTOM - HALF_TOP) * Math.pow(Phaser.Math.Clamp(z, 0, 1), 1.7);
}
function depthY(z: number): number {
  return HORIZON_Y + Math.pow(Phaser.Math.Clamp(z, 0, 1), 1.7) * (WORLD_HEIGHT - HORIZON_Y);
}
function laneX(z: number, lane: number): number {
  return CENTER_X + (lane - 1) * trackHalf(z) * 0.62;
}
const DISTANCE_GOAL = 600;
const GIFT_GOAL = 15;
type EntityKind = 'obstacle' | 'gift' | 'heart';
type ObstacleType = 'bonhomme' | 'luge' | 'congere' | 'guirlande';

interface Entity {
  kind: EntityKind;
  type: string;
  lane: number;
  z: number;
  image: Phaser.GameObjects.Image;
  active: boolean;
  collected: boolean;
}

export class ChachaRunner extends MinigameScene {
  private entities: Entity[] = [];
  private player!: Phaser.GameObjects.Sprite;
  private sled!: Phaser.GameObjects.Container;
  private lane = 1;
  private distance = 0;
  private gifts = 0;
  private hearts = 3;
  private speed = 4.2;
  private jumping = false;
  private sliding = false;
  private invulnerable = 0;
  private obstacleTimer = 1100;
  private giftTimer = 900;
  private running = false;
  private trackGfx!: Phaser.GameObjects.Graphics;
  private hudDistance!: Phaser.GameObjects.Text;
  private hudGifts!: Phaser.GameObjects.Text;
  private hudHearts!: Phaser.GameObjects.Text;
  private stripeOffset = 0;

  constructor() {
    super('ChachaRunner');
  }

  preload() {
    preloadMascotSheet(this, 'Chacha');
  }

  create() {
    WORLD_WIDTH = this.scale.width;
    WORLD_HEIGHT = this.scale.height;
    const portrait = WORLD_HEIGHT > WORLD_WIDTH;
    CENTER_X = WORLD_WIDTH / 2;
    HORIZON_Y = portrait ? 360 : 176;
    PLAYER_Y = portrait ? WORLD_HEIGHT - 190 : 632;
    HALF_TOP = portrait ? 60 : 96;
    HALF_BOTTOM = portrait ? Math.min(320, WORLD_WIDTH * 0.46) : 392;
    registerMascotTextures(this, getMascot('Chacha'));
    this.buildTextures();
    this.buildTrack();
    this.buildPlayer();
    this.buildHud();
    this.buildInput();
    this.buildPool();
    if (portrait) this.buildTouchControls();
    vignette(this, { strength: 0.42, depth: 8400 });
    if (this.introSeen) this.beginRun();
    else {
      this.introSeen = true;
      this.showIntro();
    }
  }

  private beginRun() {
    this.over = false;
    this.paused = false;
    this.running = true;
  }

  private buildTextures() {
    const paint = (key: string, w: number, h: number, fn: (ctx: CanvasRenderingContext2D) => void) =>
      drawPixelCanvas(this, key, w, h, fn);

    paint('obs-bonhomme', 64, 96, (ctx) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(8, 56, 48, 36);
      ctx.fillRect(14, 26, 36, 32);
      ctx.fillRect(20, 6, 24, 22);
      ctx.fillStyle = '#2a2a3a';
      ctx.fillRect(22, 14, 6, 6);
      ctx.fillRect(36, 14, 6, 6);
      ctx.fillStyle = '#e2751f';
      ctx.fillRect(30, 22, 14, 5);
      ctx.fillStyle = '#c8384f';
      ctx.fillRect(20, 2, 24, 6);
      ctx.fillStyle = '#3b2330';
      ctx.fillRect(2, 44, 60, 7);
      ctx.fillRect(4, 82, 16, 12);
      ctx.fillRect(44, 82, 16, 12);
    });

    paint('obs-luge', 72, 44, (ctx) => {
      ctx.fillStyle = '#c8384f';
      ctx.fillRect(6, 10, 60, 16);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(6, 14, 60, 4);
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(12, 26, 48, 5);
      ctx.fillRect(22, 31, 6, 8);
      ctx.fillRect(44, 31, 6, 8);
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(8, 32, 56, 4);
    });

    paint('obs-congere', 80, 52, (ctx) => {
      ctx.fillStyle = '#f4f9ff';
      ctx.beginPath();
      ctx.ellipse(40, 38, 38, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dbe6f5';
      ctx.beginPath();
      ctx.ellipse(34, 40, 26, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(18, 20, 44, 12);
    });

    paint('obs-guirlande', 96, 72, (ctx) => {
      ctx.fillStyle = '#2f7a5f';
      ctx.fillRect(2, 0, 6, 72);
      ctx.fillRect(88, 0, 6, 72);
      ctx.fillStyle = '#3f9d78';
      ctx.fillRect(0, 0, 96, 10);
      const colors = ['#ff5d73', '#ffd166', '#7ae582', '#6cc6ff'];
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = colors[i % 4];
        ctx.fillRect(10 + i * 10, 14 + Math.sin(i) * 4, 7, 7);
      }
      ctx.fillStyle = '#ffe9a8';
      ctx.fillRect(38, 34, 20, 10);
    });

    paint('gift', 56, 56, (ctx) => {
      ctx.fillStyle = '#4fc3d9';
      ctx.fillRect(6, 14, 44, 38);
      ctx.fillStyle = '#0e6b80';
      ctx.fillRect(6, 14, 44, 6);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(24, 14, 9, 38);
      ctx.fillRect(6, 28, 44, 8);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(18, 6, 20, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(24, 6, 9, 8);
    });

    paint('bell', 48, 48, (ctx) => {
      ctx.fillStyle = '#f2c14e';
      ctx.beginPath();
      ctx.moveTo(24, 6);
      ctx.lineTo(38, 32);
      ctx.lineTo(10, 32);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(8, 32, 32, 7);
      ctx.fillStyle = '#b8891c';
      ctx.fillRect(20, 39, 8, 6);
    });

    paint('heart', 44, 40, (ctx) => {
      ctx.fillStyle = '#ff5d73';
      ctx.fillRect(6, 8, 12, 12);
      ctx.fillRect(26, 8, 12, 12);
      ctx.fillRect(6, 16, 32, 10);
      ctx.fillRect(12, 26, 20, 6);
      ctx.fillRect(18, 32, 8, 5);
      ctx.fillStyle = '#ffb3bd';
      ctx.fillRect(10, 10, 5, 5);
    });

    paint('sled', 92, 26, (ctx) => {
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(4, 6, 84, 8);
      ctx.fillStyle = '#c99a5a';
      ctx.fillRect(4, 6, 84, 3);
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(10, 14, 8, 8);
      ctx.fillRect(74, 14, 8, 8);
      ctx.fillRect(4, 20, 84, 4);
    });
  }

  private buildTrack() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x0a1730, 0x0a1730, 0x10233f, 0x10233f, 1);
    g.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    // nuit étoilée au-dessus de l'horizon
    g.fillStyle(0x081426, 1);
    g.fillRect(0, 0, WORLD_WIDTH, HORIZON_Y);
    for (let i = 0; i < 90; i++) {
      const x = (i * 149) % WORLD_WIDTH;
      const y = (i * 61) % HORIZON_Y;
      g.fillStyle(0xffffff, 0.25 + ((i % 5) * 0.12));
      g.fillRect(x, y, 2, 2);
    }
    // ligne de sapins enneigés
    const treeCount = Math.ceil(WORLD_WIDTH / (WORLD_HEIGHT > WORLD_WIDTH ? 40 : 44));
    const treeSpacing = WORLD_WIDTH / treeCount;
    for (let i = 0; i < treeCount; i++) {
      const x = treeSpacing * i + treeSpacing / 2;
      const h = WORLD_HEIGHT > WORLD_WIDTH ? 44 + (i % 4) * 20 : 30 + (i % 4) * 14;
      g.fillStyle(0x14476e, 1);
      g.fillTriangle(x, HORIZON_Y - h, x - treeSpacing * 0.38, HORIZON_Y + 4, x + treeSpacing * 0.38, HORIZON_Y + 4);
      g.fillStyle(0xe8f2ff, 0.55);
      g.fillTriangle(x, HORIZON_Y - h, x - treeSpacing * 0.2, HORIZON_Y - h * 0.35, x + treeSpacing * 0.2, HORIZON_Y - h * 0.35);
    }
    // piste en perspective
    g.fillStyle(0xeef4ff, 1);
    g.beginPath();
    g.moveTo(CENTER_X - HALF_TOP, HORIZON_Y);
    g.lineTo(CENTER_X + HALF_TOP, HORIZON_Y);
    g.lineTo(CENTER_X + HALF_BOTTOM, WORLD_HEIGHT);
    g.lineTo(CENTER_X - HALF_BOTTOM, WORLD_HEIGHT);
    g.closePath();
    g.fillPath();
    // congères latérales
    g.fillStyle(0xd7e3f5, 1);
    g.beginPath();
    g.moveTo(CENTER_X - HALF_TOP, HORIZON_Y);
    g.lineTo(CENTER_X - HALF_TOP - 16, HORIZON_Y);
    g.lineTo(CENTER_X - HALF_BOTTOM - (WORLD_HEIGHT > WORLD_WIDTH ? 42 : 120), WORLD_HEIGHT);
    g.lineTo(CENTER_X - HALF_BOTTOM, WORLD_HEIGHT);
    g.closePath();
    g.fillPath();
    g.beginPath();
    g.moveTo(CENTER_X + HALF_TOP, HORIZON_Y);
    g.lineTo(CENTER_X + HALF_TOP + 16, HORIZON_Y);
    g.lineTo(CENTER_X + HALF_BOTTOM + (WORLD_HEIGHT > WORLD_WIDTH ? 42 : 120), WORLD_HEIGHT);
    g.lineTo(CENTER_X + HALF_BOTTOM, WORLD_HEIGHT);
    g.closePath();
    g.fillPath();
    this.trackGfx = this.add.graphics().setDepth(1);
  }

  private drawTrackStripes(delta: number) {
    this.stripeOffset = (this.stripeOffset + delta * 0.00022 * this.speed * 1000) % 1;
    const g = this.trackGfx;
    g.clear();
    // lignes de balisage horizontales qui défilent
    g.lineStyle(3, 0xc9d8ec, 0.6);
    for (let i = 0; i < 26; i++) {
      const z = (i / 26 + this.stripeOffset) % 1;
      if (z < 0.04) continue;
      const y = depthY(z);
      const half = trackHalf(z);
      g.lineBetween(CENTER_X - half * 0.95, y, CENTER_X + half * 0.95, y);
    }
    // séparateurs de couloirs
    g.lineStyle(2, 0xa9c0dd, 0.75);
    for (const lane of [-0.5, 0.5]) {
      let prev: { x: number; y: number } | null = null;
      for (let step = 0; step <= 12; step++) {
        const z = step / 12;
        const point = { x: CENTER_X + lane * trackHalf(z) * 1.24, y: depthY(z) };
        if (prev) g.lineBetween(prev.x, prev.y, point.x, point.y);
        prev = point;
      }
    }
  }

  private buildPlayer() {
    this.sled = this.add.container(CENTER_X, PLAYER_Y + 26).setDepth(50);
    const sled = this.add.image(0, 0, 'sled').setScale(1);
    this.player = createMascotSprite(this, getMascot('Chacha'), 0, -6, 'up', 50);
    this.player.setOrigin(0.5, 1);
    this.player.setScale(1.55);
    this.sled.add([sled, this.player]);
  }

  private buildHud() {
    const portrait = WORLD_HEIGHT > WORLD_WIDTH;
    this.add
      .text(CENTER_X, portrait ? 54 : 42, 'La Course du Père Noël', { fontFamily: FONT, fontSize: portrait ? '32px' : '26px', color: '#e3d4ff', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(40);
    this.add
      .text(CENTER_X, portrait ? 89 : 66, 'Maison de Chacha · clé violette', { fontFamily: FONT, fontSize: portrait ? '17px' : '13px', color: '#c6b4eb' })
      .setOrigin(0.5)
      .setDepth(40);
    const panel = this.add.graphics().setDepth(35);
    panel.fillStyle(0x0b1530, 0.94);
    if (portrait) {
      panel.fillRoundedRect(24, 120, 300, 126, 16);
      panel.fillRoundedRect(372, 120, 324, 126, 16);
    } else {
      panel.fillRoundedRect(24, 96, 268, 66, 12);
      panel.fillRoundedRect(860, 96, 396, 70, 12);
    }
    panel.fillStyle(0xffffff, 0.035);
    if (portrait) {
      panel.fillRoundedRect(28, 124, 292, 3, 2);
      panel.fillRoundedRect(376, 124, 316, 3, 2);
    } else {
      panel.fillRoundedRect(28, 100, 260, 3, 2);
      panel.fillRoundedRect(864, 100, 388, 3, 2);
    }
    panel.lineStyle(1, 0x2c3c66, 0.9);
    if (portrait) {
      panel.strokeRoundedRect(24, 120, 300, 126, 16);
      panel.strokeRoundedRect(372, 120, 324, 126, 16);
      this.hudDistance = hudText(this, 44, 146, 'Distance : 0 / 600', '22px', '#f3f6ff');
      this.hudGifts = hudText(this, 44, 184, 'Cadeaux : 0 / 15', '21px', '#ffd166');
      this.hudHearts = hudText(this, 674, 141, '❤ ❤ ❤', '30px', '#ff9db1', 'right');
      hudText(this, 674, 184, 'Évite les obstacles', '19px', '#d3def3', 'right');
    } else {
      panel.strokeRoundedRect(24, 96, 268, 66, 12);
      panel.strokeRoundedRect(860, 96, 396, 70, 12);
      this.hudDistance = hudText(this, 40, 106, 'Distance : 0 / 600', '18px', '#f3f6ff');
      this.hudGifts = hudText(this, 40, 132, 'Cadeaux : 0 / 15', '17px', '#ffd166');
      this.hudHearts = hudText(this, 1238, 103, '❤ ❤ ❤', '20px', '#ff9db1', 'right');
      hudText(this, 1238, 128, '← → couloirs  ·  ↑ sauter  ·  ↓ glisser', '14px', '#d3def3', 'right');
      hudText(this, 1238, 148, 'Glisse dans la direction voulue', '12px', '#b9c8e3', 'right');
    }
  }

  private buildInput() {
    const keyboard = this.input.keyboard!;
    const changeLane = (dir: -1 | 1) => this.changeLane(dir);
    keyboard.on('keydown-LEFT', () => changeLane(-1));
    keyboard.on('keydown-Q', () => changeLane(-1));
    keyboard.on('keydown-A', () => changeLane(-1));
    keyboard.on('keydown-RIGHT', () => changeLane(1));
    keyboard.on('keydown-D', () => changeLane(1));
    keyboard.on('keydown-UP', () => this.jump());
    keyboard.on('keydown-Z', () => this.jump());
    keyboard.on('keydown-W', () => this.jump());
    keyboard.on('keydown-DOWN', () => this.slide());
    keyboard.on('keydown-S', () => this.slide());
    keyboard.on('keydown-ESC', () => this.togglePause());

    const swipeActions: Record<SwipeDirection, () => void> = {
      left: () => changeLane(-1),
      right: () => changeLane(1),
      up: () => this.jump(),
      down: () => this.slide(),
    };
    const removeSwipes = bindSceneSwipes(
      this,
      (direction) => swipeActions[direction](),
      () => this.running && !this.paused && !this.over,
    );
    this.events.once('shutdown', removeSwipes);
  }

  private changeLane(dir: -1 | 1) {
    if (!this.running || this.paused) return;
    const target = Phaser.Math.Clamp(this.lane + dir, 0, 2);
    if (target === this.lane) return;
    this.lane = target;
    audio.play('click');
    this.tweens.add({ targets: this.sled, x: laneX(1, this.lane), duration: 160, ease: 'Quad.easeOut' });
  }

  private buildTouchControls() {
    const y = WORLD_HEIGHT - 110;
    const controls = [
      { x: 72, label: '←', action: () => this.changeLane(-1) },
      { x: 264, label: '↑', action: () => this.jump() },
      { x: 456, label: '↓', action: () => this.slide() },
      { x: WORLD_WIDTH - 72, label: '→', action: () => this.changeLane(1) },
    ];
    for (const control of controls) {
      const button = this.add.circle(control.x, y, 50, 0x0b1530, 0.88).setDepth(120);
      button.setStrokeStyle(3, 0xb8c9e8, 0.95).setInteractive({ useHandCursor: true });
      button.on('pointerdown', control.action);
      this.add
        .text(control.x, y, control.label, { fontFamily: FONT, fontSize: '42px', color: '#f3f6ff', fontStyle: 'bold' })
        .setOrigin(0.5)
        .setDepth(121);
    }
  }

  private jump() {
    if (!this.running || this.paused || this.jumping) return;
    audio.play('jump');
    this.jumping = true;
    this.sliding = false;
    this.tweens.add({
      targets: this.sled,
      y: PLAYER_Y - 84,
      duration: 260,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.sled.y = PLAYER_Y + 26;
        this.jumping = false;
      },
    });
  }

  private slide() {
    if (!this.running || this.paused || this.sliding) return;
    audio.play('slide');
    this.sliding = true;
    this.tweens.add({
      targets: this.player,
      scaleY: 0.55,
      y: 8,
      duration: 140,
      yoyo: true,
      hold: 320,
      onComplete: () => {
        this.player.y = -4;
        this.sliding = false;
      },
    });
  }

  private buildPool() {
    for (let i = 0; i < 34; i++) {
      const image = this.add.image(0, 0, 'obs-congere').setVisible(false).setDepth(10);
      this.entities.push({ kind: i % 3 === 0 ? 'gift' : 'obstacle', type: 'congere', lane: 1, z: 0, image, active: false, collected: false });
    }
  }

  private acquire(kind: EntityKind, type: string, lane: number): Entity | null {
    const entity = this.entities.find((entry) => !entry.active);
    if (!entity) return null;
    entity.active = true;
    entity.kind = kind;
    entity.type = type;
    entity.lane = lane;
    entity.z = 0;
    entity.collected = false;
    entity.image.setVisible(true).setAlpha(1);
    entity.image.setTexture(
      kind === 'gift' ? (type === 'bell' ? 'bell' : 'gift') : kind === 'heart' ? 'heart' : `obs-${type}`,
    );
    return entity;
  }

  private spawnPattern() {
    // difficulté plafonnée : 1 à 2 obstacles, toujours au moins un couloir libre
    const blocked = Phaser.Math.Between(1, 2);
    const lanes = Phaser.Utils.Array.Shuffle([0, 1, 2]).slice(0, blocked);
    const types: ObstacleType[] = ['bonhomme', 'luge', 'congere', 'guirlande'];
    lanes.forEach((lane) => {
      const type = types[Phaser.Math.Between(0, types.length - 1)];
      this.acquire('obstacle', type, lane);
    });
    if (Phaser.Math.Between(0, 3) === 0) {
      const freeLane = [0, 1, 2].find((lane) => !lanes.includes(lane));
      if (freeLane !== undefined) this.acquire('gift', Phaser.Math.Between(0, 3) === 0 ? 'bell' : 'gift', freeLane);
    }
  }

  private position(entity: Entity) {
    const z = Phaser.Math.Clamp(entity.z, 0, 1);
    const scale = 0.22 + 0.62 * Math.pow(z, 1.35);
    const y = depthY(z) - (WORLD_HEIGHT > WORLD_WIDTH ? 14 : 8);
    const x = laneX(z, entity.lane);
    entity.image.setPosition(x, y);
    entity.image.setScale(scale);
    entity.image.setDepth(10 + Math.floor(z * 100));
    return { x, y, z };
  }

  update(_time: number, delta: number) {
    if (!this.running || this.paused) return;
    const dt = delta / 1000;
    this.drawTrackStripes(delta);

    this.speed = runnerSpeed(this.distance);
    this.distance = Math.min(DISTANCE_GOAL, this.distance + this.speed * dt);

    this.obstacleTimer -= delta;
    if (this.obstacleTimer <= 0) {
      this.spawnPattern();
      // plafond de difficulté : jamais moins de 960 ms entre deux motifs
      this.obstacleTimer = runnerObstacleInterval(this.distance);
    }
    this.giftTimer -= delta;
    if (this.giftTimer <= 0) {
      if (this.gifts < GIFT_GOAL) {
        this.acquire('gift', Phaser.Math.Between(0, 4) === 0 ? 'bell' : 'gift', Phaser.Math.Between(0, 2));
      }
      this.giftTimer = 1150;
    }

    this.invulnerable = Math.max(0, this.invulnerable - delta);

    for (const entity of this.entities) {
      if (!entity.active) continue;
      entity.z += dt * (0.34 + this.speed * 0.055);
      const { z } = this.position(entity);
      if (z > 0.99) {
        entity.active = false;
        entity.image.setVisible(false);
        continue;
      }
      if (entity.z >= 0.86 && entity.z <= 1.0 && !entity.collected) {
        if (entity.lane === this.lane) {
          this.resolveCollision(entity);
        }
      }
    }

    this.hudDistance.setText(`Distance : ${Math.floor(this.distance)} / ${DISTANCE_GOAL}`);
    this.hudGifts.setText(`Cadeaux : ${Math.min(this.gifts, GIFT_GOAL)} / ${GIFT_GOAL}`);

    if (this.distance >= DISTANCE_GOAL && this.gifts >= GIFT_GOAL) {
      this.finish(true);
    }
  }

  private resolveCollision(entity: Entity) {
    if (entity.kind === 'gift') {
      entity.collected = true;
      entity.active = false;
      this.gifts += 1;
      entity.image.setVisible(false);
      audio.play('coin');
      floatText(this, entity.image.x, entity.image.y - 10, '+1', { size: '18px', color: '#ffd166', rise: 40 });
      this.pickupBurst(entity.image.x, entity.image.y);
      return;
    }
    if (entity.kind === 'heart') {
      entity.collected = true;
      entity.active = false;
      entity.image.setVisible(false);
      this.hearts = Math.min(3, this.hearts + 1);
      audio.play('match');
      this.updateHearts();
      return;
    }
    // obstacles : le saut évite les objets bas, la glissade évite la guirlande
    const avoided =
      (entity.type === 'guirlande' && this.sliding) ||
      ((entity.type === 'bonhomme' || entity.type === 'luge' || entity.type === 'congere') && this.jumping);
    if (avoided) {
      entity.collected = true;
      return;
    }
    if (this.invulnerable > 0) return;
    entity.collected = true;
    entity.active = false;
    entity.image.setVisible(false);
    this.hearts -= 1;
    this.invulnerable = 900;
    this.updateHearts();
    audio.play('hit');
    burst(this, entity.image.x, entity.image.y, { kind: 'snow', count: 16, speed: 210 });
    shake(this, 220, 0.006);
    if (!prefersReducedMotion()) {
      this.tweens.add({ targets: this.sled, alpha: 0.3, duration: 90, yoyo: true, repeat: 3 });
    }
    if (this.hearts <= 0) this.finish(false);
  }

  private pickupBurst(x: number, y: number) {
    if (prefersReducedMotion()) return;
    for (let i = 0; i < 6; i++) {
      const star = this.add
        .text(x, y, '✦', { fontFamily: FONT, fontSize: '18px', color: '#ffe9a8' })
        .setOrigin(0.5)
        .setDepth(80);
      this.tweens.add({
        targets: star,
        x: x + Phaser.Math.Between(-40, 40),
        y: y - Phaser.Math.Between(20, 60),
        alpha: 0,
        duration: 420,
        onComplete: () => star.destroy(),
      });
    }
  }

  private updateHearts() {
    this.hudHearts.setText('❤ '.repeat(this.hearts) + '♡ '.repeat(3 - this.hearts));
  }

  // ---------------------------------------------------------------- socle commun
  protected meta(): MinigameMeta {
    return {
      gameId: 'chacha-runner',
      title: '🦌 La Course du Père Noël',
      subtitle: 'Maison de Chacha — clé violette',
      accent: '#c9b3ff',
      rules: [
        'Le traîneau avance tout seul sur une piste enneigée à trois couloirs.',
        '← → changent de couloir · ↑ saute par-dessus luges et congères · ↓ glisse sous les guirlandes.',
        'Sur téléphone, touche les boutons en bas ou glisse : gauche/droite pour changer de couloir, haut pour sauter, bas pour glisser.',
        'Les bonshommes de neige sont trop hauts : il faut changer de couloir.',
        'Objectif : 600 unités et 15 cadeaux avec au moins un cœur. Échap met en pause.',
      ],
      win: { title: '✨ Piste terminée !', subtitle: 'La clé violette rejoint l’inventaire familial' },
      lose: {
        title: 'Les trois cœurs sont épuisés',
        subtitle: 'La piste vous attend pour un nouvel essai',
        accent: '#ff9db1',
      },
      pauseLine: 'Le traîneau attend au bord de la piste.',
    };
  }

  protected onIntroAccepted(): void {
    this.beginRun();
  }

  protected summaryLines(): string[] {
    return [
      `Distance : ${Math.floor(this.distance)} / ${DISTANCE_GOAL} unités`,
      `Cadeaux : ${this.gifts} / ${GIFT_GOAL}`,
      `Cœurs restants : ${this.hearts}`,
    ];
  }

  protected resultDetail(): string {
    return `${this.gifts} cadeaux ramassés`;
  }

  protected setSimulationRunning(running: boolean): void {
    this.running = running;
  }
}

export const RUNNER_ORDER = ['chacha-runner'];
