/**
 * MinigameScene.ts — socle commun des quatre mini-jeux.
 *
 * Mutualise tout ce que le cahier des charges impose à chaque jeu ($8) :
 * présentation personnalisée, tutoriel, pause, écran de résultat, boutons
 * Rejouer / Quitter, sons et effets de Noël. Chaque jeu ne garde que SES règles.
 *
 * Un mini-jeu hérite de cette classe et fournit 5 éléments :
 *   meta()                 → textes de présentation et de résultat
 *   onIntroAccepted()      → démarrage de la partie après le tutoriel
 *   summaryLines()         → récapitulatif de fin
 *   resultDetail()         → détail transmis au serveur (jamais la clé)
 *   setSimulationRunning() → mise en pause/reprise de la boucle de jeu
 */
import Phaser from 'phaser';
import { audio } from '../../audio/audio';
import { bus } from '../../game/bus';
import { burst, confetti, flash, shake } from '../../game/fx/effects';
import { showOverlay } from './shell';

export type MinigameId = 'maman-match3' | 'papa-tron' | 'juju-blocks' | 'chacha-runner';

export interface MinigameMeta {
  gameId: MinigameId;
  title: string;
  subtitle: string;
  accent: string;
  /** Règles affichées dans le tutoriel. */
  rules: string[];
  win: { title: string; subtitle: string };
  lose: { title: string; subtitle: string; accent: string };
  pauseLine: string;
}

export abstract class MinigameScene extends Phaser.Scene {
  /** État partagé : lu par les boucles update() de chaque jeu. */
  protected paused = false;
  protected over = false;
  protected introSeen = false;
  protected overlayClose: (() => void) | null = null;
  private pausedBeforePortrait: boolean | null = null;

  protected abstract meta(): MinigameMeta;
  protected abstract onIntroAccepted(): void;
  protected abstract summaryLines(): string[];
  protected abstract resultDetail(): string;
  protected abstract setSimulationRunning(running: boolean): void;

  /** Suspend la simulation tant que l’écran de rotation masque le mini-jeu. */
  public setPortraitPaused(suspended: boolean): void {
    if (suspended) {
      if (this.pausedBeforePortrait === null) {
        this.pausedBeforePortrait = this.paused;
        this.paused = true;
      }
      return;
    }
    if (this.pausedBeforePortrait !== null) {
      this.paused = this.pausedBeforePortrait;
      this.pausedBeforePortrait = null;
    }
  }

  /** Tutoriel : présenté une seule fois par visite de la maison. */
  protected showIntro(): void {
    this.over = true;
    this.setSimulationRunning(false);
    const meta = this.meta();
    this.overlayClose = showOverlay(this, {
      title: meta.title,
      subtitle: meta.subtitle,
      accent: meta.accent,
      width: 690,
      lines: meta.rules,
      buttons: [
        {
          label: 'Commencer',
          primary: true,
          onClick: () => {
            this.overlayClose?.();
            this.overlayClose = null;
            audio.play('open');
            this.paused = false;
            this.over = false;
            this.onIntroAccepted();
            this.setSimulationRunning(true);
          },
        },
        { label: 'Quitter', onClick: () => this.quit() },
      ],
    });
  }

  /**
   * Fin de partie : une seule fois, avec la récompense décidée par le SERVEUR.
   * `finish` ne fait qu'informer l'interface ; aucune clé n'est créée ici.
   */
  protected finish(won: boolean): void {
    if (this.over) return;
    this.over = true;
    this.setSimulationRunning(false);
    const meta = this.meta();

    bus.emit('minigame:result', { gameId: meta.gameId, won, detail: this.resultDetail() });

    if (won) {
      audio.play('win');
      confetti(this, { duration: 2000 });
      flash(this, 0xffe9a8, 0.28, 420);
      const cam = this.cameras.main;
      burst(this, cam.width / 2, cam.height / 2, { kind: 'sparkle', count: 26, speed: 260, depth: 9700 });
    } else {
      audio.play('lose');
      shake(this, 260, 0.006);
      flash(this, 0xff7d90, 0.22, 380);
    }

    this.overlayClose = showOverlay(this, {
      title: won ? meta.win.title : meta.lose.title,
      subtitle: won ? meta.win.subtitle : meta.lose.subtitle,
      accent: won ? meta.accent : meta.lose.accent,
      lines: this.summaryLines(),
      buttons: [
        {
          label: 'Rejouer',
          primary: !won,
          onClick: () => {
            audio.play('click');
            this.scene.restart();
          },
        },
        {
          label: 'Quitter',
          primary: won,
          onClick: () => this.quit(),
        },
      ],
    });
  }

  protected togglePause(): void {
    if (this.over) return;
    if (this.paused) {
      this.overlayClose?.();
      this.overlayClose = null;
      this.paused = false;
      this.setSimulationRunning(true);
      audio.play('close');
      return;
    }
    this.paused = true;
    this.setSimulationRunning(false);
    audio.play('open');
    const meta = this.meta();
    this.overlayClose = showOverlay(this, {
      title: 'Pause',
      accent: meta.accent,
      width: 520,
      lines: [meta.pauseLine],
      buttons: [
        {
          label: 'Reprendre',
          primary: true,
          onClick: () => {
            this.overlayClose?.();
            this.overlayClose = null;
            this.paused = false;
            this.setSimulationRunning(true);
            audio.play('open');
          },
        },
        { label: 'Quitter', onClick: () => this.quit() },
      ],
    });
  }

  protected quit(): void {
    this.setSimulationRunning(false);
    audio.play('close');
    this.scene.stop();
    bus.emit('minigame:quit', { gameId: this.meta().gameId });
  }
}
