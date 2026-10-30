/**
 * VillageScene.ts — orchestration du village.
 *
 * Cette scène ne contient plus QUE le joueur et les interactions :
 *   - décor et obstacles ....... village/villageArt.ts
 *   - acteurs (coffre, PNJ) .... village/actors.ts
 *   - zones d'interaction ...... village/hotspots.ts (fonctions pures)
 *   - pastille « E » ........... village/prompt.ts
 *   - ambiance et effets ....... village/ambient.ts + fx/effects.ts
 */
import Phaser from 'phaser';
import type { KeyId, PlayerProgress } from '../data/types';
import { createMascotSprite, mascotTextureKey, preloadMascotSheet, registerMascotTextures, walkAnimKey } from '../mascots/renderer';
import type { Direction, MascotDesign } from '../mascots/types';
import { getMascot, MASCOT_ORDER, mascotFrameIndex } from '../mascots';
import { audio } from '../audio/audio';
import { burst } from './fx/effects';
import { bus } from './bus';
import {
  CHALET,
  CHALET_DOOR,
  HOUSES,
  PLAYER_START,
  PRESENTER,
  VILLAGE_H,
  VILLAGE_OBSTACLES,
  VILLAGE_W,
  paintVillage,
} from './village/villageArt';
import { buildHotspots, hotspotPromptLabel, nearestHotspot, type Hotspot } from './village/hotspots';
import { createPresenter, createSignpost } from './village/actors';
import { InteractionPrompt } from './village/prompt';
import { addAmbient, type AmbientController } from './village/ambient';
import { prefersReducedMotion } from './fx/motionPreference';
import { configurePlayerBody, PLAYER_SCALE_FACTOR } from './playerSize';
import { GingerCat } from './village/gingerCat';
import { WinterRobin } from './village/winterRobin';

const KEY_COLORS: Record<string, string> = {
  rose: '#e2709a',
  bleue: '#5b8fe0',
  doree: '#e8b83f',
  violette: '#a97ce8',
};

const WALK_SPEED = 215;

/** Progression neutre : permet d'afficher le village avant que la session soit transmise. */
const EMPTY_PROGRESS: PlayerProgress = {
  userId: '',
  chestOpened: false,
  awardedKeys: [],
  keys: Object.fromEntries(
    (['rose', 'bleue', 'doree', 'violette'] as KeyId[]).map((keyId) => [
      keyId,
      { keyId, ownerId: '', acquired: false, deposited: false, acquiredAt: null, depositedAt: null },
    ]),
  ) as PlayerProgress['keys'],
};

export class VillageScene extends Phaser.Scene {
  private design: MascotDesign = getMascot('Trystan');
  private progress!: PlayerProgress;
  private player!: Phaser.Physics.Arcade.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private prompt!: InteractionPrompt;
  private presenter?: Phaser.GameObjects.Sprite;
  private signpost?: Phaser.GameObjects.Container;
  private ambient!: AmbientController;
  private gingerCat!: GingerCat;
  private winterRobin!: WinterRobin;
  private hotspots: Hotspot[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private facing: Direction = 'down';
  private moving = false;
  private activeHotspot: Hotspot | null = null;
  private enteringChalet = false;
  private touchDirections = { up: false, down: false, left: false, right: false };
  private removeTouchListeners: (() => void)[] = [];
  /** L'état reçu avant la fin de create() est mis en attente (jamais perdu). */
  private ready = false;
  private pendingState: { design: MascotDesign; progress: PlayerProgress } | null = null;

  constructor() {
    super('Village');
  }

  init(data: { design?: MascotDesign; progress?: PlayerProgress }) {
    if (data?.design) this.design = data.design;
    if (data?.progress) this.progress = data.progress;
  }

  preload() {
    MASCOT_ORDER.forEach((mascotId) => preloadMascotSheet(this, mascotId));
  }

  create() {
    this.progress = this.progress ?? EMPTY_PROGRESS;
    this.buildBackdrop();
    this.presenter = createPresenter(this);
    this.hotspots = buildHotspots(this.progress);
    if (this.progress?.chestOpened && this.progress.mysterySolved) this.signpost = createSignpost(this);
    this.buildPlayer();
    this.ambient = addAmbient(this);
    this.gingerCat = new GingerCat(this);
    this.winterRobin = new WinterRobin(this);
    this.prompt = new InteractionPrompt(this);
    this.buildInput();

    this.configureCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.configureCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.configureCamera, this);
      this.removeTouchListeners.forEach((remove) => remove());
      this.removeTouchListeners = [];
    });
    if (!prefersReducedMotion()) this.cameras.main.fadeIn(500, 8, 14, 32);
    this.ready = true;

    // un état arrivé pendant la construction est appliqué maintenant
    if (this.pendingState) {
      const pending = this.pendingState;
      this.pendingState = null;
      this.applyState(pending.design, pending.progress);
    }
    bus.emit('village:ready', undefined);
  }

  private configureCamera() {
    const portrait = this.scale.width <= 820 && this.scale.height > this.scale.width;
    this.cameras.main.setBounds(0, 0, VILLAGE_W, VILLAGE_H);
    this.cameras.main.setZoom(portrait ? 2.05 : 1);
    this.cameras.main.setDeadzone(portrait ? 80 : 180, portrait ? 110 : 120);
    // Phaser applies camera follow offsets inversely: a negative horizontal
    // offset leaves room for the list signpost and presenter on the right.
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08, portrait ? -40 : 0, 0);
  }

  // ------------------------------------------------------------------ décor
  private buildBackdrop() {
    if (!this.textures.exists('village-bg')) {
      const canvas = document.createElement('canvas');
      canvas.width = VILLAGE_W;
      canvas.height = VILLAGE_H;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        paintVillage(ctx);
      }
      this.textures.addCanvas('village-bg', canvas);
    }
    this.add.image(0, 0, 'village-bg').setOrigin(0, 0).setDepth(-100);

    const statics = this.physics.add.staticGroup();
    for (const rect of VILLAGE_OBSTACLES) {
      const zone = this.add.zone(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w, rect.h);
      this.physics.add.existing(zone, true);
      statics.add(zone);
    }
    this.data.set('statics', statics);

    HOUSES.forEach((house) => {
      this.add
        .text(house.x + 116, house.y + (house.entryFacing === 'north' ? 96 : 54), house.sign, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '13px',
          color: '#3b2330',
        })
        .setOrigin(0.5)
        .setDepth(5);
      this.add
        .text(house.x + 116, house.y + 240, house.name, {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '15px',
          color: '#20304d',
          backgroundColor: 'rgba(255,255,255,0.55)',
          padding: { x: 8, y: 3 },
        })
        .setOrigin(0.5)
        .setDepth(5);
    });
  }

  private buildPlayer() {
    this.shadow = this.add.ellipse(PLAYER_START.x, PLAYER_START.y - 2, 52, 17, 0x1b2a44, 0.22).setDepth(1);
    this.player = this.physics.add.sprite(
      PLAYER_START.x,
      PLAYER_START.y,
      mascotTextureKey(this.design.id, 'down', 'idle'),
    );
    this.player.setOrigin(0.5, 0.94);
    this.player.setScale(this.design.scale * PLAYER_SCALE_FACTOR);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    configurePlayerBody(body);
    body.setCollideWorldBounds(true);
    this.physics.world.setBounds(12, 12, VILLAGE_W - 24, VILLAGE_H - 24);
    const statics = this.data.get('statics') as Phaser.Physics.Arcade.StaticGroup;
    this.physics.add.collider(this.player, statics);
  }

  private buildInput() {
    const keyboard = this.input.keyboard!;
    this.keys = keyboard.addKeys('UP,DOWN,LEFT,RIGHT,Z,Q,S,D,W,A,E,SPACE,ESC') as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    keyboard.on('keydown-E', () => this.interact());
    keyboard.on('keydown-SPACE', () => this.interact());
    keyboard.on('keydown-ESC', () => this.openPause());
    this.removeTouchListeners.push(
      bus.on('mobile:move', ({ direction, pressed }) => { this.touchDirections[direction] = pressed; }),
      bus.on('mobile:interact', () => this.interact()),
    );
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.enterChaletFromTap(pointer));
  }

  private enterChaletFromTap(pointer: Phaser.Input.Pointer) {
    const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    if (this.gingerCat.contains(point.x, point.y)) {
      this.gingerCat.pet();
      return;
    }
    const withinFacade =
      point.x >= CHALET.x - 24 &&
      point.x <= CHALET.x + CHALET.w + 24 &&
      point.y >= CHALET.y - 8 &&
      point.y <= CHALET_DOOR.y + 32;
    if (withinFacade) this.enterChalet();
    else {
      const spot = nearestHotspot(point.x, point.y, this.hotspots);
      if (spot) {
        this.activeHotspot = spot;
        this.interact();
      }
    }
  }

  private enterChalet() {
    if (this.enteringChalet) return;
    this.enteringChalet = true;
    this.touchDirections = { up: false, down: false, left: false, right: false };
    audio.play('click');
    if (!prefersReducedMotion()) this.cameras.main.fadeOut(180, 8, 14, 32);
    this.time.delayedCall(prefersReducedMotion() ? 0 : 190, () => {
      this.cameras.main.resetFX();
      bus.emit('chalet:enter', undefined);
    });
  }

  private openPause() {
    audio.play('open');
    bus.emit('pause:open', undefined);
  }

  private interact() {
    if (!this.activeHotspot) return;
    const spot = this.activeHotspot;
    burst(this, spot.x, spot.y - 40, { count: 8, speed: 120, scale: 0.7, lifespan: 420 });

    if (spot.type === 'house' && spot.houseKey && spot.gameId) {
      audio.play('open');
      if (!prefersReducedMotion()) this.cameras.main.flash(220, 255, 240, 200);
      bus.emit('minigame:open', { gameId: spot.gameId, houseId: `maison-${spot.houseKey}` });
      return;
    }
    if (spot.type === 'chalet') {
      this.enterChalet();
      return;
    }
    if (spot.type === 'signpost') {
      audio.play('open');
      if (!prefersReducedMotion()) this.cameras.main.fadeOut(260, 8, 14, 32);
      this.time.delayedCall(prefersReducedMotion() ? 0 : 280, () => bus.emit('lists:open', undefined));
      return;
    }
    // présentateur
    audio.play('click');
    if (this.progress?.chestOpened) {
      if (!prefersReducedMotion()) this.cameras.main.fadeOut(260, 8, 14, 32);
      this.time.delayedCall(prefersReducedMotion() ? 0 : 280, () => bus.emit('lists:open', undefined));
    } else {
      bus.emit('presenter:talk', undefined);
    }
  }

  /** Mise à jour de l'apparence, du coffre et des zones après un changement d'état. */
  applyState(design: MascotDesign, progress: PlayerProgress) {
    if (!this.ready) {
      this.pendingState = { design, progress };
      return;
    }
    this.progress = progress;

    if (!prefersReducedMotion() && this.cameras.main.fadeEffect?.isRunning) {
      this.cameras.main.fadeIn(260, 8, 14, 32);
    }

    if (design.id !== this.design.id) {
      this.design = design;
      registerMascotTextures(this, design);
      this.player.setTexture(mascotTextureKey(design.id), mascotFrameIndex(this.facing, 'idle'));
      this.player.setScale(design.scale * PLAYER_SCALE_FACTOR);
    }
    this.hotspots = buildHotspots(progress);

    if (progress.chestOpened && progress.mysterySolved && !this.signpost) {
      this.signpost = createSignpost(this);
      burst(this, CHALET_DOOR.x, CHALET_DOOR.y - 18, { kind: 'sparkle', count: 30, speed: 260, lifespan: 900 });
    } else if ((!progress.chestOpened || !progress.mysterySolved) && this.signpost) {
      this.signpost.destroy();
      this.signpost = undefined;
    }
  }

  resumeFromChalet() {
    this.enteringChalet = false;
    if (!prefersReducedMotion()) this.cameras.main.fadeIn(180, 8, 14, 32);
  }

  update(time: number, delta: number) {
    if (!this.player) return;
    this.gingerCat.update(time, delta);
    this.winterRobin.update(delta);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;
    if (this.keys.LEFT.isDown || this.keys.Q.isDown || this.keys.A.isDown || this.touchDirections.left) vx -= 1;
    if (this.keys.RIGHT.isDown || this.keys.D.isDown || this.touchDirections.right) vx += 1;
    if (this.keys.UP.isDown || this.keys.Z.isDown || this.keys.W.isDown || this.touchDirections.up) vy -= 1;
    if (this.keys.DOWN.isDown || this.keys.S.isDown || this.touchDirections.down) vy += 1;

    if (vx !== 0 || vy !== 0) {
      const length = Math.hypot(vx, vy) || 1;
      body.setVelocity((vx / length) * WALK_SPEED, (vy / length) * WALK_SPEED);
      const dir: Direction = Math.abs(vx) > Math.abs(vy) ? 'side' : vy > 0 ? 'down' : 'up';
      if (Math.abs(vx) > 0 && Math.abs(vx) >= Math.abs(vy)) this.player.setFlipX(vx < 0);
      if (dir !== this.facing) {
        this.facing = dir;
        this.player.setTexture(mascotTextureKey(this.design.id), mascotFrameIndex(dir, 'walkA'));
      }
      const animationKey = walkAnimKey(this.design.id, this.facing);
      if (!this.moving || this.player.anims.currentAnim?.key !== animationKey) {
        this.moving = true;
        this.player.play(animationKey, true);
      }
      this.ambient.trail.step(this.player.x, this.player.y, time);
    } else {
      body.setVelocity(0, 0);
      if (this.moving) {
        this.moving = false;
        this.player.stop();
        this.player.setTexture(
          mascotTextureKey(this.design.id),
          mascotFrameIndex(this.facing, 'idle'),
        );
      }
    }

    this.player.setDepth(this.player.y);
    this.shadow.setPosition(this.player.x, this.player.y - 2);
    this.shadow.setDepth(this.player.y - 1);
    const reducedMotion = this.data.get('reducedMotion') === true;
    this.shadow.setScale(reducedMotion ? 1 : 1 + Math.sin(time / 420) * 0.03, 1);

    // indicateur de proximité (fonction pure, testable)
    const nearest = nearestHotspot(this.player.x, this.player.y, this.hotspots);
    this.activeHotspot = nearest;
    if (nearest) {
      const promptY = nearest.type === 'chalet' ? CHALET.y - 22 : nearest.y - 96;
      this.prompt.show(hotspotPromptLabel(nearest), nearest.x, promptY);
    }
    else this.prompt.hide();
  }
}

export const VILLAGE_SCENE_KEY = 'Village';
