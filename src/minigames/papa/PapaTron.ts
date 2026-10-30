/**
 * PapaTron.ts — « Les Traîneaux Lumineux » (maison de Papa, clé bleue).
 * Arène quadrillée glacée : deux traîneaux lumineux avancent en continu.
 * Gagner deux manches sur trois. IA familiale, sans triche : elle raisonne
 * uniquement sur la grille d'occupation visible, avec une exploration bornée.
 */
import Phaser from 'phaser';
import { MinigameScene, type MinigameMeta } from '../common/MinigameScene';
import { audio } from '../../audio/audio';
import { burst, flash, floatText, shake, vignette } from '../../game/fx/effects';
import { bus } from '../../game/bus';
import { FONT, hudText, showOverlay } from '../common/shell';
import { bindSceneSwipes, type SwipeDirection } from '../common/gesture';
import { papaStepInterval } from '../common/difficulty';
import { PAPA_ARENA } from './layout';
import { isReverseTurn } from './direction';

let COLS: number = PAPA_ARENA.columns;
let ROWS: number = PAPA_ARENA.rows;
let CELL: number = PAPA_ARENA.cell;
let ARENA_X: number = PAPA_ARENA.x;
let ARENA_Y: number = PAPA_ARENA.y;

type Dir = { x: number; y: number };
const DIRS: Record<'up' | 'down' | 'left' | 'right', Dir> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const EMPTY = 0;
const PLAYER_TRAIL = 1;
const AI_TRAIL = 2;

interface Bike {
  x: number;
  y: number;
  dir: Dir;
  nextDir: Dir;
  trail: number;
  alive: boolean;
}

export class PapaTron extends MinigameScene {
  private occupancy!: Uint8Array;
  private player!: Bike;
  private ai!: Bike;
  private playerColor = 0x8fd4ff;
  private aiColor = 0xff9db1;
  private trailGfx!: Phaser.GameObjects.Graphics;
  private heads!: Phaser.GameObjects.Graphics;
  private stepMs = 78;
  private accumulator = 0;
  private roundActive = false;
  private roundNumber = 1;
  private playerWins = 0;
  private aiWins = 0;
  private hudRound!: Phaser.GameObjects.Text;
  private hudScore!: Phaser.GameObjects.Text;
  private hudNotice!: Phaser.GameObjects.Text;

  constructor() {
    super('PapaTron');
  }

  create() {
    const portrait = this.scale.height > this.scale.width;
    COLS = portrait ? 21 : PAPA_ARENA.columns;
    ROWS = portrait ? 36 : PAPA_ARENA.rows;
    CELL = portrait ? 30 : PAPA_ARENA.cell;
    ARENA_X = Math.round((this.scale.width - COLS * CELL) / 2);
    ARENA_Y = portrait ? 280 : PAPA_ARENA.y;
    this.paused = false;
    this.buildArena();
    this.buildHud();
    this.buildInput();
    if (portrait) this.buildTouchControls();
    vignette(this, { strength: 0.42, depth: 8400 });
    this.playerWins = 0;
    this.aiWins = 0;
    this.roundNumber = 1;
    this.over = false;
    if (this.introSeen) this.startRound();
    else {
      this.introSeen = true;
      this.showIntro();
    }
  }

  private buildArena() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x0b1a33, 0x0b1a33, 0x050c19, 0x050c19, 1);
    g.fillRect(0, 0, this.scale.width, this.scale.height);
    g.fillStyle(0x0d2038, 1);
    g.fillRoundedRect(ARENA_X - 12, ARENA_Y - 12, COLS * CELL + 24, ROWS * CELL + 24, 14);
    g.fillStyle(0x102943, 1);
    g.fillRect(ARENA_X, ARENA_Y, COLS * CELL, ROWS * CELL);
    g.lineStyle(3, 0x2e6b9e, 1);
    g.strokeRoundedRect(ARENA_X - 12, ARENA_Y - 12, COLS * CELL + 24, ROWS * CELL + 24, 14);

    // quadrillage glacé
    const grid = this.add.graphics();
    for (let r = 0; r < ROWS; r += 2) {
      grid.fillStyle(0x87cfff, 0.035);
      grid.fillRect(ARENA_X, ARENA_Y + r * CELL, COLS * CELL, CELL);
    }
    grid.lineStyle(1, 0x1b3e5e, 0.8);
    for (let c = 0; c <= COLS; c++) {
      grid.lineBetween(ARENA_X + c * CELL, ARENA_Y, ARENA_X + c * CELL, ARENA_Y + ROWS * CELL);
    }
    for (let r = 0; r <= ROWS; r++) {
      grid.lineBetween(ARENA_X, ARENA_Y + r * CELL, ARENA_X + COLS * CELL, ARENA_Y + r * CELL);
    }
    // reflets de glace
    for (let i = 0; i < 40; i++) {
      const x = ARENA_X + ((i * 173) % (COLS * CELL));
      const y = ARENA_Y + ((i * 97) % (ROWS * CELL));
      grid.fillStyle(0x7fd4ff, 0.05);
      grid.fillRect(x, y, CELL * 3, CELL);
    }

    this.trailGfx = this.add.graphics().setDepth(5);
    this.heads = this.add.graphics().setDepth(6);
  }

  private buildHud() {
    const portrait = this.scale.height > this.scale.width;
    const centerX = this.scale.width / 2;
    this.add
      .text(centerX, portrait ? 58 : 48, 'Les Traîneaux Lumineux', {
        fontFamily: FONT,
        fontSize: portrait ? '34px' : '28px',
        color: '#cfe4ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(40);
    this.add
      .text(centerX, portrait ? 96 : 74, 'Maison de Papa · clé bleue', { fontFamily: FONT, fontSize: portrait ? '18px' : '14px', color: '#a8c7e8' })
      .setOrigin(0.5)
      .setDepth(40);
    this.hudRound = hudText(this, ARENA_X, ARENA_Y - (portrait ? 42 : 32), 'Manche 1 / 3', portrait ? '20px' : '17px', '#d9e9ff');
    this.hudScore = hudText(this, ARENA_X + COLS * CELL, ARENA_Y - (portrait ? 42 : 32), 'Vous 0 — 0 Papa', portrait ? '20px' : '17px', '#d9e9ff', 'right');
    this.hudNotice = hudText(this, centerX, ARENA_Y + ROWS * CELL + (portrait ? 20 : 24), '', portrait ? '21px' : '14px', '#b8d4f0', 'center');
  }

  private buildInput() {
    const keyboard = this.input.keyboard!;
    const turn = (dir: Dir) => this.turn(dir);
    keyboard.on('keydown-UP', () => turn(DIRS.up));
    keyboard.on('keydown-DOWN', () => turn(DIRS.down));
    keyboard.on('keydown-LEFT', () => turn(DIRS.left));
    keyboard.on('keydown-RIGHT', () => turn(DIRS.right));
    keyboard.on('keydown-Z', () => turn(DIRS.up));
    keyboard.on('keydown-Q', () => turn(DIRS.left));
    keyboard.on('keydown-S', () => turn(DIRS.down));
    keyboard.on('keydown-D', () => turn(DIRS.right));
    keyboard.on('keydown-ESC', () => this.togglePause());

    const directions: Record<SwipeDirection, Dir> = {
      up: DIRS.up,
      down: DIRS.down,
      left: DIRS.left,
      right: DIRS.right,
    };
    const removeSwipes = bindSceneSwipes(
      this,
      (direction) => turn(directions[direction]),
      () => this.roundActive && !this.paused && !this.over,
    );
    this.events.once('shutdown', removeSwipes);
  }

  private turn(dir: Dir) {
    if (!this.roundActive || this.paused || this.over) return;
    if (isReverseTurn(this.player.dir, dir)) return;
    this.player.nextDir = dir;
  }

  private buildTouchControls() {
    const y = 1470;
    const controls = [
      { x: 96, label: '←', dir: DIRS.left },
      { x: 272, label: '↑', dir: DIRS.up },
      { x: 448, label: '↓', dir: DIRS.down },
      { x: 624, label: '→', dir: DIRS.right },
    ];
    for (const control of controls) {
      const button = this.add.circle(control.x, y, 52, 0x0b1530, 0.9).setDepth(120);
      button.setStrokeStyle(3, 0xb8d4f0, 0.95).setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => this.turn(control.dir));
      this.add
        .text(control.x, y, control.label, { fontFamily: FONT, fontSize: '40px', color: '#f3f6ff', fontStyle: 'bold' })
        .setOrigin(0.5)
        .setDepth(121);
    }
  }

  // ------------------------------------------------------------------ manches
  private startRound() {
    this.occupancy = new Uint8Array(COLS * ROWS);
    this.player = { x: 5, y: Math.floor(ROWS / 2), dir: DIRS.right, nextDir: DIRS.right, trail: PLAYER_TRAIL, alive: true };
    this.ai = { x: COLS - 6, y: Math.floor(ROWS / 2), dir: DIRS.left, nextDir: DIRS.left, trail: AI_TRAIL, alive: true };
    this.mark(this.player.x, this.player.y, PLAYER_TRAIL);
    this.mark(this.ai.x, this.ai.y, AI_TRAIL);
    this.trailGfx.clear();
    this.heads.clear();
    this.accumulator = 0;
    this.stepMs = papaStepInterval(this.roundNumber);
    this.roundActive = true;
    this.over = false;
    this.hudRound.setText(`Manche ${this.roundNumber} / 3`);
    this.hudNotice.setText('Flèches / ZQSD ou glissez pour tourner — Échap : pause');
    this.updateHud();
    this.drawTrails();
  }

  private index(x: number, y: number) {
    return y * COLS + x;
  }

  private mark(x: number, y: number, value: number) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
    this.occupancy[this.index(x, y)] = value;
  }

  private isFree(x: number, y: number) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
    return this.occupancy[this.index(x, y)] === EMPTY;
  }

  update(_time: number, delta: number) {
    if (!this.roundActive || this.paused) return;
    this.accumulator += delta;
    while (this.accumulator >= this.stepMs) {
      this.accumulator -= this.stepMs;
      this.step();
      if (!this.roundActive) break;
    }
    this.drawHeads();
  }

  private step() {
    // décision de l'IA, une case à la fois
    this.ai.nextDir = this.chooseAiDirection();

    const playerNext = { x: this.player.x + this.player.dir.x, y: this.player.y + this.player.dir.y };
    const aiNext = { x: this.ai.x + this.ai.dir.x, y: this.ai.y + this.ai.dir.y };

    const playerCrashed = !this.isFree(playerNext.x, playerNext.y);
    const aiCrashed = !this.isFree(aiNext.x, aiNext.y);
    const headOn = playerNext.x === aiNext.x && playerNext.y === aiNext.y;

    if (!playerCrashed) {
      this.mark(this.player.x, this.player.y, PLAYER_TRAIL);
      this.player.x = playerNext.x;
      this.player.y = playerNext.y;
    }
    if (!aiCrashed) {
      this.mark(this.ai.x, this.ai.y, AI_TRAIL);
      this.ai.x = aiNext.x;
      this.ai.y = aiNext.y;
    }
    this.drawTrails();

    if (playerCrashed || aiCrashed || headOn) {
      this.roundActive = false;
      const playerLost = playerCrashed || headOn;
      const aiLost = aiCrashed || headOn;
      if (playerLost && aiLost) this.endRound('draw');
      else if (playerLost) this.endRound('ai');
      else this.endRound('player');
    } else {
      // application du virage pour le tour suivant
      this.player.dir = this.player.nextDir;
      this.ai.dir = this.ai.nextDir;
    }
  }

  /** IA : évalue les trois directions possibles et maximise l'espace libre (profondeur bornée). */
  private chooseAiDirection(): Dir {
    const options: Dir[] = [DIRS.up, DIRS.down, DIRS.left, DIRS.right].filter(
      (dir) => !(dir.x === -this.ai.dir.x && dir.y === -this.ai.dir.y),
    );
    const viable = options.filter((dir) => this.isFree(this.ai.x + dir.x, this.ai.y + dir.y));
    // Aucune issue : on garde le cap (la collision est inévitable, l'IA ne triche pas).
    if (viable.length === 0) return this.ai.dir;

    const playerSpace = this.floodFill(this.player.x, this.player.y, 60);
    let best: Dir = viable[0];
    let bestScore = -Infinity;
    for (const dir of viable) {
      const space = this.floodFill(this.ai.x + dir.x, this.ai.y + dir.y, 90);
      // chercher à enfermer le joueur : réduire son espace vaut quelques cases
      const score = space * 1.6 - playerSpace * 0.6 + Phaser.Math.Between(0, 2);
      if (score > bestScore) {
        bestScore = score;
        best = dir;
      }
    }
    return best;
  }

  private floodFill(startX: number, startY: number, limit: number): number {
    const seen = new Set<number>();
    const queue = [[startX, startY]];
    let count = 0;
    while (queue.length > 0 && count < limit) {
      const [x, y] = queue.shift()!;
      const id = this.index(x, y);
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS || seen.has(id)) continue;
      if (!this.isFree(x, y)) continue;
      seen.add(id);
      count++;
      queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    return count;
  }

  private drawTrails() {
    const g = this.trailGfx;
    g.clear();
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const value = this.occupancy[this.index(x, y)];
        if (value === EMPTY) continue;
        const color = value === PLAYER_TRAIL ? this.playerColor : this.aiColor;
        const px = ARENA_X + x * CELL;
        const py = ARENA_Y + y * CELL;
        const pad = 2;
        g.fillStyle(color, 0.98);
        g.fillRect(px + pad, py + pad, CELL - pad * 2, CELL - pad * 2);
        g.lineStyle(1, 0xffffff, 0.62);
        g.strokeRect(px + pad, py + pad, CELL - pad * 2, CELL - pad * 2);
        g.fillStyle(0xffffff, 0.38);
        g.fillRect(px + pad + 1, py + pad + 1, CELL - pad * 2 - 2, 3);
        g.fillStyle(0x102943, 0.25);
        g.fillRect(px + pad + 1, py + CELL - pad - 3, CELL - pad * 2 - 2, 2);
      }
    }
  }

  private crashBurst(result: 'player' | 'ai' | 'draw') {
    if (result === 'player') burst(this, ARENA_X + this.ai.x * CELL, ARENA_Y + this.ai.y * CELL, { count: 18, speed: 200 });
    else burst(this, ARENA_X + this.player.x * CELL, ARENA_Y + this.player.y * CELL, { count: 18, speed: 200, colors: [0xff9db1, 0xffffff] });
  }

  private drawHeads() {
    const g = this.heads;
    g.clear();
    const drawBike = (bike: Bike, color: number) => {
      const cx = ARENA_X + bike.x * CELL + CELL / 2;
      const cy = ARENA_Y + bike.y * CELL + CELL / 2;
      g.fillStyle(color, 0.34);
      g.fillCircle(cx, cy, CELL * 1.08);
      g.fillStyle(0xffffff, 0.34);
      g.fillCircle(cx, cy, CELL * 0.72);
      g.fillStyle(color, 1);
      g.fillRoundedRect(cx - CELL * 0.44, cy - CELL * 0.39, CELL * 0.88, CELL * 0.78, 4);
      g.lineStyle(2, 0xffffff, 0.9);
      g.strokeRoundedRect(cx - CELL * 0.44, cy - CELL * 0.39, CELL * 0.88, CELL * 0.78, 4);
      g.fillStyle(0xffffff, 1);
      g.fillRect(cx - 3, cy - 3, 6, 6);
    };
    drawBike(this.player, this.playerColor);
    drawBike(this.ai, this.aiColor);
  }

  private endRound(result: 'player' | 'ai' | 'draw') {
    if (result === 'player') this.playerWins++;
    if (result === 'ai') this.aiWins++;
    this.updateHud();
    this.crashBurst(result);
    this.flashCrash(result);
    this.time.delayedCall(750, () => {
      if (this.playerWins >= 2) this.finish(true);
      else if (this.aiWins >= 2) this.finish(false);
      else {
        this.roundNumber++;
        this.hudNotice.setText(
          result === 'draw' ? 'Collision frontale : manche rejouée.' : result === 'player' ? 'Manche gagnée !' : 'Manche perdue…',
        );
        this.startRound();
      }
    });
  }

  private flashCrash(result: 'player' | 'ai' | 'draw') {
    audio.play(result === 'player' ? 'coin' : 'crash');
    if (result === 'player') {
      floatText(this, 640, 300, 'Manche gagnée !', { size: '30px', color: '#8fd4ff', rise: 80, duration: 1100 });
    } else if (result === 'ai') {
      floatText(this, 640, 300, 'Manche perdue', { size: '28px', color: '#ff9db1', rise: 80, duration: 1100 });
    }
    const color = result === 'player' ? 0x8fd4ff : result === 'ai' ? 0xff9db1 : 0xffe9a8;
    flash(this, color, 0.16, 500);
    shake(this, 180, 0.004);
  }

  private updateHud() {
    this.hudScore.setText(`Vous ${this.playerWins} — ${this.aiWins} Papa`);
    this.hudScore.setColor(this.playerWins >= 2 ? '#7ae582' : this.aiWins >= 2 ? '#ff9db1' : '#cfe4ff');
  }

  // ---------------------------------------------------------------- socle commun
  protected meta(): MinigameMeta {
    return {
      gameId: 'papa-tron',
      title: '🛷 Les Traîneaux Lumineux',
      subtitle: 'Maison de Papa — clé bleue',
      accent: '#a6d8ff',
      rules: [
        "Deux traîneaux lumineux filent sur l'arène glacée sans jamais s'arrêter.",
        'Sur téléphone, touche les flèches en bas ou glisse dans l’arène. Le demi-tour immédiat est interdit.',
        'Toucher un mur, votre propre trace ou la trace de Papa fait perdre la manche.',
        'Gagnez deux manches sur trois. Échap met en pause.',
      ],
      win: { title: '✨ Arène dominée !', subtitle: 'La clé bleue rejoint l’inventaire familial' },
      lose: { title: 'Trace percutée…', subtitle: 'Papa garde la main, on retente ?', accent: '#ff9db1' },
      pauseLine: 'Les traîneaux sont en suspens.',
    };
  }

  protected onIntroAccepted(): void {
    this.playerWins = 0;
    this.aiWins = 0;
    this.roundNumber = 1;
    this.over = false;
    this.startRound();
  }

  protected summaryLines(): string[] {
    return [`Score final : Vous ${this.playerWins} — ${this.aiWins} Papa`];
  }

  protected resultDetail(): string {
    return `${this.playerWins} manches gagnées`;
  }

  protected setSimulationRunning(running: boolean): void {
    this.roundActive = running && !this.over;
  }
}
