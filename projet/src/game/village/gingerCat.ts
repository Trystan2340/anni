import Phaser from 'phaser';

// Une petite promenade sur la place : le chat ne bloque jamais le joueur.
const WALK: ReadonlyArray<{ x: number; y: number }> = [
  { x: 710, y: 520 }, { x: 700, y: 550 }, { x: 660, y: 570 },
  { x: 610, y: 570 }, { x: 570, y: 550 }, { x: 570, y: 520 },
  { x: 610, y: 505 }, { x: 660, y: 505 },
];

export class GingerCat {
  private readonly sprite: Phaser.GameObjects.Graphics;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private x = WALK[0].x;
  private y = WALK[0].y;
  private target = 1;
  private pauseMs = 0;
  private frame = -1;
  private facing = 1;
  private heart?: Phaser.GameObjects.Graphics;
  private heartTimer?: Phaser.Time.TimerEvent;
  private readonly pawprints = new Set<Phaser.GameObjects.Graphics>();
  private lastPawTime = 0;
  private pawSide = 1;

  constructor(private readonly scene: Phaser.Scene) {
    this.shadow = scene.add.ellipse(this.x, this.y - 1, 43, 10, 0x4b5d70, 0.2).setDepth(this.y - 1);
    this.sprite = scene.add.graphics().setPosition(this.x, this.y).setScale(1.45).setDepth(this.y);
    this.draw(0);
  }

  /** Une cible assez grande pour être touchée, sans recouvrir les portes. */
  contains(x: number, y: number): boolean {
    return Math.abs(x - this.x) <= 34 && y >= this.y - 38 && y <= this.y + 5;
  }

  /** Une caresse arrête brièvement la promenade et fait apparaître un cœur. */
  pet(): void {
    this.pauseMs = 1800;
    this.draw(0);
    this.heartTimer?.remove();
    if (this.heart) {
      this.scene.tweens.killTweensOf(this.heart);
      this.heart.destroy();
    }
    const heart = this.scene.add.graphics().setPosition(this.x, this.y - 43).setDepth(this.y + 1);
    heart.fillStyle(0xe7687f);
    heart.fillRect(-8, -7, 6, 5).fillRect(2, -7, 6, 5);
    heart.fillRect(-10, -2, 20, 5).fillRect(-7, 3, 14, 4).fillRect(-4, 7, 8, 3);
    heart.fillStyle(0xffc8c6).fillRect(-6, -6, 3, 3);
    this.heart = heart;
    if (!this.scene.data.get('reducedMotion')) {
      this.scene.tweens.add({ targets: heart, y: heart.y - 14, alpha: 0.3, duration: 1300, ease: 'Sine.easeOut' });
    }
    this.heartTimer = this.scene.time.delayedCall(1400, () => {
      heart.destroy();
      if (this.heart === heart) this.heart = undefined;
      this.heartTimer = undefined;
    });
  }

  private draw(frame: number): void {
    if (this.frame === frame) return;
    this.frame = frame;
    const g = this.sprite;
    g.clear();
    // Queue relevée et rayures rousses.
    g.fillStyle(0x8c492b).fillRect(-19, -18, 5, 9).fillRect(-21, -23 + frame, 4, 7);
    g.fillStyle(0xe48a39).fillRect(-18, -17, 4, 7).fillRect(-20, -22 + frame, 2, 6);
    // Corps, ventre clair et pattes dont la position alterne en marchant.
    g.fillStyle(0x8c492b).fillRect(-12, -15, 25, 11);
    g.fillStyle(0xd9782f).fillRect(-11, -16, 22, 11);
    g.fillStyle(0xf3a451).fillRect(-8, -15, 16, 6);
    g.fillStyle(0xa8582c).fillRect(-7, -15, 3, 5).fillRect(1, -15, 3, 5);
    g.fillStyle(0xffd39a).fillRect(-4, -8, 12, 3);
    g.fillStyle(0xa8552b);
    if (frame === 1) g.fillRect(-9, -5, 5, 5).fillRect(4, -5, 5, 5);
    else if (frame === 2) g.fillRect(-6, -5, 5, 5).fillRect(7, -5, 5, 5);
    else g.fillRect(-8, -5, 5, 5).fillRect(6, -5, 5, 5);
    // Tête de profil, oreilles pointues, œil et petit museau crème.
    g.fillStyle(0x8c492b).fillRect(7, -21, 12, 13);
    g.fillRect(8, -24, 4, 6).fillRect(15, -24, 4, 6);
    g.fillStyle(0xec9140).fillRect(8, -21, 10, 10);
    g.fillRect(9, -23, 2, 4).fillRect(16, -23, 2, 4);
    g.fillStyle(0xf6b2a0).fillRect(9, -22, 1, 2).fillRect(16, -22, 1, 2);
    g.fillStyle(0x4b5934).fillRect(14, -18, 2, 3);
    g.fillStyle(0xffe3b7).fillRect(14, -13, 6, 4);
    g.fillStyle(0x994b3c).fillRect(19, -13, 2, 2);
  }

  private leavePawprint(time: number): void {
    if (time - this.lastPawTime < 330) return;
    this.lastPawTime = time;
    this.pawSide *= -1;
    const mark = this.scene.add.graphics()
      .setPosition(this.x - this.facing * 8, this.y - 1 + this.pawSide * 3)
      .setDepth(this.y - 2)
      .setAlpha(0.45);
    mark.fillStyle(0x869fb9).fillRect(-2, 0, 4, 3);
    mark.fillRect(-3, -2, 2, 2).fillRect(0, -3, 2, 2).fillRect(3, -2, 2, 2);
    this.pawprints.add(mark);
    this.scene.tweens.add({
      targets: mark,
      alpha: 0,
      delay: 1200,
      duration: 2200,
      onComplete: () => {
        this.pawprints.delete(mark);
        mark.destroy();
      },
    });
    if (this.pawprints.size > 12) {
      const oldest = this.pawprints.values().next().value;
      if (oldest) {
        this.pawprints.delete(oldest);
        this.scene.tweens.killTweensOf(oldest);
        oldest.destroy();
      }
    }
  }

  private clearPawprints(): void {
    this.pawprints.forEach((mark) => {
      this.scene.tweens.killTweensOf(mark);
      mark.destroy();
    });
    this.pawprints.clear();
  }

  update(time: number, delta: number): void {
    // Une préférence de mouvement réduit laisse le chat immobile.
    if (this.scene.data.get('reducedMotion')) {
      this.clearPawprints();
      this.draw(0);
      return;
    }
    if (this.pauseMs > 0) {
      this.pauseMs -= delta;
      this.draw(0);
      return;
    }
    const destination = WALK[this.target];
    const dx = destination.x - this.x;
    const dy = destination.y - this.y;
    const distance = Math.hypot(dx, dy);
    const step = Math.min(distance, 32 * Math.min(delta, 50) / 1000);
    if (distance > 0) {
      this.x += dx / distance * step;
      this.y += dy / distance * step;
      if (Math.abs(dx) > 0.5) this.facing = dx < 0 ? -1 : 1;
    }
    if (distance <= step + 0.01) {
      this.target = (this.target + 1) % WALK.length;
      this.pauseMs = 550;
    }
    this.sprite.setPosition(this.x, this.y).setScale(this.facing * 1.45, 1.45).setDepth(this.y);
    this.shadow.setPosition(this.x, this.y - 1).setDepth(this.y - 1);
    this.leavePawprint(time);
    this.draw(1 + Math.floor(time / 220) % 2);
  }
}
