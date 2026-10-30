# Personnages pixel art — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter cinq personnages pixel art détaillés, reconnaissables d’après les références, et les afficher correctement dans la sélection et le village.

**Architecture:** Un spritesheet PNG transparent par personne, réutilisé dans React et Phaser. Chaque feuille fait 192 × 216 px : une grille 3 × 3 de cellules 64 × 72, directions `down` / `up` / `side` en lignes et poses `idle` / `walkA` / `walkB` en colonnes. Le registre conserve l’identité de profil existante.

**Tech Stack:** React 18, Phaser 3, TypeScript, Vite, Playwright.

**Spec:** [personnages-village-effets-design.md](../specs/2026-10-24-personnages-village-effets-design.md)

## Global Constraints

- Les profils restent associés à leur identité et à leur rôle actuels.
- Les cinq photos servent de références et ne sont pas ajoutées au bundle.
- Aucun service de génération d’images n’est requis à l’exécution.
- Le checkout `/workspace/anni` reste intact ; les changements vont dans `/workspace/christmas-quest`.
- Le spritesheet doit rester net avec le rendu pixel art Phaser.

## Setup

Si `node_modules/` est absent, exécuter `npm ci` depuis `/workspace/christmas-quest` avant le premier test. Ne pas modifier `package-lock.json`.

## Review Focus

1. Ordre photo/profil erroné : le test Playwright vérifie la séquence Maman, Papa, Juju, Chacha, Trystan et leurs identifiants de mascotte.
2. Feuille manquante ou aux mauvaises dimensions : le test vérifie le chargement des cinq PNG et la taille 192 × 216.
3. Direction ou pose découpée avec le mauvais index : le test unitaire vérifie les neuf index de cellule.
4. Le profil sélectionné ne correspond pas au sprite du joueur : le test Playwright vérifie le sprite Phaser après connexion.
5. Sprites flous dans les cartes : le test visuel vérifie `image-rendering: pixelated` et capture l’écran de connexion.

---

### Task 1: Spritesheets et registre des personnages

**Files:**
- Create: `src/mascots/assets/Maman.png`, `Papa.png`, `Juju.png`, `Chacha.png`, `Trystan.png`
- Create: `src/mascots/assets.ts`
- Create: `src/mascots/spriteSheet.ts`
- Test: `tests/mascots-visual.mjs`
- Test: `tests/sprite-sheet.mjs`

**Interfaces:**
- `assets.ts` exports `MASCOT_SPRITE_SHEETS: Record<MascotId, string>`.
- `spriteSheet.ts` exports `SPRITE_FRAME_WIDTH = 64`, `SPRITE_FRAME_HEIGHT = 72`, `MascotFrame = 'idle' | 'walkA' | 'walkB'`, and `mascotFrameIndex(direction: Direction, frame: MascotFrame): number`.
- `mascotFrameIndex` uses rows `down=0`, `up=1`, `side=2` and columns `idle=0`, `walkA=1`, `walkB=2`.
- `renderer.ts` exports `preloadMascotSheet(scene: Phaser.Scene, mascotId: MascotId): void`; `VillageScene.preload` loads all five sheets and `ChachaRunner.preload` loads Chacha’s sheet.

- [x] **Step 1: Write failing tests**

  In `tests/sprite-sheet.mjs`, compile the pure helper with the existing `esbuild` dependency and assert all nine direction/pose indexes (`down` 0–2, `up` 3–5, `side` 6–8). In `tests/mascots-visual.mjs`, assert the five profile cards expose the confirmed order and `data-mascot-id`, each PNG loads at 192 × 216, and logging in as Maman uses the Maman spritesheet in Phaser.

- [x] **Step 2: Run both tests and confirm the expected failures**

  Run `node tests/sprite-sheet.mjs` and, with `npm run dev` running, `node tests/mascots-visual.mjs`. Expected: the helper and assets are missing, and the current cards have no sprite-sheet identity.

- [x] **Step 3: Create the assets and registry**

  Generate one transparent 3 × 3 sheet for each person from the corresponding photo, crop/downsample with nearest-neighbor to 192 × 216, and place it at the paths above. In `assets.ts`, map each `MascotId` to its Vite asset URL. Keep the image style and tile bounds consistent across all five files.

- [x] **Step 4: Adapt React and Phaser rendering**

  Update `src/mascots/renderer.ts`, `src/mascots/index.ts`, `src/ui/MascotAvatar.tsx`, `src/game/VillageScene.ts`, and `src/minigames/chacha/ChachaRunner.ts` to use the sheets. Load frame size 64 × 72, create walk animations from the three columns, render the down/idle cell in profile cards, and preserve mirrored side movement. Add `data-mascot-id` to the avatar element for accessible identity and test selection.

- [x] **Step 5: Run focused and project checks**

  Run `node tests/sprite-sheet.mjs`, `node tests/mascots-visual.mjs`, `npm run typecheck`, and `npm run build`. Expected: nine frame indexes, five valid sheets, selected profile and in-game player match, and clean build.

No commit step is included: the ZIP extraction has no usable Git metadata.
