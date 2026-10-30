/**
 * controller.ts — cycle de vie du jeu Phaser et bascule village ⇄ mini-jeu.
 */
import Phaser from 'phaser';
import type { PlayerProgress } from '../data/types';
import type { MascotDesign, MascotId } from '../mascots/types';
import { bus } from './bus';
import { VillageScene } from './VillageScene';
import { ChaletScene } from './chalet/ChaletScene';
import { MamanMatch3 } from '../minigames/maman/MamanMatch3';
import { PapaTron } from '../minigames/papa/PapaTron';
import { JujuBlocks } from '../minigames/juju/JujuBlocks';
import { ChachaRunner } from '../minigames/chacha/ChachaRunner';
import type { MinigameScene } from '../minigames/common/MinigameScene';

export const GAME_SCENES: Record<string, string> = {
  maman: 'MamanMatch3',
  papa: 'PapaTron',
  juju: 'JujuBlocks',
  chacha: 'ChachaRunner',
};

export const SCENE_TO_GAME: Record<string, string> = {
  MamanMatch3: 'maman-match3',
  PapaTron: 'papa-tron',
  JujuBlocks: 'juju-blocks',
  ChachaRunner: 'chacha-runner',
};

const LANDSCAPE_GAME_SIZE = { width: 1280, height: 720 };
const PORTRAIT_GAME_SIZE = { width: 720, height: 1560 };
const MOBILE_MAP_SIZE = { width: 1280, height: 760 };
type CanvasOrientation = 'portrait' | 'landscape';

let game: Phaser.Game | null = null;
let pendingState: { design: MascotDesign; progress: PlayerProgress } | null = null;
let selectedMascot: MascotId | null = null;
let activeGame: string | null = null;
let activeChalet = false;
let portraitPaused = false;
let canvasOrientation: CanvasOrientation = 'landscape';
let removeVillageReadyListener: (() => void) | null = null;
let removeResizeListener: (() => void) | null = null;

function useMobileMap(): boolean {
  return window.matchMedia('(max-width: 1024px) and (pointer: coarse)').matches;
}

function viewportOrientation(parent?: HTMLElement): CanvasOrientation {
  const bounds = parent?.getBoundingClientRect();
  const width = bounds?.width || window.innerWidth;
  const height = bounds?.height || window.innerHeight;
  return width <= 820 && height > width ? 'portrait' : 'landscape';
}

function setCanvasOrientation(orientation: CanvasOrientation): void {
  if (!game) return;
  canvasOrientation = orientation;
  const size = orientation === 'portrait' ? PORTRAIT_GAME_SIZE : LANDSCAPE_GAME_SIZE;
  if (game.scale.width !== size.width || game.scale.height !== size.height) {
    game.scale.setGameSize(size.width, size.height);
  }
}

function setExplorationSize(): void {
  if (!game) return;
  game.scale.getParentBounds();
  if (useMobileMap()) {
    canvasOrientation = 'landscape';
    if (game.scale.width !== MOBILE_MAP_SIZE.width || game.scale.height !== MOBILE_MAP_SIZE.height) {
      game.scale.setGameSize(MOBILE_MAP_SIZE.width, MOBILE_MAP_SIZE.height);
    }
  } else {
    setCanvasOrientation(viewportOrientation(game.canvas.parentElement ?? undefined));
  }
  game.scale.refresh();
}

export function mountGame(parent: HTMLElement): void {
  if (game) return;
  canvasOrientation = viewportOrientation(parent);
  const initialSize = useMobileMap() ? MOBILE_MAP_SIZE : canvasOrientation === 'portrait' ? PORTRAIT_GAME_SIZE : LANDSCAPE_GAME_SIZE;
  if (useMobileMap()) canvasOrientation = 'landscape';
  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: initialSize.width,
    height: initialSize.height,
    backgroundColor: '#0b1024',
    pixelArt: true,
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: { default: 'arcade', arcade: { debug: false, gravity: { x: 0, y: 0 } } },
    scene: [VillageScene, ChaletScene, MamanMatch3, PapaTron, JujuBlocks, ChachaRunner],
  });

  removeVillageReadyListener = bus.on('village:ready', () => {
    if (pendingState) {
      const { design, progress } = pendingState;
      pendingState = null;
      const scene = game?.scene.getScene('Village') as VillageScene | undefined;
      scene?.applyState(design, progress);
    }
  });

  const onResize = () => {
    if (!game?.isBooted || !game.canvas) return;
    if (!activeGame) setExplorationSize();
    else {
      game.scale.getParentBounds();
      game.scale.refresh();
    }
  };
  window.addEventListener('resize', onResize);
  window.visualViewport?.addEventListener('resize', onResize);
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
  observer?.observe(parent);
  removeResizeListener = () => {
    observer?.disconnect();
    window.removeEventListener('resize', onResize);
    window.visualViewport?.removeEventListener('resize', onResize);
  };
}

export function unmountGame(): void {
  removeVillageReadyListener?.();
  removeVillageReadyListener = null;
  removeResizeListener?.();
  removeResizeListener = null;
  pendingState = null;
  selectedMascot = null;
  game?.destroy(true);
  game = null;
  activeGame = null;
  activeChalet = false;
  portraitPaused = false;
  canvasOrientation = 'landscape';
}

export function applyVillageState(design: MascotDesign, progress: PlayerProgress): void {
  selectedMascot = design.id;
  const scene = game?.scene.getScene('Village') as VillageScene | undefined;
  // Une scène en pause reste construite : elle doit aussi recevoir les clés et
  // la résolution de l'énigme avant le retour depuis le chalet ou un mini-jeu.
  if (scene && (scene.scene.isActive() || scene.scene.isPaused())) scene.applyState(design, progress);
  else pendingState = { design, progress };
  const chalet = game?.scene.getScene('ChaletInterior') as ChaletScene | undefined;
  if (chalet && (chalet.scene.isActive() || chalet.scene.isPaused())) chalet.applyProgress(progress);
}

export function openMinigame(houseKey: string): void {
  const sceneKey = GAME_SCENES[houseKey];
  if (!game || !sceneKey || activeChalet) return;
  activeGame = sceneKey;
  game.scene.pause('Village');
  game.scene.start(sceneKey, { mascotId: selectedMascot });
  const scene = game.scene.getScene(sceneKey) as MinigameScene;
  scene.events.once('create', () => {
    if (activeGame === sceneKey) scene.setPortraitPaused(portraitPaused);
  });
}

/** Choisit le canvas vertical ou paysage avant le mini-jeu suivant. */
export function setMinigameCanvasOrientation(portrait: boolean): void {
  setCanvasOrientation(portrait ? 'portrait' : 'landscape');
}

export function closeMinigame(): void {
  if (!game || !activeGame) return;
  const scene = game.scene.getScene(activeGame) as MinigameScene | undefined;
  portraitPaused = false;
  scene?.setPortraitPaused(false);
  game.scene.stop(activeGame);
  activeGame = null;
  setExplorationSize();
  game.scene.resume('Village');
}

/** Arrête temporairement la logique quand l’écran d’orientation masque la partie. */
export function setMinigamePortraitPaused(paused: boolean): void {
  portraitPaused = paused;
  if (!game || !activeGame) return;
  const scene = game.scene.getScene(activeGame) as MinigameScene | undefined;
  if (!scene) return;
  if (scene.sys.isActive()) scene.setPortraitPaused(paused);
  else scene.events.once('create', () => scene.setPortraitPaused(portraitPaused));
}

export function openChalet(design: MascotDesign, progress: PlayerProgress): void {
  if (!game || activeGame || activeChalet || game.scene.isActive('ChaletInterior')) return;
  activeChalet = true;
  if (game.scene.isActive('Village')) game.scene.pause('Village');
  game.scene.start('ChaletInterior', { design, progress });
}

export function closeChalet(): void {
  if (!game) return;
  const chalet = game.scene.getScene('ChaletInterior') as ChaletScene | undefined;
  const chaletRunning = Boolean(chalet?.scene.isActive() || chalet?.scene.isPaused());
  const village = game.scene.getScene('Village') as VillageScene | undefined;
  if (!activeChalet && !chaletRunning) return;
  // Le départ peut provenir d'un minuteur de la scène : différer sa destruction
  // évite de détruire le joueur au milieu de l'actualisation de cette scène.
  if (activeChalet || chaletRunning) chalet?.scene.stop();
  setExplorationSize();
  if (village?.scene.isPaused()) game.scene.resume('Village');
  else if (village && !village.scene.isActive()) game.scene.start('Village');
  village?.resumeFromChalet();
  activeChalet = false;
}

/** Met le chalet en pause lorsqu’une fenêtre React est ouverte au-dessus du jeu. */
export function pauseChalet(): void {
  const scene = game?.scene.getScene('ChaletInterior') as ChaletScene | undefined;
  if (scene?.scene.isActive()) scene.scene.pause();
}

/** Reprend le chalet après la fermeture de sa fenêtre React. */
export function resumeChalet(): void {
  const scene = game?.scene.getScene('ChaletInterior') as ChaletScene | undefined;
  // Une fermeture rapide peut arriver avant que la pause mise en file soit appliquée.
  if (scene && (scene.scene.isActive() || scene.scene.isPaused())) scene.scene.resume();
}

export function getGame(): Phaser.Game | null {
  return game;
}

export function isMinigameActive(): boolean {
  return activeGame !== null;
}
