/**
 * JujuBlocks.ts — « Les Cadeaux Empilés » (maison de Juju, clé dorée).
 * Plateau 10 × 20, sept pièces de quatre cases habillées en cadeaux.
 * Objectif : compléter une ligne de cadeaux.
 *
 * Optimisations : grille compacte, collisions par cases, sac aléatoire équilibré
 * de sept pièces, rendu redessiné uniquement quand le plateau ou la pièce change.
 */
import Phaser from 'phaser';
import { MinigameScene, type MinigameMeta } from '../common/MinigameScene';
import { audio } from '../../audio/audio';
import { prefersReducedMotion } from '../../game/fx/motionPreference';
import { burst, floatText, vignette } from '../../game/fx/effects';
import { bus } from '../../game/bus';
import { FONT, hudText, showOverlay } from '../common/shell';
import { bindSceneSwipes, type SwipeDirection } from '../common/gesture';
import { jujuDropInterval } from '../common/difficulty';

const COLS = 10;
const ROWS = 20;
let CELL = 29;
let BOARD_X = 486;
let BOARD_Y = 108;
const LINES_GOAL = 1;
const CONTROL_HINT = '← → : déplacer · ↑ tourner\n↓ accélérer · Espace : chute\nTactile : glissez dans ces directions';

type Matrix = number[][];

const SHAPES: Record<string, { matrix: Matrix; color: number; ribbon: number }> = {
  I: { matrix: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: 0x4fc3d9, ribbon: 0xffffff },
  O: { matrix: [[1, 1], [1, 1]], color: 0xe8b83f, ribbon: 0xc8384f },
  T: { matrix: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: 0x9b6ad6, ribbon: 0xffe9a8 },
  S: { matrix: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: 0x6ac07e, ribbon: 0xffe9a8 },
  Z: { matrix: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: 0xd9534f, ribbon: 0xffffff },
  J: { matrix: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: 0x4a78d0, ribbon: 0xffe9a8 },
  L: { matrix: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: 0xe08a3c, ribbon: 0xffffff },
};

const TYPES = Object.keys(SHAPES);

interface Piece {
  type: string;
  matrix: Matrix;
  x: number;
  y: number;
}

export class JujuBlocks extends MinigameScene {
  private board: (string | null)[][] = [];
  private current: Piece | null = null;
  private nextQueue: string[] = [];
  private bag: string[] = [];
  private bagLast: string | null = null;
  private dropAccumulator = 0;
  private dropInterval = 720;
  private lines = 0;
  private level = 1;
  private boardGfx!: Phaser.GameObjects.Graphics;
  private pieceGfx!: Phaser.GameObjects.Graphics;
  private nextGfx!: Phaser.GameObjects.Graphics;
  private hudLines!: Phaser.GameObjects.Text;
  private hudLevel!: Phaser.GameObjects.Text;
  private hudNotice!: Phaser.GameObjects.Text;
  private running = false;

  constructor() {
    super('JujuBlocks');
  }

  create() {
    const portrait = this.scale.height > this.scale.width;
    CELL = portrait ? 50 : 29;
    BOARD_X = Math.round((this.scale.width - COLS * CELL) / 2);
    BOARD_Y = portrait ? 360 : 108;
    this.buildBackdrop();
    this.buildHud();
    this.buildInput();
    this.resetGame();
    vignette(this, { strength: 0.42, depth: 8400 });
    if (this.introSeen) this.running = true;
    else {
      this.introSeen = true;
      this.showIntro();
    }
  }

  private buildBackdrop() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x241a0c, 0x241a0c, 0x120d06, 0x120d06, 1);
    g.fillRect(0, 0, this.scale.width, this.scale.height);
    for (let i = 0; i < 60; i++) {
      const x = (i * 191) % this.scale.width;
      const y = (i * 83) % this.scale.height;
      g.fillStyle(0xffd166, 0.05);
      g.fillCircle(x, y, 2 + (i % 3));
    }
    g.fillStyle(0x0d0904, 1);
    g.fillRoundedRect(BOARD_X - 14, BOARD_Y - 14, COLS * CELL + 28, ROWS * CELL + 28, 12);
    g.lineStyle(3, 0xb8891c, 1);
    g.strokeRoundedRect(BOARD_X - 14, BOARD_Y - 14, COLS * CELL + 28, ROWS * CELL + 28, 12);

    const portrait = this.scale.height > this.scale.width;
    g.fillStyle(0x100d08, 0.94);
    if (portrait) {
      g.fillRoundedRect(248, 1388, 446, 132, 14);
      g.lineStyle(2, 0x6b521f, 0.9);
      g.strokeRoundedRect(248, 1388, 446, 132, 14);
    } else {
      g.fillRoundedRect(164, 132, 282, 226, 14);
      g.fillRoundedRect(164, 378, 286, 94, 14);
      g.lineStyle(2, 0x6b521f, 0.9);
      g.strokeRoundedRect(164, 132, 282, 226, 14);
      g.strokeRoundedRect(164, 378, 286, 94, 14);
    }

    this.boardGfx = this.add.graphics().setDepth(2);
    this.pieceGfx = this.add.graphics().setDepth(3);
    this.nextGfx = this.add.graphics().setDepth(3);

    // aperçu de la pièce suivante
    const nextBox = portrait ? { x: 26, y: 1388, width: 208, height: 132 } : { x: 860, y: 150, width: 190, height: 150 };
    g.fillStyle(0x1a1207, 1);
    g.fillRoundedRect(nextBox.x, nextBox.y, nextBox.width, nextBox.height, 12);
    g.lineStyle(2, 0x6b521f, 1);
    g.strokeRoundedRect(nextBox.x, nextBox.y, nextBox.width, nextBox.height, 12);
    this.add
      .text(portrait ? 130 : 955, portrait ? 1408 : 128, 'Prochain cadeau', { fontFamily: FONT, fontSize: portrait ? '19px' : '15px', color: '#f1ddb1' })
      .setOrigin(0.5)
      .setDepth(40);
  }

  private buildHud() {
    const portrait = this.scale.height > this.scale.width;
    const centerX = this.scale.width / 2;
    this.add
      .text(centerX, portrait ? 64 : 56, 'Les Cadeaux Empilés', { fontFamily: FONT, fontSize: portrait ? '34px' : '27px', color: '#ffe9a8', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(40);
    this.hudLines = hudText(this, portrait ? 216 : 190, portrait ? 160 : 150, `Lignes : 0 / ${LINES_GOAL}`, portrait ? '22px' : '20px', '#ffe9a8', portrait ? 'center' : 'left');
    this.hudLevel = hudText(this, portrait ? 510 : 190, portrait ? 164 : 180, 'Vitesse : 1', portrait ? '18px' : '15px', '#e2c98f', portrait ? 'center' : 'left');
    if (portrait) {
      hudText(this, centerX, 212, 'Complète 1 ligne pour gagner la clé dorée', '21px', '#f1ddb1', 'center');
    }
    this.hudNotice = this.add
      .text(portrait ? 470 : 320, portrait ? 1388 : 396, portrait ? '← bouger · ↻ tourner · ↓ lâcher' : CONTROL_HINT, {
        fontFamily: FONT,
        fontSize: portrait ? '20px' : '14px',
        color: '#f1ddb1',
        align: 'center',
        lineSpacing: 8,
        wordWrap: { width: portrait ? 410 : 250 },
      })
      .setOrigin(0.5, 0)
      .setDepth(40);
    if (!portrait) {
      hudText(this, 190, 240, 'Objectif', '16px', '#e8c88a');
      hudText(this, 190, 266, 'Compléter 1 ligne avant', '14px', '#ead9b8');
      hudText(this, 190, 286, 'que la pile ne touche', '14px', '#ead9b8');
      hudText(this, 190, 306, 'le haut du plateau.', '14px', '#ead9b8');
      hudText(this, 190, 336, 'Clé dorée au bout.', '13px', '#e8b83f');
    }
  }

  private buildInput() {
    const keyboard = this.input.keyboard!;
    keyboard.on('keydown-LEFT', () => this.move(-1));
    keyboard.on('keydown-Q', () => this.move(-1));
    keyboard.on('keydown-RIGHT', () => this.move(1));
    keyboard.on('keydown-D', () => this.move(1));
    keyboard.on('keydown-DOWN', () => this.softDrop());
    keyboard.on('keydown-UP', () => this.rotate(1));
    keyboard.on('keydown-X', () => this.rotate(1));
    keyboard.on('keydown-W', () => this.rotate(1));
    keyboard.on('keydown-SPACE', () => this.hardDrop());
    keyboard.on('keydown-ESC', () => this.togglePause());
    keyboard.on('keydown-P', () => this.togglePause());

    const swipeActions: Record<SwipeDirection, () => void> = {
      left: () => this.move(-1),
      right: () => this.move(1),
      up: () => this.rotate(1),
      down: () => this.hardDrop(),
    };
    const removeSwipes = bindSceneSwipes(
      this,
      (direction) => swipeActions[direction](),
      () => this.running && !this.paused && !this.over,
    );
    this.events.once('shutdown', removeSwipes);
    if (this.scale.height > this.scale.width) this.buildTouchControls();
  }

  private buildTouchControls() {
    const controls = [
      { x: 300, label: '←', action: () => this.move(-1) },
      { x: 405, label: '↻', action: () => this.rotate(1) },
      { x: 510, label: '→', action: () => this.move(1) },
      { x: 615, label: '↓', action: () => this.hardDrop() },
    ];
    for (const control of controls) {
      const button = this.add.circle(control.x, 1466, 50, 0x2b2110, 0.98).setDepth(45);
      button.setStrokeStyle(2, 0xe8c88a, 0.95).setInteractive({ useHandCursor: true });
      button.on('pointerdown', control.action);
      this.add
        .text(control.x, 1466, control.label, { fontFamily: FONT, fontSize: '34px', color: '#fff2cc', fontStyle: 'bold' })
        .setOrigin(0.5)
        .setDepth(46);
    }
  }

  // ------------------------------------------------------------------ jeu
  private resetGame() {
    this.board = Array.from({ length: ROWS }, () => new Array<string | null>(COLS).fill(null));
    // Une ligne presque complète et une barre longue donnent un premier coup accessible.
    this.board[ROWS - 1] = ['O', 'T', null, null, null, null, 'J', 'L', 'S', 'Z'];
    this.bag = Phaser.Utils.Array.Shuffle(TYPES.filter((type) => type !== 'I'));
    this.bagLast = 'I';
    this.nextQueue = ['I'];
    this.dropInterval = jujuDropInterval(1);
    this.dropAccumulator = 0;
    this.lines = 0;
    this.level = 1;
    this.over = false;
    this.paused = false;
    this.running = true;
    this.refillQueue();
    this.spawn();
    this.renderBoard();
    this.hudLines.setText(`Lignes : 0 / ${LINES_GOAL}`);
    this.hudLevel.setText('Vitesse : 1');
    this.hudNotice.setText(this.scale.height > this.scale.width ? '← bouger · ↻ tourner · ↓ lâcher' : CONTROL_HINT);
  }

  /** Sac équilibré : les sept formes sortent une fois avant tout doublon. */
  private nextFromBag(): string {
    if (this.bag.length === 0) {
      this.bag = Phaser.Utils.Array.Shuffle([...TYPES]);
      if (this.bagLast && this.bag[0] === this.bagLast) {
        [this.bag[0], this.bag[this.bag.length - 1]] = [this.bag[this.bag.length - 1], this.bag[0]];
      }
    }
    const type = this.bag.shift()!;
    this.bagLast = type;
    return type;
  }

  private refillQueue() {
    while (this.nextQueue.length < 3) this.nextQueue.push(this.nextFromBag());
  }

  private spawn() {
    this.refillQueue();
    const type = this.nextQueue.shift()!;
    this.refillQueue();
    const definition = SHAPES[type];
    const matrix = definition.matrix.map((row) => row.slice());
    this.current = { type, matrix, x: Math.floor((COLS - matrix[0].length) / 2), y: 0 };
    this.renderNext();
    if (this.collides(this.current, 0, 0)) {
      this.current = null;
      this.running = false;
      this.finish(false);
      return;
    }
    this.renderBoard();
  }

  private collides(piece: Piece, dx: number, dy: number, matrix = piece.matrix): boolean {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const x = piece.x + c + dx;
        const y = piece.y + r + dy;
        if (x < 0 || x >= COLS || y >= ROWS) return true;
        if (y >= 0 && this.board[y][x]) return true;
      }
    }
    return false;
  }

  private move(dx: number) {
    if (!this.running || this.paused || !this.current) return;
    if (!this.collides(this.current, dx, 0)) {
      this.current.x += dx;
      this.renderBoard();
    }
  }

  private softDrop() {
    if (!this.running || this.paused || !this.current) return;
    if (!this.collides(this.current, 0, 1)) {
      this.current.y += 1;
      this.dropAccumulator = 0;
      this.renderBoard();
    } else {
      this.lockPiece();
    }
  }

  private hardDrop() {
    if (!this.running || this.paused || !this.current) return;
    while (!this.collides(this.current, 0, 1)) this.current.y += 1;
    this.lockPiece();
  }

  private rotate(direction: 1 | -1) {
    if (!this.running || this.paused || !this.current) return;
    const rotated = this.current.matrix[0].map((_, index) =>
      this.current!.matrix.map((row) => row[index]).reverse(),
    );
    // murs de secours : on décale de 1 ou 2 cases si la rotation bloque
    for (const dx of [0, -1, 1, -2, 2]) {
      if (!this.collides(this.current, dx, 0, rotated)) {
        this.current.matrix = rotated;
        this.current.x += dx;
        this.renderBoard();
        return;
      }
    }
  }

  private lockPiece() {
    if (!this.current) return;
    audio.play('drop');
    const { matrix, type } = this.current;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const y = this.current.y + r;
        const x = this.current.x + c;
        if (y >= 0 && y < ROWS && x >= 0 && x < COLS) this.board[y][x] = type;
      }
    }
    this.clearLines();
    if (!this.over) this.spawn();
  }

  private clearLines() {
    const fullRows: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (this.board[r].every((cell) => cell !== null)) fullRows.push(r);
    }
    if (fullRows.length === 0) {
      this.renderBoard();
      return;
    }
    audio.play('line');
    floatText(this, BOARD_X + (COLS * CELL) / 2, BOARD_Y + 120, fullRows.length > 1 ? `${fullRows.length} lignes !` : 'Ligne !', {
      size: '24px',
      color: '#ffe9a8',
      rise: 64,
    });
    // effet d'étoiles sur les lignes complètes
    if (!prefersReducedMotion()) {
      fullRows.forEach((row) => {
        for (let c = 0; c < COLS; c++) {
          const star = this.add
            .text(BOARD_X + c * CELL + CELL / 2, BOARD_Y + row * CELL + CELL / 2, '✦', {
              fontFamily: FONT,
              fontSize: '22px',
              color: '#ffe9a8',
            })
            .setOrigin(0.5)
            .setDepth(20);
          this.tweens.add({
            targets: star,
            y: star.y - 40,
            alpha: 0,
            duration: 420 + c * 12,
            onComplete: () => star.destroy(),
          });
          burst(this, star.x, star.y, { count: 4, speed: 150, scale: 0.7, lifespan: 500 });
        }
      });
    }
    for (const row of fullRows) {
      this.board.splice(row, 1);
      this.board.unshift(new Array<string | null>(COLS).fill(null));
    }
    this.lines += fullRows.length;
    this.level = 1 + Math.floor(this.lines / 3);
    this.dropInterval = jujuDropInterval(this.level);
    this.hudLines.setText(`Lignes : ${this.lines} / ${LINES_GOAL}`);
    this.hudLevel.setText(`Vitesse : ${this.level}`);
    this.hudLines.setColor(this.lines >= LINES_GOAL ? '#7ae582' : '#ffe9a8');
    this.renderBoard();
    if (this.lines >= LINES_GOAL) {
      this.running = false;
      this.finish(true);
    }
  }

  // ------------------------------------------------------------------ rendu
  private drawGift(g: Phaser.GameObjects.Graphics, px: number, py: number, type: string) {
    const definition = SHAPES[type];
    g.fillStyle(definition.color, 1);
    g.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
    g.fillStyle(0x000000, 0.2);
    g.fillRect(px + CELL - 4, py + 2, 2, CELL - 4);
    g.fillRect(px + 2, py + CELL - 4, CELL - 4, 2);
    g.fillStyle(0xffffff, 0.28);
    g.fillRect(px + 2, py + 2, CELL - 4, 4);
    g.lineStyle(1, 0xffffff, 0.55);
    g.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
    g.fillStyle(definition.ribbon, 0.95);
    g.fillRect(px + CELL / 2 - 2, py + 1, 4, CELL - 2);
    g.fillRect(px + 1, py + CELL / 2 - 2, CELL - 2, 4);
    g.fillStyle(0xffffff, 0.88);
    g.fillRect(px + CELL / 2 - 3, py + CELL / 2 - 3, 6, 6);
  }

  private renderBoard() {
    const g = this.boardGfx;
    g.clear();
    g.fillStyle(0x0d0904, 1);
    g.fillRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = BOARD_X + c * CELL;
        const y = BOARD_Y + r * CELL;
        g.fillStyle((r + c) % 2 === 0 ? 0x181205 : 0x140f04, 1);
        g.fillRect(x, y, CELL, CELL);
        const type = this.board[r][c];
        if (type) this.drawGift(g, x, y, type);
      }
    }
    // pièce courante + fantôme de chute
    if (this.current) {
      const ghost = { ...this.current, matrix: this.current.matrix };
      let ghostY = this.current.y;
      while (!this.collides({ ...ghost, y: ghostY }, 0, 1)) ghostY++;
      const pg = this.pieceGfx;
      pg.clear();
      for (let r = 0; r < ghost.matrix.length; r++) {
        for (let c = 0; c < ghost.matrix[r].length; c++) {
          if (!ghost.matrix[r][c]) continue;
          const y = ghostY + r;
          if (y < 0) continue;
          pg.fillStyle(0xffe9a8, 0.1);
          pg.fillRect(BOARD_X + (ghost.x + c) * CELL + 2, BOARD_Y + y * CELL + 2, CELL - 4, CELL - 4);
          pg.lineStyle(2, 0xffe9a8, 0.8);
          pg.strokeRect(BOARD_X + (ghost.x + c) * CELL + 2, BOARD_Y + y * CELL + 2, CELL - 4, CELL - 4);
        }
      }
      for (let r = 0; r < this.current.matrix.length; r++) {
        for (let c = 0; c < this.current.matrix[r].length; c++) {
          if (!this.current.matrix[r][c]) continue;
          const y = this.current.y + r;
          if (y < 0) continue;
          this.drawGift(pg, BOARD_X + (this.current.x + c) * CELL, BOARD_Y + y * CELL, this.current.type);
        }
      }
    }
  }

  private renderNext() {
    const g = this.nextGfx;
    g.clear();
    const type = this.nextQueue[0];
    if (!type) return;
    const matrix = SHAPES[type].matrix;
    const cols = matrix[0].length;
    const rows = matrix.length;
    const portrait = this.scale.height > this.scale.width;
    const previewCenterX = portrait ? 130 : 955;
    const previewCenterY = portrait ? 1470 : 225;
    const previewCell = portrait ? 23 : 26;
    const offsetX = previewCenterX - (cols * previewCell) / 2;
    const offsetY = previewCenterY - (rows * previewCell) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!matrix[r][c]) continue;
        g.fillStyle(SHAPES[type].color, 1);
        g.fillRect(offsetX + c * previewCell, offsetY + r * previewCell, previewCell - 2, previewCell - 2);
        g.fillStyle(0xffffff, 0.28);
        g.fillRect(offsetX + c * previewCell + 1, offsetY + r * previewCell + 1, previewCell - 4, 3);
        g.fillStyle(SHAPES[type].ribbon, 0.9);
        g.fillRect(offsetX + c * previewCell + previewCell / 2 - 3, offsetY + r * previewCell, 3, previewCell - 2);
        g.fillStyle(0xffffff, 0.9);
        g.fillRect(offsetX + c * previewCell + previewCell / 2 - 3, offsetY + r * previewCell + previewCell / 2 - 2, 5, 5);
      }
    }
  }

  update(_time: number, delta: number) {
    if (!this.running || this.paused || !this.current) return;
    this.dropAccumulator += delta;
    if (this.dropAccumulator >= this.dropInterval) {
      this.dropAccumulator = 0;
      if (!this.collides(this.current, 0, 1)) {
        this.current.y += 1;
        this.renderBoard();
      } else {
        this.lockPiece();
      }
    }
  }

  // ------------------------------------------------------------------ écrans
  // ---------------------------------------------------------------- socle commun
  protected meta(): MinigameMeta {
    return {
      gameId: 'juju-blocks',
      title: '🎁 Les Cadeaux Empilés',
      subtitle: 'Maison de Juju — clé dorée',
      accent: '#ffe9a8',
      rules: [
        'Complète la ligne presque remplie avec la barre de cadeaux pour gagner.',
        'Flèches gauche/droite : déplacer · Haut : tourner · Bas : accélérer · Espace : chute immédiate.',
        'Sur téléphone, glisse dans l’arène ou touche les flèches en bas pour déplacer, tourner et lâcher.',
        'Déplace la barre vers les quatre cases vides, puis fais-la tomber.',
        'Une ligne complète suffit pour obtenir la clé. Échap met en pause.',
      ],
      win: { title: '✨ Une ligne complétée !', subtitle: 'La clé dorée rejoint l’inventaire familial' },
      lose: {
        title: 'Le plateau déborde',
        subtitle: 'Pas de clé cette fois — on retente sans pénalité',
        accent: '#d9534f',
      },
      pauseLine: 'Les cadeaux attendent.',
    };
  }

  protected onIntroAccepted(): void {
    // Le plateau est déjà prêt derrière les consignes : on démarre sans
    // détruire puis recréer la scène, ce qui provoquait un écran vide.
    this.running = true;
  }

  protected summaryLines(): string[] {
    return [`Lignes : ${this.lines} / ${LINES_GOAL}`, `Vitesse atteinte : ${this.level}`];
  }

  protected resultDetail(): string {
    return `${this.lines} ligne${this.lines === 1 ? '' : 's'} effacée${this.lines === 1 ? '' : 's'}`;
  }

  protected setSimulationRunning(running: boolean): void {
    this.running = running;
  }
}
