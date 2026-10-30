import Phaser from 'phaser';

/** Rouge-gorge qui sautille doucement près de la mare sans bloquer le joueur. */
export class WinterRobin {
  private readonly sprite: Phaser.GameObjects.Graphics;
  private elapsed = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.sprite = scene.add.graphics().setPosition(812, 140).setDepth(140);
    const bird = this.sprite;
    bird.fillStyle(0x754c3a).fillRect(-6, -7, 12, 7);
    bird.fillStyle(0xa66a46).fillRect(-3, -9, 9, 8);
    bird.fillStyle(0xd66c53).fillRect(0, -6, 6, 5);
    bird.fillStyle(0x80503a).fillRect(3, -11, 7, 6);
    bird.fillStyle(0xe7ba70).fillRect(8, -8, 4, 2);
    bird.fillStyle(0x283541).fillRect(6, -9, 2, 2);
    bird.fillStyle(0x76503b).fillRect(-5, -1, 2, 2).fillRect(2, -1, 2, 2);
  }

  update(delta: number): void {
    if (this.scene.data.get('reducedMotion')) {
      this.sprite.setPosition(812, 140).setScale(1, 1);
      return;
    }
    this.elapsed += Math.min(delta, 50);
    const phase = this.elapsed % 7000;
    let progress = 0;
    let facing = 1;
    if (phase >= 1300 && phase < 2700) progress = (phase - 1300) / 1400;
    else if (phase >= 2700 && phase < 4300) progress = 1;
    else if (phase >= 4300 && phase < 5700) {
      progress = 1 - (phase - 4300) / 1400;
      facing = -1;
    }
    const hopping = (phase >= 1300 && phase < 2700) || (phase >= 4300 && phase < 5700);
    const hop = hopping ? Math.abs(Math.sin(phase / 95)) * 3 : 0;
    this.sprite.setPosition(812 + progress * 13, 140 - hop).setScale(facing, 1);
  }
}
