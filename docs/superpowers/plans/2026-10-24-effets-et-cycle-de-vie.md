# Effets, mouvement réduit et cycle de vie — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Améliorer la cohérence des effets du village et des mini-jeux, respecter `prefers-reduced-motion` dans Phaser et éviter les abonnements persistants lors des changements de scène.

**Architecture:** Garder les effets communs dans `game/fx/effects.ts` et l’ambiance dans `game/village/ambient.ts`. Ajouter un gestionnaire de préférence de mouvement par scène ; suivre et nettoyer les abonnements, tweens et émetteurs créés par le village. Les mini-jeux conservent leurs règles.

**Tech Stack:** Phaser 3, TypeScript, React, Playwright.

**Spec:** [personnages-village-effets-design.md](../specs/2026-10-24-personnages-village-effets-design.md)

## Global Constraints

- `prefers-reduced-motion` réduit les effets Phaser et s’actualise si la préférence change pendant la session.
- Les règles de jeu, résultats, récompenses et données restent inchangés.
- Les émetteurs restent bornés et sont supprimés ou arrêtés avec leur scène.
- Le checkout `/workspace/anni` reste intact ; les changements vont dans `/workspace/christmas-quest`.
- Les captures Playwright sont écrites dans `shots/` sous le projet, jamais dans un chemin absolu externe.

## Setup

Si `node_modules/` est absent, exécuter `npm ci` depuis `/workspace/christmas-quest` avant le premier test. Ne pas modifier `package-lock.json`.

## Review Focus

1. Réduction des animations activée au démarrage : le test vérifie l’absence de neige/émissions décoratives Phaser continues.
2. Préférence modifiée pendant le village : le test vérifie que les émissions s’arrêtent puis reprennent sans recréer la scène.
3. Connexions répétées : le test vérifie que `village:ready` n’a qu’un seul abonnement actif après chaque connexion et aucun après déconnexion.
4. Changement de scène pendant un effet : le test vérifie que les émetteurs et tweens de l’ancienne scène sont arrêtés.
5. Mouvement normal et mini-jeu : le parcours vérifie que neige, effets de victoire et transitions restent actifs sans erreur quand la réduction est désactivée.

---

### Task 1: Préférence de mouvement et tests de comportement

**Files:**
- Create: `src/game/fx/motionPreference.ts`
- Create: `tests/effects-accessibility.mjs`
- Modify: `src/game/fx/effects.ts`
- Modify: `src/game/village/ambient.ts`
- Modify: `src/game/VillageScene.ts`
- Modify: `src/minigames/common/MinigameScene.ts`

**Interfaces:**
- `motionPreference.ts` exports `prefersReducedMotion(): boolean` and `watchReducedMotion(callback: (reduced: boolean) => void): () => void`.
- `addAmbient(scene)` returns a controller with `trail`, `setReducedMotion(reduced: boolean): void`, and `destroy(): void`.
- Les fonctions d’effets partagées n’ajoutent pas de flash, secousse, particule ou tween décoratif si la préférence est réduite.

- [x] **Step 1: Write the failing browser test**

  Dans `tests/effects-accessibility.mjs`, lancer le village en mouvement normal et vérifier au moins deux émetteurs de neige ; activer `reducedMotion` pendant la session, attendre l’arrêt des effets continus, puis désactiver la préférence et vérifier leur reprise. En mouvement réduit, déclencher une victoire de mini-jeu et vérifier qu’aucune pluie de confettis ni secousse ne commence ; en mouvement normal, vérifier qu’une victoire produit l’effet. Vérifier également qu’aucune erreur de page n’apparaît.

- [x] **Step 2: Run the test and confirm the current failure**

  With Vite running, run `node tests/effects-accessibility.mjs`. Expected: les émetteurs Phaser restent actifs après l’activation de `reducedMotion`.

- [x] **Step 3: Add preference observation and controlled ambient effects**

  Implémenter `prefersReducedMotion` et son observateur, puis faire gérer à `addAmbient` les émetteurs et tweens qu’il crée. Réduire à un décor statique en mode réduit ; restaurer les effets sans doublons lorsque la préférence redevient normale. Nettoyer l’observateur à l’arrêt de la scène.

- [x] **Step 4: Apply the preference to shared feedback**

  Dans `effects.ts` et `MinigameScene.ts`, court-circuiter les effets décoratifs de courte durée en mode réduit tout en conservant les changements d’état et les overlays. Ne pas pauser les boucles de jeu.

- [x] **Step 5: Run accessibility checks**

  Run `node tests/effects-accessibility.mjs`, `npm run typecheck`, and `npm run build`. Expected: effets continus arrêtés/rétablis à chaque changement, sans erreur ni doublon.

### Task 2: Nettoyage des abonnements et chemins de capture

**Files:**
- Modify: `src/game/bus.ts`
- Modify: `src/game/controller.ts`
- Modify: `tests/smoke.mjs`
- Modify: `tests/gameplay.mjs`
- Test: `tests/scene-lifecycle.mjs`

**Interfaces:**
- Ajouter `Bus.listenerCount(event: keyof BusEvents): number` pour vérifier les abonnements dans le banc de test existant.
- Le contrôleur conserve puis annule son abonnement `village:ready` dans `unmountGame()`.

- [x] **Step 1: Write the failing lifecycle test**

  Dans `tests/scene-lifecycle.mjs`, connecter/déconnecter trois fois et vérifier que `listenerCount('village:ready')` vaut respectivement 1 après connexion et 0 après déconnexion. Le test vérifie aussi que la scène a été détruite après chaque déconnexion et qu’aucun émetteur ou tween de cette scène n’est encore actif.

- [x] **Step 2: Run the test and confirm the lifecycle failure**

  With Vite running, run `node tests/scene-lifecycle.mjs`. Expected: `listenerCount` est absent ou le nombre d’abonnements augmente après chaque reconnexion.

- [x] **Step 3: Clean up the controller subscription**

  Ajouter `listenerCount`, conserver le callback de `village:ready` dans le contrôleur, et appeler sa fonction de désabonnement avant de détruire Phaser. Réinitialiser tout état `pendingState` appartenant à l’ancien jeu.

- [x] **Step 4: Make screenshot paths portable**

  Remplacer les sorties `/home/user/christmas-quest/shots` de `tests/smoke.mjs` et `tests/gameplay.mjs` par un chemin relatif au fichier de test, en créant `shots/` si nécessaire.

- [x] **Step 5: Run lifecycle and full project checks**

  Run `node tests/scene-lifecycle.mjs`, `npm run test:unit`, `npm run test:acceptance`, `npm run test:gameplay`, `npm run test:visual`, `npm run typecheck`, and `npm run build`. Expected: pas d’abonnement accumulé, captures écrites sous `shots/`, toutes les règles existantes passent.

No commit step is included: the ZIP extraction has no usable Git metadata.
