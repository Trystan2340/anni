# Chalet Wishlist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ouvrir la liste de Trystan depuis un papier interactif dans le chalet, avec un parcours tactile et une fenêtre adaptée au mobile.

**Architecture:** La scène Phaser déclenche une intention `chalet:list` depuis une note triée par sa profondeur et un clic sur la façade centrale. React vérifie l’accès via `server.getList`, met la scène en pause, puis affiche une fenêtre dédiée qui utilise `reserve` et `cancelReservation` déjà autoritaires.

**Tech Stack:** React 18, TypeScript, Phaser 3, CSS, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-25-chalet-wishlist.md`

## Global Constraints

- Afficher seulement l’identifiant de liste `u-trystan`.
- Garder l’accès des joueurs conditionné à l’ouverture du coffre et laisser l’administrateur accéder à la liste.
- Garder les mutations de réservation via les méthodes de `server`.
- Conserver les décors natifs en pixel art, les zones tactiles doivent faire au moins 44 px sur téléphone.

## Review Focus

- Taper la façade ou le papier sur téléphone doit ouvrir la bonne scène ou fenêtre.
- Un joueur sans coffre ouvert ne doit pas voir les cadeaux.
- Le propriétaire ne doit pas pouvoir réserver sa propre liste ni voir les réservations avant la révélation.
- La scène ne doit pas continuer à se déplacer derrière la fenêtre.
- Les liens et actions doivent rester accessibles sans débordement horizontal sur petit écran.

---

### Task 1: Entrée tactile, papier et profondeur du chalet

**Files:**
- Modify: `src/game/VillageScene.ts`
- Modify: `src/game/chalet/ChaletScene.ts`
- Modify: `src/game/chalet/chaletArt.ts`
- Create: `tests/chalet-list-visual.mjs`

**Interfaces:**
- Produces bus event `chalet:list: void`.
- Produces `pauseChalet()` and `resumeChalet()` in `src/game/controller.ts` for React overlay lifecycle.
- The note hit area is centered at `{ x: 366, y: 515 }` and is `132 × 132` world pixels; mobile zoom makes it at least 44 CSS pixels wide and high.

- [x] Step 1: Add the Playwright visual flow test and verify it fails because the central chalet is not tappable yet.
- [x] Step 2: Add a direct tap target for the central chalet while preserving keyboard proximity interaction.
- [x] Step 3: Hang a decorated paper from the tree and add a direct touch target plus nearby E interaction.
- [x] Step 4: Apply a mobile chalet camera zoom that keeps the tree, paper, chest and exit visible; move the player away from the fireplace to prevent sprite overlap; fill the camera margins so the paused village cannot bleed through the room.
- [x] Step 5: Run the visual test and inspect the desktop and mobile screenshots.

### Task 2: Responsive Trystan list popup and reservations

**Files:**
- Modify: `src/game/bus.ts`
- Modify: `src/game/controller.ts`
- Modify: `src/App.tsx`
- Create: `src/ui/ChaletListModal.tsx`
- Modify: `src/styles.css`
- Modify: `tests/chalet-list-visual.mjs`

**Interfaces:**
- `ChaletListModal` accepts `{ profile, onClose, onChanged }`.
- The component fetches `server.getList(profile.id, 'u-trystan')` and mutates with the existing `server.reserve` / `server.cancelReservation` methods.

- [x] Step 1: Extend the visual flow test to require Trystan-only gifts, shop links, reserve/cancel behavior, phone layout and locked access.
- [x] Step 2: Add the typed bus event and React listener; pause and resume the interior scene with the modal.
- [x] Step 3: Build the compact responsive dialog with keyboard dismissal, focus cycling and safe external links.
- [x] Step 4: Run the visual flow, inspect every accepted screenshot, and run `npm run build`.
- [x] Step 5: Refresh `/workspace/christmas-quest.zip` with the verified source and screenshots.
