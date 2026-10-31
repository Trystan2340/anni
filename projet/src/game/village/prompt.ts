/**
 * prompt.ts — pastille d'interaction « E » affichée près des objets.
 */
import Phaser from 'phaser';
import { FONT } from '../../minigames/common/shell';
import { prefersReducedMotion } from '../fx/motionPreference';

export class InteractionPrompt {
  private container: Phaser.GameObjects.Container;
  private label: Phaser.GameObjects.Text;
  private bg: Phaser.GameObjects.Rectangle;
  private key: Phaser.GameObjects.Rectangle;
  private keyText: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene) {
    this.bg = scene.add.rectangle(0, 0, 210, 40, 0x382b32, 0.97).setStrokeStyle(2, 0xf2c14e, 0.95);
    this.key = scene.add.rectangle(-84, 0, 25, 25, 0xf5e2b9).setStrokeStyle(2, 0x79533b);
    this.keyText = scene.add
      .text(-84, 0, 'E', { fontFamily: FONT, fontSize: '15px', color: '#4a332d', fontStyle: 'bold' })
      .setOrigin(0.5);
    this.label = scene.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '13px', color: '#fff4dc', fontStyle: 'bold' })
      .setOrigin(0, 0.5);
    this.container = scene.add.container(0, 0, [this.bg, this.key, this.keyText, this.label]);
    this.container.setDepth(10000).setVisible(false);
  }

  show(text: string, x: number, y: number) {
    if (this.label.text !== text) {
      this.label.setText(text);
      this.bg.setSize(Math.max(150, this.label.width + 82), 40);
      this.key.setPosition(-this.bg.width / 2 + 22, 0);
      this.keyText.setPosition(-this.bg.width / 2 + 22, 0);
      this.label.setPosition(-this.bg.width / 2 + 50, 0).setOrigin(0, 0.5);
    }
    this.container.setPosition(x, y);
    if (!this.container.visible) {
      this.container.setVisible(true);
      if (!prefersReducedMotion()) {
        this.container.setAlpha(0);
        this.scene.tweens.add({ targets: this.container, alpha: 1, duration: 150 });
      }
    }
    if (prefersReducedMotion()) {
      this.scene.tweens.killTweensOf(this.container);
      this.container.setAlpha(1).setScale(1);
      return;
    }
    const pulse = 0.96 + Math.sin(this.scene.time.now / 260) * 0.04;
    this.container.setScale(pulse);
  }

  hide() {
    if (this.container.visible) this.container.setVisible(false);
  }
}
