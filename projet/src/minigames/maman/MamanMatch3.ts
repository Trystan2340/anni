/**
 * MamanMatch3.ts — « La Fabrique de Friandises » (maison de Maman, clé rose).
 * Mécanique originale de combinaisons de trois, sur une grille 8 × 8.
 * Objectif : réunir 20 objets de Noël en 25 coups maximum.
 *
 * Optimisations demandées :
 *  - seules les lignes/colonnes touchées par l'échange et par la chute sont analysées ;
 *  - détection de blocage avec régénération (jamais de boucle infinie).
 */
import Phaser from 'phaser';
import { MinigameScene, type MinigameMeta } from '../common/MinigameScene';
import { audio } from '../../audio/audio';
import { burst, floatText, shake, vignette } from '../../game/fx/effects';
import { prefersReducedMotion } from '../../game/fx/motionPreference';
import { bus } from '../../game/bus';
import { FONT, drawPixelCanvas, hudText, showOverlay } from '../common/shell';
import { classifySwipe, screenSwipeThreshold } from '../common/gesture';

const COLS = 8;
const ROWS = 8;
// Une seule scène de mini-jeu tourne à la fois : ces mesures suivent son canvas.
let CELL = 62;
const SYMBOLS = ['canne', 'etoile', 'flocon', 'biscuit', 'clochette'] as const;
type SymbolName = (typeof SYMBOLS)[number];

const OBJECTIF = 20;
const COUPS = 25;
let BOARD_X = 392;
let BOARD_Y = 136;
const DEFAULT_HINT = 'Glissez vers une case voisine ou cliquez deux cases — flèches + Espace';
const HINT_DELAY = 7_000;

type Grid = (number | -1)[][];

export class MamanMatch3 extends MinigameScene {
  private grid: Grid = [];
  private tiles: (Phaser.GameObjects.Image | null)[][] = [];
  private busy = false;
  private selected: { r: number; c: number } | null = null;
  private cursor = { r: 3, c: 3 };
  private movesLeft = COUPS;
  private collected = 0;
  private hudCollected!: Phaser.GameObjects.Text;
  private hudMoves!: Phaser.GameObjects.Text;
  private hudHint!: Phaser.GameObjects.Text;
  private highlight!: Phaser.GameObjects.Rectangle;
  private hintHighlight!: Phaser.GameObjects.Rectangle;
  private hintHighlightSecond!: Phaser.GameObjects.Rectangle;
  private pointerStart: { point: { x: number; y: number }; cell: { r: number; c: number } } | null = null;
  private idleTimer = 0;
  private hintShown = false;

  constructor() {
    super('MamanMatch3');
  }

  create() {
    const portrait = this.scale.height > this.scale.width;
    CELL = portrait ? 82 : 62;
    BOARD_X = Math.round((this.scale.width - COLS * CELL) / 2);
    BOARD_Y = portrait ? 420 : 136;
    this.buildTextures();
    this.buildBackdrop();
    this.buildHud();
    this.buildInput();
    this.resetBoard();
    vignette(this, { strength: 0.42, depth: 8400 });
    if (this.introSeen) this.beginPlay();
    else {
      this.introSeen = true;
      this.showIntro();
    }
  }

  /** Commencer / Rejouer sans repasser par le tutoriel. */
  private beginPlay() {
    this.over = false;
    this.paused = false;
    this.busy = false;
    this.selected = null;
    this.idleTimer = 0;
    this.hintShown = false;
    this.hintHighlight?.setVisible(false);
    this.hintHighlightSecond?.setVisible(false);
  }

  // ------------------------------------------------------------------ décors
  private buildTextures() {
    const sprites: Record<SymbolName, (ctx: CanvasRenderingContext2D) => void> = {
      canne: (ctx) => {
        ctx.fillStyle = '#f7f9ff';
        ctx.fillRect(24, 16, 16, 40);
        ctx.fillRect(24, 16, 28, 16);
        ctx.fillRect(40, 24, 12, 12);
        ctx.fillStyle = '#e2709a';
        for (let i = 0; i < 5; i++) ctx.fillRect(24, 20 + i * 8, 16, 4);
        ctx.fillStyle = '#b84d76';
        ctx.fillRect(44, 20, 8, 8);
      },
      etoile: (ctx) => {
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const angle = (Math.PI / 5) * i - Math.PI / 2;
          const radius = i % 2 === 0 ? 28 : 12;
          const x = 32 + Math.cos(angle) * radius;
          const y = 34 + Math.sin(angle) * radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff3c4';
        ctx.fillRect(28, 26, 8, 8);
      },
      flocon: (ctx) => {
        ctx.strokeStyle = '#8fd4ff';
        ctx.lineWidth = 6;
        for (let i = 0; i < 3; i++) {
          const angle = (Math.PI / 3) * i;
          ctx.beginPath();
          ctx.moveTo(32 - Math.cos(angle) * 26, 32 - Math.sin(angle) * 26);
          ctx.lineTo(32 + Math.cos(angle) * 26, 32 + Math.sin(angle) * 26);
          ctx.stroke();
        }
        ctx.fillStyle = '#d8efff';
        ctx.fillRect(28, 28, 8, 8);
      },
      biscuit: (ctx) => {
        ctx.fillStyle = '#c98f4f';
        ctx.fillRect(12, 14, 40, 38);
        ctx.fillRect(16, 10, 32, 46);
        ctx.fillStyle = '#8a5a2b';
        ctx.fillRect(20, 20, 8, 8);
        ctx.fillRect(38, 26, 8, 8);
        ctx.fillRect(26, 38, 8, 8);
        ctx.fillRect(42, 40, 6, 6);
      },
      clochette: (ctx) => {
        ctx.fillStyle = '#f2c14e';
        ctx.beginPath();
        ctx.moveTo(32, 10);
        ctx.lineTo(48, 42);
        ctx.lineTo(16, 42);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(14, 42, 36, 8);
        ctx.fillStyle = '#b8891c';
        ctx.fillRect(28, 50, 8, 6);
        ctx.fillStyle = '#fff1c4';
        ctx.fillRect(26, 22, 6, 10);
      },
    };
    for (const name of SYMBOLS) {
      drawPixelCanvas(this, `sym-${name}`, 64, 64, sprites[name]);
    }
  }

  private buildBackdrop() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x1b2a4d, 0x1b2a4d, 0x0d1730, 0x0d1730, 1);
    g.fillRect(0, 0, this.scale.width, this.scale.height);
    // papier peint de la fabrique
    for (let i = 0; i < 40; i++) {
      const x = (i * 137) % this.scale.width;
      const y = (i * 211) % this.scale.height;
      this.add.circle(x, y, 3, 0xffffff, 0.05);
    }
    // plateau
    const board = this.add.graphics();
    board.fillStyle(0x0a1226, 0.9);
    board.fillRoundedRect(BOARD_X - 18, BOARD_Y - 46, COLS * CELL + 36, ROWS * CELL + 62, 18);
    board.lineStyle(3, 0x35507f, 1);
    board.strokeRoundedRect(BOARD_X - 18, BOARD_Y - 46, COLS * CELL + 36, ROWS * CELL + 62, 18);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const alt = (r + c) % 2 === 0;
        board.fillStyle(alt ? 0x16223f : 0x131e36, 1);
        board.fillRoundedRect(BOARD_X + c * CELL + 3, BOARD_Y + r * CELL + 3, CELL - 6, CELL - 6, 8);
        board.fillStyle(0xffffff, 0.035);
        board.fillRoundedRect(BOARD_X + c * CELL + 7, BOARD_Y + r * CELL + 6, CELL - 14, 2, 1);
        board.lineStyle(1, alt ? 0x26385d : 0x223250, 0.9);
        board.strokeRoundedRect(BOARD_X + c * CELL + 3, BOARD_Y + r * CELL + 3, CELL - 6, CELL - 6, 8);
      }
    }
    this.highlight = this.add
      .rectangle(BOARD_X + this.cursor.c * CELL + CELL / 2, BOARD_Y + this.cursor.r * CELL + CELL / 2, CELL - 6, CELL - 6)
      .setStrokeStyle(3, 0xffe9a8, 0.95)
      .setFillStyle(0xffe9a8, 0.08)
      .setDepth(14);
    this.hintHighlight = this.add
      .rectangle(0, 0, CELL - 10, CELL - 10)
      .setStrokeStyle(3, 0x7ae582, 0.95)
      .setFillStyle(0x7ae582, 0.12)
      .setDepth(12)
      .setVisible(false);
    this.hintHighlightSecond = this.add
      .rectangle(0, 0, CELL - 10, CELL - 10)
      .setStrokeStyle(3, 0x7ae582, 0.95)
      .setFillStyle(0x7ae582, 0.12)
      .setDepth(12)
      .setVisible(false);
  }

  private buildHud() {
    this.add
      .text(this.scale.width / 2, this.scale.height > this.scale.width ? 70 : 52, 'La Fabrique de Friandises', {
        fontFamily: FONT,
        fontSize: '28px',
        color: '#ffd9e6',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(40);
    this.add
      .text(this.scale.width / 2, this.scale.height > this.scale.width ? 104 : 80, 'Maison de Maman · clé rose', {
        fontFamily: FONT,
        fontSize: '14px',
        color: '#c3a9d8',
      })
      .setOrigin(0.5)
      .setDepth(40);

    const portrait = this.scale.height > this.scale.width;
    if (portrait) {
      const centerX = this.scale.width / 2;
      this.add
        .text(centerX, 196, 'Aligne trois friandises identiques', { fontFamily: FONT, fontSize: '22px', color: '#d8e3f6' })
        .setOrigin(0.5)
        .setDepth(40);
      ['sym-etoile', 'sym-biscuit', 'sym-flocon'].forEach((key, index) => {
        this.add.image(centerX + (index - 1) * 62, 264, key).setDisplaySize(42, 42).setDepth(40);
      });
      this.add
        .text(centerX, 1230, 'La recette parfaite tient en trois !', { fontFamily: FONT, fontSize: '22px', color: '#ffd9e6' })
        .setOrigin(0.5)
        .setDepth(40);
      ['sym-canne', 'sym-clochette', 'sym-etoile'].forEach((key, index) => {
        this.add.image(centerX + (index - 1) * 72, 1300, key).setDisplaySize(48, 48).setDepth(40);
      });
    }
    const hudY = portrait ? BOARD_Y - 48 : BOARD_Y - 34;
    this.hudCollected = hudText(this, BOARD_X, hudY, `Objets de Noël : ${this.collected} / ${OBJECTIF}`, portrait ? '20px' : '17px');
    this.hudMoves = hudText(this, BOARD_X + COLS * CELL, hudY, `Coups : ${this.movesLeft}`, portrait ? '20px' : '17px', '#ffd9e6', 'right');
    this.hudHint = hudText(
      this,
      this.scale.width / 2,
      BOARD_Y + ROWS * CELL + (portrait ? 42 : 26),
      portrait ? 'Glisse une friandise sur sa voisine pour échanger' : DEFAULT_HINT,
      portrait ? '18px' : '13px',
      '#b8c9e8',
      'center',
    );
  }

  private buildInput() {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.pointerStart = null;
      if (this.busy || this.over || this.paused) return;
      const cell = this.pointerCell(pointer.x, pointer.y);
      if (!cell) return;
      this.pointerStart = { point: { x: pointer.x, y: pointer.y }, cell };
    });
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      const start = this.pointerStart;
      this.pointerStart = null;
      if (!start || this.busy || this.over || this.paused) return;
      const target = this.pointerCell(pointer.x, pointer.y);
      if (!target) return;

      const direction = classifySwipe(
        start.point,
        { x: pointer.x, y: pointer.y },
        // En portrait les cases sont petites : le passage dans une case voisine
        // confirme déjà l'intention, même pour un glissement court.
        screenSwipeThreshold(this.scale.displayScale, this.scale.height > this.scale.width ? 12 : 36),
      );
      const adjacent = Math.abs(start.cell.r - target.r) + Math.abs(start.cell.c - target.c) === 1;
      if (direction && adjacent) {
        this.selected = null;
        this.trySwap(start.cell.r, start.cell.c, target.r, target.c);
        return;
      }
      this.handleSelect(target.r, target.c);
    });

    const keyboard = this.input.keyboard!;
    keyboard.on('keydown-LEFT', () => this.moveCursor(0, -1));
    keyboard.on('keydown-RIGHT', () => this.moveCursor(0, 1));
    keyboard.on('keydown-UP', () => this.moveCursor(-1, 0));
    keyboard.on('keydown-DOWN', () => this.moveCursor(1, 0));
    keyboard.on('keydown-SPACE', () => {
      if (this.busy || this.over || this.paused) return;
      this.handleSelect(this.cursor.r, this.cursor.c);
    });
    keyboard.on('keydown-ESC', () => this.togglePause());
  }

  private pointerCell(x: number, y: number): { r: number; c: number } | null {
    const c = Math.floor((x - BOARD_X) / CELL);
    const r = Math.floor((y - BOARD_Y) / CELL);
    return r >= 0 && r < ROWS && c >= 0 && c < COLS ? { r, c } : null;
  }

  private moveCursor(dr: number, dc: number) {
    if (this.over || this.paused) return;
    this.resetIdleHint();
    this.cursor.r = Phaser.Math.Clamp(this.cursor.r + dr, 0, ROWS - 1);
    this.cursor.c = Phaser.Math.Clamp(this.cursor.c + dc, 0, COLS - 1);
    this.highlight.setPosition(
      BOARD_X + this.cursor.c * CELL + CELL / 2,
      BOARD_Y + this.cursor.r * CELL + CELL / 2,
    );
  }

  update(_time: number, delta: number) {
    if (this.over || this.paused || this.busy) {
      this.idleTimer = 0;
      return;
    }
    if (this.hintShown || this.selected !== null) return;
    this.idleTimer += delta;
    if (this.idleTimer >= HINT_DELAY) this.showSuggestedMove();
  }

  private resetIdleHint() {
    this.idleTimer = 0;
    this.hintShown = false;
    this.hintHighlight?.setVisible(false);
    this.hintHighlightSecond?.setVisible(false);
    this.hudHint?.setText(DEFAULT_HINT).setColor('#8fa6c9');
  }

  private showSuggestedMove() {
    const move = this.findLegalMove();
    if (!move) return;
    this.hintShown = true;
    this.hintHighlight.setPosition(BOARD_X + move.first.c * CELL + CELL / 2, BOARD_Y + move.first.r * CELL + CELL / 2);
    this.hintHighlightSecond.setPosition(BOARD_X + move.second.c * CELL + CELL / 2, BOARD_Y + move.second.r * CELL + CELL / 2);
    this.hintHighlight.setVisible(true);
    this.hintHighlightSecond.setVisible(true);
    this.hudHint.setText('Astuce : échangez les deux cases vertes — aucun coup consommé').setColor('#baf2c0');
  }

  // ------------------------------------------------------------------ plateau
  private resetBoard() {
    this.grid = [];
    this.tiles = [];
    for (let r = 0; r < ROWS; r++) {
      this.grid.push(new Array(COLS).fill(-1));
      this.tiles.push(new Array(COLS).fill(null));
    }
    // remplissage sans alignement initial
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let type = Phaser.Math.Between(0, SYMBOLS.length - 1);
        let guard = 0;
        while (this.wouldMatchAt(r, c, type) && guard++ < 40) {
          type = Phaser.Math.Between(0, SYMBOLS.length - 1);
        }
        this.grid[r][c] = type;
        this.spawnTile(r, c, type, BOARD_Y + r * CELL - CELL);
      }
    }
    if (!this.hasLegalMove()) this.shuffleBoard();
    this.refreshHud();
  }

  private wouldMatchAt(r: number, c: number, type: number): boolean {
    const get = (rr: number, cc: number) => (rr < 0 || cc < 0 ? -2 : this.grid[rr]?.[cc] ?? -1);
    const horizontal = get(r, c - 1) === type && get(r, c - 2) === type;
    const vertical = get(r - 1, c) === type && get(r - 2, c) === type;
    return horizontal || vertical;
  }

  private spawnTile(r: number, c: number, type: number, fromY: number) {
    const key = `sym-${SYMBOLS[type]}`;
    const x = BOARD_X + c * CELL + CELL / 2;
    const y = BOARD_Y + r * CELL + CELL / 2;
    const image = this.add.image(x, fromY, key).setDepth(10);
    if (this.scale.height > this.scale.width) image.setDisplaySize(CELL * 0.82, CELL * 0.82);
    this.tweens.add({ targets: image, y, duration: 200, ease: 'Quad.easeOut' });
    this.tiles[r][c]?.destroy();
    this.tiles[r][c] = image;
  }

  // ------------------------------------------------------------------ sélection
  private handleSelect(r: number, c: number) {
    this.resetIdleHint();
    this.cursor = { r, c };
    if (!this.selected) {
      this.selected = { r, c };
      this.highlight.setPosition(BOARD_X + c * CELL + CELL / 2, BOARD_Y + r * CELL + CELL / 2);
      this.highlight.setStrokeStyle(3, 0xffe9a8, 1);
      if (!prefersReducedMotion()) {
        this.tweens.add({ targets: this.highlight, alpha: 0.6, duration: 160, yoyo: true });
      }
      return;
    }
    const first = this.selected;
    if (first.r === r && first.c === c) {
      this.selected = null;
      return;
    }
    const distance = Math.abs(first.r - r) + Math.abs(first.c - c);
    if (distance !== 1) {
      this.selected = { r, c };
      this.highlight.setPosition(BOARD_X + c * CELL + CELL / 2, BOARD_Y + r * CELL + CELL / 2);
      return;
    }
    this.selected = null;
    this.trySwap(first.r, first.c, r, c);
  }

  private async trySwap(r1: number, c1: number, r2: number, c2: number) {
    this.resetIdleHint();
    this.busy = true;
    audio.play('swap');
    this.swapCells(r1, c1, r2, c2);
    this.animateTiles(r1, c1, r2, c2, 150);
    await this.wait(170);

    // Optimisation : on n'analyse que les deux lignes et deux colonnes touchées.
    const matches = this.findMatches([r1, r2], [c1, c2]);
    if (matches.length === 0) {
      audio.play('invalid');
      shake(this, 120, 0.002);
      this.hudHint.setText('Aucune combinaison : échange annulé.');
      this.swapCells(r1, c1, r2, c2);
      this.animateTiles(r1, c1, r2, c2, 150);
      await this.wait(180);
      this.hudHint.setText(DEFAULT_HINT);
      this.busy = false;
      return;
    }
    this.movesLeft -= 1;
    this.refreshHud();
    await this.resolveCascades(matches);
    await this.checkEnd();
    this.busy = false;
  }

  private swapCells(r1: number, c1: number, r2: number, c2: number) {
    const tmp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = tmp;
    const tileTmp = this.tiles[r1][c1];
    this.tiles[r1][c1] = this.tiles[r2][c2];
    this.tiles[r2][c2] = tileTmp;
  }

  private animateTiles(r1: number, c1: number, r2: number, c2: number, duration: number) {
    const t1 = this.tiles[r1][c1];
    const t2 = this.tiles[r2][c2];
    if (t1) {
      this.tweens.add({
        targets: t1,
        x: BOARD_X + c1 * CELL + CELL / 2,
        y: BOARD_Y + r1 * CELL + CELL / 2,
        duration,
        ease: 'Quad.easeInOut',
      });
    }
    if (t2) {
      this.tweens.add({
        targets: t2,
        x: BOARD_X + c2 * CELL + CELL / 2,
        y: BOARD_Y + r2 * CELL + CELL / 2,
        duration,
        ease: 'Quad.easeInOut',
      });
    }
  }

  // ------------------------------------------------------------------ combinaisons
  /** Analyse limitée aux lignes/colonnes indiquées (undefined = plateau complet). */
  private findMatches(rows?: number[], cols?: number[]): { r: number; c: number }[] {
    const found = new Set<string>();
    const rowList = rows ?? [...Array(ROWS).keys()];
    const colList = cols ?? [...Array(COLS).keys()];

    for (const r of rowList) {
      let run = 1;
      for (let c = 1; c <= COLS; c++) {
        const current = c < COLS ? this.grid[r][c] : -99;
        const previous = this.grid[r][c - 1];
        if (current === previous && current >= 0) run++;
        else {
          if (run >= 3 && previous >= 0) {
            for (let k = c - run; k < c; k++) found.add(`${r},${k}`);
          }
          run = 1;
        }
      }
    }
    for (const c of colList) {
      let run = 1;
      for (let r = 1; r <= ROWS; r++) {
        const current = r < ROWS ? this.grid[r][c] : -99;
        const previous = this.grid[r - 1][c];
        if (current === previous && current >= 0) run++;
        else {
          if (run >= 3 && previous >= 0) {
            for (let k = r - run; k < r; k++) found.add(`${k},${c}`);
          }
          run = 1;
        }
      }
    }
    return [...found].map((entry) => {
      const [r, c] = entry.split(',').map(Number);
      return { r, c };
    });
  }

  private async resolveCascades(matches: { r: number; c: number }[]) {
    let current = matches;
    let chain = 0;
    while (current.length > 0 && chain < 12) {
      chain++;
      this.collected += current.length;
      this.refreshHud();
      audio.play(chain > 1 ? 'combo' : 'match');

      for (const { r, c } of current) {
        const tile = this.tiles[r][c];
        if (tile) {
          this.tweens.add({
            targets: tile,
            scale: 0,
            angle: 90,
            alpha: 0,
            duration: 160,
            onComplete: () => tile.destroy(),
          });
          burst(this, tile.x, tile.y, { count: 6, speed: 130, scale: 0.8, lifespan: 420 });
          if (chain === 1 && r === current[0].r && c === current[0].c) {
            floatText(this, tile.x, tile.y - 12, `+${current.length}`, { size: '20px' });
          }
        }
        this.tiles[r][c] = null;
        this.grid[r][c] = -1;
      }
      if (chain > 1) {
        floatText(this, this.scale.width / 2, BOARD_Y + 120, `Combo ×${chain}`, { size: '26px', color: '#ffd166', rise: 70, duration: 900 });
      }
      await this.wait(180);
      this.applyGravity();
      await this.wait(230);

      // après une chute, on analyse toutes les colonnes et les lignes modifiées
      current = this.findMatches([...Array(ROWS).keys()], [...Array(COLS).keys()]);
    }
    if (!this.hasLegalMove()) this.shuffleBoard();
  }

  private applyGravity() {
    for (let c = 0; c < COLS; c++) {
      let writeRow = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        const type = this.grid[r][c];
        if (type >= 0) {
          if (r !== writeRow) {
            this.grid[writeRow][c] = type;
            this.grid[r][c] = -1;
            this.tiles[writeRow][c] = this.tiles[r][c];
            this.tiles[r][c] = null;
            const tile = this.tiles[writeRow][c];
            if (tile)
              this.tweens.add({
                targets: tile,
                y: BOARD_Y + writeRow * CELL + CELL / 2,
                duration: 190,
                ease: 'Quad.easeIn',
              });
          }
          writeRow--;
        }
      }
      for (let r = writeRow; r >= 0; r--) {
        const type = Phaser.Math.Between(0, SYMBOLS.length - 1);
        this.grid[r][c] = type;
        this.spawnTile(r, c, type, BOARD_Y - CELL * (writeRow - r + 1));
      }
    }
  }

  private hasLegalMove(): boolean {
    return this.findLegalMove() !== null;
  }

  private findLegalMove(): { first: { r: number; c: number }; second: { r: number; c: number } } | null {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const nextR = r + dr;
          const nextC = c + dc;
          if (nextR >= ROWS || nextC >= COLS) continue;
          const grid = this.grid.map((row) => row.slice());
          [grid[r][c], grid[nextR][nextC]] = [grid[nextR][nextC], grid[r][c]];
          if (this.gridHasMatch(grid)) {
            return { first: { r, c }, second: { r: nextR, c: nextC } };
          }
        }
      }
    }
    return null;
  }

  private gridHasMatch(grid: Grid): boolean {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const value = grid[r][c];
        if (value < 0) continue;
        if (c + 2 < COLS && grid[r][c + 1] === value && grid[r][c + 2] === value) return true;
        if (r + 2 < ROWS && grid[r + 1][c] === value && grid[r + 2][c] === value) return true;
      }
    }
    return false;
  }

  /** Régénération bornée : au plus 6 tentatives, sinon brassage aléatoire des types. */
  private shuffleBoard() {
    for (let attempt = 0; attempt < 6; attempt++) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          let type = Phaser.Math.Between(0, SYMBOLS.length - 1);
          let guard = 0;
          while (this.wouldMatchAt(r, c, type) && guard++ < 40) {
            type = Phaser.Math.Between(0, SYMBOLS.length - 1);
          }
          this.grid[r][c] = type;
        }
      }
      if (this.hasLegalMove() && this.findMatches().length === 0) break;
    }
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.tiles[r][c]?.destroy();
        this.spawnTile(r, c, this.grid[r][c] as number, BOARD_Y + r * CELL - CELL);
      }
    }
    this.hudHint.setText('Aucun coup possible : la fabrique mélange les sucres !');
  }

  // ------------------------------------------------------------------ fin de partie
  private async checkEnd() {
    if (this.collected >= OBJECTIF) {
      this.finish(true);
      return;
    }
    if (this.movesLeft <= 0) {
      this.finish(false);
    }
  }

  private refreshHud() {
    this.hudCollected.setText(`Objets de Noël : ${Math.min(this.collected, 999)} / ${OBJECTIF}`);
    this.hudMoves.setText(`Coups : ${Math.max(this.movesLeft, 0)}`);
    this.hudMoves.setColor(this.movesLeft <= 5 ? '#ff9db1' : '#ffd9e6');
  }

  // ---------------------------------------------------------------- socle commun
  protected meta(): MinigameMeta {
    return {
      gameId: 'maman-match3',
      title: '🎄 La Fabrique de Friandises',
      subtitle: 'Maison de Maman — clé rose',
      accent: '#ffb3cd',
      rules: [
        'Objectif : réunir 20 objets de Noël en 25 coups maximum.',
        'Sur téléphone, touche deux cases voisines ou glisse une friandise sur sa voisine pour échanger.',
        "Les sucres d'orge, étoiles, flocons, biscuits et clochettes tombent du haut de la fabrique.",
        'Flèches pour déplacer le curseur, Espace pour choisir. Échap met en pause.',
      ],
      win: { title: '✨ Fabrique terminée !', subtitle: 'La clé rose rejoint l’inventaire familial' },
      lose: {
        title: 'Coups épuisés',
        subtitle: 'Pas de clé cette fois — aucune pénalité, on retente !',
        accent: '#ff9db1',
      },
      pauseLine: 'La fabrique vous attend.',
    };
  }

  protected onIntroAccepted(): void {
    this.beginPlay();
  }

  protected summaryLines(): string[] {
    return [`Objets réunis : ${this.collected} / ${OBJECTIF}`, `Coups restants : ${Math.max(this.movesLeft, 0)}`];
  }

  protected resultDetail(): string {
    return `${this.collected} objets réunis`;
  }

  protected setSimulationRunning(running: boolean): void {
    this.busy = !running;
  }

  private wait(ms: number) {
    return new Promise<void>((resolve) => this.time.delayedCall(ms, resolve));
  }
}
