/** Pièce intérieure du chalet familial : déplacements, porte et coffre des clés. */
import Phaser from 'phaser';
import type { PlayerProgress } from '../../data/types';
import { emptyProgress } from '../../data/mock/seed';
import { getMascot, MASCOT_ORDER } from '../../mascots';
import {
  mascotTextureKey,
  preloadMascotSheet,
  registerMascotTextures,
  walkAnimKey,
} from '../../mascots/renderer';
import { mascotFrameIndex } from '../../mascots/spriteSheet';
import type { Direction, MascotDesign } from '../../mascots/types';
import { audio } from '../../audio/audio';
import { bus } from '../bus';
import { burst, pulseScale, softGlow, twinkle } from '../fx/effects';
import { prefersReducedMotion } from '../fx/motionPreference';
import { CHEST } from '../village/villageArt';
import { createChest, type ChestActor } from '../village/actors';
import { InteractionPrompt } from '../village/prompt';
import { paintChaletInterior } from './chaletArt';
import { configurePlayerBody, PLAYER_SCALE_FACTOR } from '../playerSize';
import familyOutdoor from '../../assets/family-outdoor.png';
import familyCouple from '../../assets/family-couple.png';
import familyChristmas from '../../assets/family-christmas.png';

const ROOM_W = 1280;
const ROOM_H = 720;
const WALK_SPEED = 215;
const PLAYER_START = { x: 850, y: 560 };
const EXIT = { x: 640, y: 640 };
const LIST_NOTE = { x: 366, y: 515 };
const NOTE_DEPTH = 542;

type RoomAction = 'chest' | 'list' | 'exit' | null;

export class ChaletScene extends Phaser.Scene {
  private design: MascotDesign = getMascot('Maman');
  private progress!: PlayerProgress;
  private player!: Phaser.Physics.Arcade.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private prompt!: InteractionPrompt;
  private chest!: ChestActor;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private facing: Direction = 'down';
  private moving = false;
  private activeAction: RoomAction = null;
  private exiting = false;
  private touchDirections = { up: false, down: false, left: false, right: false };
  private removeTouchListeners: (() => void)[] = [];

  constructor() {
    super('ChaletInterior');
  }

  preload() {
    MASCOT_ORDER.forEach((mascotId) => preloadMascotSheet(this, mascotId));
    this.load.image('family-outdoor', familyOutdoor);
    this.load.image('family-couple', familyCouple);
    this.load.image('family-christmas', familyChristmas);
  }

  create(data: { design?: MascotDesign; progress?: PlayerProgress }) {
    this.design = data.design ?? this.design;
    this.progress = data.progress ?? emptyProgress('__family__');

    this.buildBackdrop();
    this.buildFamilyPhotos();
    this.buildRoomLighting();
    this.chest = createChest(this, this.progress);
    this.buildRoom();
    this.buildListNote();
    this.buildPlayer();
    this.prompt = new InteractionPrompt(this);
    this.buildInput();
    this.configureCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.configureCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.configureCamera, this);
      this.removeTouchListeners.forEach((remove) => remove());
      this.removeTouchListeners = [];
    });
    if (!prefersReducedMotion()) this.cameras.main.fadeIn(220, 8, 14, 32);
  }

  private configureCamera() {
    const portrait = this.scale.width <= 820 && this.scale.height > this.scale.width;
    this.cameras.main.setBounds(portrait ? -260 : 0, portrait ? -150 : 0, ROOM_W + (portrait ? 520 : 0), ROOM_H + (portrait ? 300 : 0));
    this.cameras.main.setZoom(portrait ? 2.05 : 1);
    if (portrait) this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    else {
      this.cameras.main.stopFollow();
      this.cameras.main.centerOn(640, 360);
    }
  }

  private buildBackdrop() {
    const key = 'chalet-interior';
    if (this.textures.exists(key)) this.textures.remove(key);
    // Portrait framing can reveal a wider camera view than the 16:9 room art.
    // Keep that margin opaque so the paused village never bleeds through it.
    this.add.rectangle(-260, -150, ROOM_W + 520, ROOM_H + 300, 0x241b2a)
      .setOrigin(0, 0)
      .setDepth(-110);
    const canvas = document.createElement('canvas');
    canvas.width = ROOM_W;
    canvas.height = ROOM_H;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      paintChaletInterior(ctx);
    }
    this.textures.addCanvas(key, canvas);
    this.add.image(0, 0, key).setOrigin(0, 0).setDepth(-100);
  }

  private buildRoomLighting() {
    softGlow(this, 640, 346, { color: 0xff9e45, scale: 3.2, alpha: 0.18, depth: 180 });
    const colors = [0xff5d73, 0xffd166, 0x7ae582, 0x6cc6ff, 0xc99bff];
    for (let i = 0; i < 20; i++) {
      const light = this.add
        .circle(162 + i * 50, 84 + (i % 2) * 7, 3.5, colors[i % colors.length], 0.95)
        .setDepth(240);
      light.setBlendMode(Phaser.BlendModes.ADD);
      twinkle(this, light, 0.32, 1, 1450 + (i % 4) * 180);
    }
    // Quelques lumières animées sur le sapin, sans recouvrir la liste accrochée.
    const treeLights = [
      [280, 441], [258, 469], [296, 477], [247, 506], [282, 512],
      [310, 520], [235, 543], [271, 548], [303, 557], [222, 580],
      [259, 583], [293, 590], [322, 602], [239, 613], [280, 616],
    ];
    treeLights.forEach(([x, y], index) => {
      const light = this.add.rectangle(x, y, 4, 4, colors[index % colors.length], 0.9).setDepth(200);
      twinkle(this, light, 0.35, 1, 1200 + (index % 5) * 170);
    });
    // Les reflets des flammes varient doucement, même si le feu reste en pixels.
    [[582, 377], [625, 355], [672, 374]].forEach(([x, y], index) => {
      const ember = this.add.rectangle(x, y, 5, 5, 0xffedab, 0.8).setDepth(185);
      twinkle(this, ember, 0.25, 0.85, 850 + index * 180);
    });
  }

  private buildFamilyPhotos() {
    const frames = [
      { key: 'family-outdoor', x: 963, y: 350, width: 70, height: 55 },
      { key: 'family-couple', x: 1038, y: 361, width: 70, height: 44 },
      { key: 'family-christmas', x: 1124, y: 340, width: 52, height: 65 },
    ];
    for (const { key, x, y, width, height } of frames) {
      const frame = this.add.graphics().setDepth(-98);
      frame.fillStyle(0x4c302a).fillRect(x + 2, y + 2, width, height);
      frame.fillStyle(0x9c653f).fillRect(x, y, width, height);
      frame.fillStyle(0xf2ce8f).fillRect(x + 3, y + 3, width - 6, height - 6);
      this.add.image(x + width / 2, y + height / 2, key)
        .setDisplaySize(width - 12, height - 12)
        .setDepth(-97);
    }
  }

  private buildRoom() {
    const obstacles = [
      { x: 464, y: 156, w: 352, h: 278 }, // cheminée
      { x: 194, y: 410, w: 172, h: 224 }, // sapin et cadeaux
      { x: 75, y: 475, w: 100, h: 81 }, // fauteuil
      { x: 850, y: 421, w: 64, h: 31 }, // panier à bûches
      { x: CHEST.x - 42, y: CHEST.y - 38, w: 84, h: 76 }, // petit coffre
      { x: 956, y: 416, w: 242, h: 45 }, // commode des photos
    ];
    const statics = this.physics.add.staticGroup();
    obstacles.forEach((rect) => {
      const zone = this.add.zone(rect.x + rect.w / 2, rect.y + rect.h / 2, rect.w, rect.h);
      this.physics.add.existing(zone, true);
      statics.add(zone);
    });
    this.data.set('statics', statics);
  }

  private buildListNote() {
    const art = this.add.graphics();
    // Ficelle et petit nœud : le papier pend directement à une branche du sapin.
    art.fillStyle(0xd0a35f, 1);
    art.fillRect(-2, -74, 4, 19);
    art.fillStyle(0x9e4050, 1);
    art.fillRect(-9, -73, 7, 4);
    art.fillRect(2, -73, 7, 4);
    art.fillRect(-3, -74, 6, 6);

    // Feuille crème bordée de rouge, ruban doré et cachet de cire.
    art.fillStyle(0x5d382f, 1);
    art.fillRect(-27, -58, 54, 64);
    art.fillStyle(0xf1d5a2, 1);
    art.fillRect(-24, -55, 48, 58);
    art.fillStyle(0xfff2cf, 1);
    art.fillRect(-21, -52, 42, 52);
    art.fillStyle(0x9e4050, 1);
    art.fillRect(-21, -49, 42, 11);
    art.fillStyle(0xf5d58f, 1);
    art.fillRect(-17, -46, 34, 2);
    art.fillRect(-17, -42, 34, 2);
    art.fillStyle(0x967150, 1);
    art.fillRect(-14, -31, 28, 2);
    art.fillRect(-14, -24, 24, 2);
    art.fillRect(-14, -17, 20, 2);
    art.fillStyle(0xd9b880, 1);
    art.fillRect(-14, -11, 25, 2);
    art.fillStyle(0x9e4050, 1);
    art.fillCircle(12, -7, 5);
    art.fillStyle(0xffd166, 1);
    art.fillRect(10, -10, 5, 5);
    art.fillStyle(0xffffff, 0.6);
    art.fillRect(-18, -49, 2, 40);

    const title = this.add.text(0, -44, 'NOËL', {
      fontFamily: 'Georgia, serif',
      fontSize: '7px',
      color: '#fff1d2',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    const note = this.add.container(LIST_NOTE.x, NOTE_DEPTH, [art, title]).setDepth(NOTE_DEPTH);
    this.data.set('listNoteVisual', note);

    const glow = softGlow(this, LIST_NOTE.x, LIST_NOTE.y - 22, {
      color: 0xffd166,
      scale: 0.65,
      alpha: 0.13,
      depth: LIST_NOTE.y - 8,
    });
    glow.setBlendMode(Phaser.BlendModes.ADD);

    // Grande cible transparente : la feuille garde son apparence pixel art,
    // mais reste facile à toucher sur un écran étroit.
    const hitArea = this.add.zone(LIST_NOTE.x, LIST_NOTE.y, 132, 132).setDepth(NOTE_DEPTH + 1);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => this.openWishlist());
    this.data.set('listNoteHitArea', hitArea);
  }

  private buildPlayer() {
    registerMascotTextures(this, this.design);
    this.shadow = this.add
      .ellipse(PLAYER_START.x, PLAYER_START.y - 2, 48, 16, 0x1b2a44, 0.22)
      .setDepth(PLAYER_START.y - 3);
    this.player = this.physics.add
      .sprite(PLAYER_START.x, PLAYER_START.y, mascotTextureKey(this.design.id), mascotFrameIndex('down', 'idle'))
      .setOrigin(0.5, 0.94)
      .setScale(this.design.scale * PLAYER_SCALE_FACTOR)
      .setDepth(560);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    configurePlayerBody(body);
    body.setCollideWorldBounds(true);
    this.physics.world.setBounds(72, 76, ROOM_W - 144, ROOM_H - 92);
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
    keyboard.on('keydown-ESC', () => bus.emit('pause:open', undefined));
    this.removeTouchListeners.push(
      bus.on('mobile:move', ({ direction, pressed }) => { this.touchDirections[direction] = pressed; }),
      bus.on('mobile:interact', () => this.interact()),
    );
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      if (Phaser.Math.Distance.Between(point.x, point.y, EXIT.x, EXIT.y) < 116) this.exitToVillage();
    });
  }

  private interact() {
    if (!this.activeAction) return;
    if (this.activeAction === 'chest') {
      audio.play('click');
      pulseScale(this, this.chest.sprite, 1.08, 130);
      burst(this, CHEST.x, CHEST.y - 34, { kind: 'sparkle', count: 10, speed: 130, lifespan: 520 });
      bus.emit('chest:interact', undefined);
      return;
    }
    if (this.activeAction === 'list') {
      this.openWishlist();
      return;
    }
    this.exitToVillage();
  }

  private exitToVillage() {
    if (this.exiting) return;
    this.exiting = true;
    audio.play('close');
    if (!prefersReducedMotion()) this.cameras.main.fadeOut(180, 8, 14, 32);
    this.time.delayedCall(prefersReducedMotion() ? 0 : 190, () => bus.emit('chalet:exit', undefined));
  }

  private openWishlist() {
    audio.play('open');
    burst(this, LIST_NOTE.x, LIST_NOTE.y - 24, { kind: 'sparkle', count: 8, speed: 90, lifespan: 420 });
    bus.emit('chalet:list', undefined);
  }

  applyProgress(progress: PlayerProgress) {
    this.progress = progress;
    this.chest?.refresh(progress);
  }

  update() {
    if (!this.player) return;
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
      const direction: Direction = Math.abs(vx) > Math.abs(vy) ? 'side' : vy > 0 ? 'down' : 'up';
      if (Math.abs(vx) > 0 && Math.abs(vx) >= Math.abs(vy)) this.player.setFlipX(vx < 0);
      if (direction !== this.facing) {
        this.facing = direction;
        this.player.setTexture(mascotTextureKey(this.design.id), mascotFrameIndex(direction, 'walkA'));
      }
      const animation = walkAnimKey(this.design.id, this.facing);
      if (!this.moving || this.player.anims.currentAnim?.key !== animation) {
        this.moving = true;
        this.player.play(animation, true);
      }
    } else {
      body.setVelocity(0, 0);
      if (this.moving) {
        this.moving = false;
        this.player.stop();
        this.player.setTexture(mascotTextureKey(this.design.id), mascotFrameIndex(this.facing, 'idle'));
      }
    }

    this.player.setDepth(this.player.y);
    this.shadow.setPosition(this.player.x, this.player.y - 2).setDepth(this.player.y - 1);
    const toChest = Phaser.Math.Distance.Between(this.player.x, this.player.y, CHEST.x, CHEST.y);
    const toList = Phaser.Math.Distance.Between(this.player.x, this.player.y, LIST_NOTE.x, LIST_NOTE.y);
    const toExit = Phaser.Math.Distance.Between(this.player.x, this.player.y, EXIT.x, EXIT.y);
    if (toChest < 92) {
      this.activeAction = 'chest';
      this.prompt.show('Déposer les clés', CHEST.x, CHEST.y - 88);
    } else if (toList < 112) {
      this.activeAction = 'list';
      this.prompt.show('Lire la liste de Noël', LIST_NOTE.x, LIST_NOTE.y - 150);
    } else if (toExit < 92) {
      this.activeAction = 'exit';
      this.prompt.show('Retourner au village', EXIT.x, EXIT.y - 34);
    } else {
      this.activeAction = null;
      this.prompt.hide();
    }
  }
}
