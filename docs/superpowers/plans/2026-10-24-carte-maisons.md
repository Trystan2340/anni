# Carte et maisons du village — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrichir le décor pixel art de la carte et rendre les quatre maisons plus distinctes sans déplacer les interactions.

**Architecture:** Garder le dessin procédural dans `villageArt.ts`. Ajouter une liste de détails décoratifs par maison et des éléments de relief/lumière sur la carte ; conserver exactement la géométrie des bâtiments, portes, hotspots et obstacles.

**Tech Stack:** TypeScript, Canvas 2D, Phaser 3, Playwright.

**Spec:** [personnages-village-effets-design.md](../specs/2026-10-24-personnages-village-effets-design.md)

## Global Constraints

- La carte conserve ses coordonnées et son plan actuels.
- Les couleurs et associations maison/membre/mini-jeu restent inchangées.
- Les détails ajoutés ne masquent ni les portes, ni les personnages, ni les indicateurs d’interaction.
- Le rendu reste procédural et déterministe ; aucune image des personnes n’est utilisée pour le décor.
- Le checkout `/workspace/anni` reste intact ; les changements vont dans `/workspace/christmas-quest`.

## Setup

Si `node_modules/` est absent, exécuter `npm ci` depuis `/workspace/christmas-quest` avant le premier test. Ne pas modifier `package-lock.json`.

## Review Focus

1. Porte ou hotspot déplacé : le test verrouille les coordonnées actuelles des quatre maisons et de leurs portes.
2. Maison sans détail distinctif : le test exige au moins deux détails déclarés par maison et quatre combinaisons distinctes.
3. Obstacles désynchronisés du décor : le test vérifie que les rectangles couvrent toujours les bâtiments sans couvrir leurs portes.
4. Carte différente à chaque chargement : le test vérifie la sortie déterministe pour une graine identique.
5. Nouveau dessin provoquant une erreur navigateur ou une zone illisible : le parcours visuel capture le village et vérifie l’absence d’erreurs de page.

---

### Task 1: Contrat de décor et invariants de géométrie

**Files:**
- Modify: `src/game/village/villageArt.ts`
- Test: `tests/map-art.mjs`

**Interfaces:**
- Ajouter à `HouseSpec` une propriété `decorations: HouseDecoration[]`.
- `HouseDecoration` est l’union `'wreath' | 'garland' | 'lantern' | 'star' | 'gift' | 'candy-cane'`.
- Chaque maison reçoit au moins deux détails ; les quatre combinaisons sont distinctes.

- [x] **Step 1: Write the failing geometry/art test**

  Dans `tests/map-art.mjs`, compiler `villageArt.ts` avec `esbuild`, puis vérifier les identifiants et coordonnées actuels des quatre maisons, la position du coffre et du chalet, les six valeurs permises pour `decorations`, deux détails minimum par maison et quatre combinaisons distinctes. Vérifier aussi que les obstacles restent présents autour des quatre bâtiments et n’occupent pas les coordonnées des portes.

- [x] **Step 2: Run the test and confirm it fails on missing decoration data**

  Run `node tests/map-art.mjs`. Expected: les assertions de coordonnées passent et les assertions `decorations` échouent sur les maisons actuelles.

- [x] **Step 3: Add the decoration contract and per-house details**

  Ajouter l’union `HouseDecoration` et renseigner des combinaisons distinctes dans `HOUSES`, sans modifier les valeurs existantes de position, couleur, porte, nom ou mini-jeu.

- [x] **Step 4: Run the geometry test**

  Run `node tests/map-art.mjs`. Expected: toutes les coordonnées sont inchangées, les quatre maisons ont deux détails ou plus et les portes restent hors des obstacles.

### Task 2: Nouveau rendu pixel art de la carte et des façades

**Files:**
- Modify: `src/game/village/villageArt.ts`
- Test: `tests/map-art.mjs`
- Create: `tests/map-visual.mjs`

**Interfaces:**
- Exporter `paintHouse(ctx: CanvasRenderingContext2D, house: HouseSpec): void` et l’utiliser depuis `paintVillage`.
- La fonction peint chaque valeur de `house.decorations` dans les limites de sa façade.

- [x] **Step 1: Extend the failing test for rendered details**

  Ajouter à `tests/map-art.mjs` un contexte Canvas recorder et vérifier que `paintHouse` émet des commandes de dessin pour chaque détail déclaré. Vérifier également que deux appels de `paintVillage` avec une graine identique émettent les mêmes commandes. Garder une capture manuelle du village comme vérification visuelle, sans figer une image de référence fragile.

- [x] **Step 2: Run the test and confirm it fails for the current painter**

  Run `node tests/map-art.mjs`. Expected: la déterminisme existante passe ; les assertions de dessin par maison échouent car `paintHouse` n’existe pas encore.

- [x] **Step 3: Improve the painter**

  Dans `drawHouse` et `paintVillage`, dessiner les détails listés, les couches de neige, la profondeur du chemin, les bordures et les éclairages chauds. Garder les détails dans l’emprise visuelle des bâtiments ou hors des rectangles de porte.

- [x] **Step 4: Run map and browser checks**

  Run `node tests/map-art.mjs`, then with Vite running `node tests/map-visual.mjs`, `npm run typecheck`, and `npm run build`. Expected: géométrie stable, détails rendus, aucune erreur navigateur et build propre. Inspecter `shots/map-refined.png` à 1280 × 720.

No commit step is included: the ZIP extraction has no usable Git metadata.
