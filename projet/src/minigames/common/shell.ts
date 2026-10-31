/**
 * shell.ts — éléments d'interface partagés par les quatre mini-jeux :
 * panneaux, boutons, tutoriel, pause, écran de résultat, HUD.
 * Aucune règle de victoire ici : chaque mini-jeu garde la sienne.
 */
import Phaser from 'phaser';
import { prefersReducedMotion } from '../../game/fx/motionPreference';

export interface OverlayButton {
  label: string;
  primary?: boolean;
  onClick: () => void;
}

export interface OverlaySpec {
  title: string;
  subtitle?: string;
  lines?: string[];
  buttons: OverlayButton[];
  accent?: string;
  width?: number;
}

export const FONT = 'Trebuchet MS, "Segoe UI", sans-serif';

/** Adapte les textes et les boutons à la taille réellement affichée du canvas. */
function overlayScale(scene: Phaser.Scene): number {
  if (scene.scale.height <= scene.scale.width) return 1;
  return Math.max(1.45, (12.5 * scene.scale.displayScale.x) / 19);
}

export function panel(scene: Phaser.Scene, w: number, h: number, accent = '#ffe9a8'): Phaser.GameObjects.Container {
  const container = scene.add.container(0, 0);
  const shadow = scene.add.rectangle(4, 6, w, h, 0x000000, 0.35);
  const bg = scene.add.rectangle(0, 0, w, h, 0x101a33, 0.97);
  bg.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(accent).color, 0.9);
  const inner = scene.add.rectangle(0, 0, w - 14, h - 14, 0x16223f, 1);
  inner.setStrokeStyle(1, 0x2c3c66, 1);
  container.add([shadow, bg, inner]);
  return container;
}

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  button: OverlayButton,
  width = 220,
): Phaser.GameObjects.Container {
  const color = button.primary ? 0xe8b83f : 0x2a3a63;
  const portraitScale = overlayScale(scene);
  const bg = scene.add.rectangle(0, 0, width, (portraitScale > 1 ? 70 : 44) * portraitScale, color, 1);
  bg.setStrokeStyle(2, button.primary ? 0xfff1c4 : 0x4a5f96);
  const text = scene.add
    .text(0, 0, button.label, {
      fontFamily: FONT,
      fontSize: `${Math.round(16 * portraitScale)}px`,
      color: button.primary ? '#20180a' : '#e9f0ff',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  const container = scene.add.container(x, y, [bg, text]);
  bg.setInteractive({ useHandCursor: true })
    .on('pointerover', () => bg.setFillStyle(button.primary ? 0xffd166 : 0x3a4f80, 1))
    .on('pointerout', () => bg.setFillStyle(color, 1))
    .on('pointerdown', () => button.onClick());
  return container;
}

/** Superposition plein écran : tutoriel, pause ou résultat. Renvoie un moyen de la fermer. */
export function showOverlay(scene: Phaser.Scene, spec: OverlaySpec): () => void {
  const cam = scene.cameras.main;
  const w = cam.width;
  const h = cam.height;
  const portraitScale = overlayScale(scene);
  const container = scene.add.container(w / 2, h / 2).setDepth(5000).setScrollFactor(0);
  const dim = scene.add.rectangle(0, 0, w, h, 0x050912, 0.72);
  const panelW = spec.width ?? 640;
  const body = panel(scene, panelW, 0, spec.accent);
  // hauteur calculée après ajout des textes
  let cursorY = -140;
  const title = scene.add
    .text(0, cursorY, spec.title, {
      fontFamily: FONT,
      fontSize: `${Math.round(27 * portraitScale)}px`,
      color: '#ffe9a8',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: panelW - 60 },
    })
    .setOrigin(0.5, 0.5);
  container.add([dim, body, title]);
  cursorY += 46 * portraitScale;

  if (spec.subtitle) {
    const subtitle = scene.add
      .text(0, cursorY, spec.subtitle, {
        fontFamily: FONT,
        fontSize: `${Math.round((portraitScale > 1 ? 19 : 15) * portraitScale)}px`,
        color: '#a8bce0',
        align: 'center',
        fontStyle: 'italic',
        wordWrap: { width: panelW - 70 },
      })
      .setOrigin(0.5);
    container.add(subtitle);
    cursorY += 34 * portraitScale;
  }

  for (const line of spec.lines ?? []) {
    const text = scene.add
      .text(-panelW / 2 + 50, cursorY, line, {
        fontFamily: FONT,
        fontSize: `${Math.round((portraitScale > 1 ? 19 : 15) * portraitScale)}px`,
        color: '#e6eeff',
        align: 'left',
        wordWrap: { width: panelW - 100 },
        lineSpacing: 6 * portraitScale,
      })
      .setOrigin(0, 0);
    container.add(text);
    cursorY += text.height + 10 * portraitScale;
  }

  const buttonHeight = (portraitScale > 1 ? 70 : 44) * portraitScale;
  cursorY += buttonHeight / 2 + 16 * portraitScale;
  const totalWidth = spec.buttons.length * 236;
  spec.buttons.forEach((button, index) => {
    const bx = -totalWidth / 2 + 118 + index * 236;
    const made = makeButton(scene, bx, cursorY, button, 220);
    container.add(made);
  });

  const panelTop = -140 - 42 * portraitScale;
  const panelBottom = cursorY + buttonHeight / 2 + 42 * portraitScale;
  const panelHeight = panelBottom - panelTop;
  const panelCenter = (panelTop + panelBottom) / 2;
  // Centre tout le panneau dans le viewport, même si le texte occupe plus de lignes.
  container.y = h / 2 - panelCenter;
  dim.y = panelCenter;
  const shadow = scene.add.rectangle(4, panelCenter + 6, panelW, panelHeight, 0x000000, 0.35);
  const bg = scene.add.rectangle(0, panelCenter, panelW, panelHeight, 0x101a33, 0.98);
  bg.setStrokeStyle(3, Phaser.Display.Color.HexStringToColor(spec.accent ?? '#ffe9a8').color, 0.95);
  container.addAt(bg, 1);
  container.addAt(shadow, 1);
  body.destroy();

  const hint = scene.add
    .text(0, cursorY + buttonHeight / 2 + 18 * portraitScale, portraitScale > 1 ? 'Touche un bouton pour continuer' : 'Entrée : valider — ou cliquez un bouton', {
      fontFamily: FONT,
      fontSize: `${Math.round((portraitScale > 1 ? 18 : 12) * portraitScale)}px`,
      color: '#7f93b8',
    })
    .setOrigin(0.5);
  container.add(hint);

  const reducedMotion = prefersReducedMotion();
  container.setAlpha(reducedMotion ? 1 : 0);
  if (!reducedMotion) scene.tweens.add({ targets: container, alpha: 1, duration: 180 });

  // Validation au clavier : Échap/Entrée déclenchent le bouton principal.
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    keyboard?.off('keydown-ENTER', onEnter);
    if (prefersReducedMotion()) container.destroy();
    else {
      scene.tweens.add({
        targets: container,
        alpha: 0,
        duration: 140,
        onComplete: () => container.destroy(),
      });
    }
  };
  const primaryButton = spec.buttons.find((button) => button.primary);
  const keyboard = scene.input.keyboard;
  function onEnter() {
    if (closed || !primaryButton) return;
    close();
    primaryButton.onClick();
  }
  keyboard?.on('keydown-ENTER', onEnter);

  return close;
}

/** HUD texte simple, aligné en haut à gauche. */
export function hudText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = '16px',
  color = '#e9f0ff',
  align: 'left' | 'center' | 'right' = 'left',
): Phaser.GameObjects.Text {
  const text = scene.add.text(x, y, value, {
    fontFamily: FONT,
    fontSize: size,
    color,
    fontStyle: 'bold',
  });
  text.setOrigin(align === 'center' ? 0.5 : align === 'right' ? 1 : 0, 0);
  text.setDepth(40);
  return text;
}

export function drawPixelCanvas(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): void {
  if (scene.textures.exists(key)) return;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingEnabled = false;
    paint(ctx);
  }
  scene.textures.addCanvas(key, canvas);
}
