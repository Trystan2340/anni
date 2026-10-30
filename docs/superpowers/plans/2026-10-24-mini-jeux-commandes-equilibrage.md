# Mini-jeux des maisons : commandes et équilibre — Plan d’implémentation

> **Pour les agents d’implémentation :** utiliser le sous-skill `superpowers:executing-plans` et suivre chaque tâche dans l’ordre. Les étapes utilisent des cases à cocher.

**Objectif :** rendre les quatre mini-jeux contrôlables au tactile et ajuster leur difficulté sans modifier leurs objectifs de clés.

**Architecture :** ajouter un helper pur de classification des swipes puis le brancher aux quatre scènes. Garder les règles de victoire existantes et isoler les réglages de vitesse dans un module pur testable.

**Stack :** TypeScript, Phaser 3, Playwright déjà installé.

**Spécification :** `docs/superpowers/specs/2026-10-24-mini-jeux-commandes-equilibrage-design.md`

## Contraintes globales

- Résolution logique Phaser : 1280 × 720.
- Garder les objectifs et l’attribution des clés existants.
- Les swipes doivent demander au moins 36 px écran de déplacement.
- Les scènes n’acceptent aucune commande qui peut agir pendant un écran modal.
- Aucune dépendance supplémentaire.

## Points à vérifier

- Geste proche du seuil, geste diagonal et tap : aucune direction erronée.
- Swipe reçu pendant le tutoriel, la pause ou le résultat : aucun changement d’état.
- Demi-tour de Papa : toujours interdit, même au tactile.
- Chute rapide de Juju près du plafond : aucun verrouillage hors grille.
- Écran réduit : le seuil tactile reste constant en pixels écran. Aucune animation décorative obligatoire n’est ajoutée ; conserver `prefers-reduced-motion` pour les animations existantes.

---

### Tâche 1 : helpers purs et tests de seuil

**Fichiers :**
- Créer : `src/minigames/common/gesture.ts`
- Créer : `src/minigames/common/difficulty.ts`
- Créer : `tests/minigame-logic.mjs`

**Interfaces :**
- Produire `classifySwipe(start, end, threshold): 'left' | 'right' | 'up' | 'down' | null`.
- Produire les fonctions `papaStepInterval(round)`, `jujuDropInterval(level)`, `runnerSpeed(distance)` et `runnerObstacleInterval(distance)` avec les valeurs de la spécification.

- [x] Écrire des tests Playwright chargeant les modules via Vite ; couvrir direction, diagonale, seuil, ainsi que les valeurs et plafonds des courbes.
- [x] Lancer le test et confirmer l’échec parce que les modules n’existent pas.
- [x] Implémenter les fonctions pures avec clamp pour les bornes.
- [x] Relancer le test et confirmer son succès.

### Tâche 2 : gestes tactiles dans les mini-jeux

**Fichiers :**
- Modifier : `src/minigames/maman/MamanMatch3.ts`
- Modifier : `src/minigames/papa/PapaTron.ts`
- Modifier : `src/minigames/juju/JujuBlocks.ts`
- Modifier : `src/minigames/chacha/ChachaRunner.ts`
- Créer : `tests/minigames-controls.mjs`

**Interfaces :**
- Consommer `classifySwipe` de la tâche 1.
- Les quatre scènes conservent toutes leurs commandes clavier et refusent les commandes lorsque `over || paused` ou que la simulation est arrêtée.

- [x] Écrire le test navigateur : chaque scène transforme son swipe attendu en commande d’état ; les swipes ne changent rien après pause et Papa redémarre après une fermeture en pause.
- [x] Lancer le test et confirmer les échecs sur les scènes non câblées.
- [x] Brancher les gestes : glisser une case voisine pour Maman, tourner pour Papa, déplacer/rotation/chute immédiate pour Juju, couloir/saut/glissade pour Chacha.
- [x] Mettre à jour tutoriels et indications HUD pour annoncer les gestes et conserver les commandes clavier.
- [x] Relancer le test et confirmer les contrôles souris/clavier existants, tactiles et le seuil constant sur canvas redimensionné.

### Tâche 3 : cadrage et équilibre familial

**Fichiers :**
- Modifier : `src/minigames/maman/MamanMatch3.ts`
- Modifier : `src/minigames/papa/PapaTron.ts`
- Modifier : `src/minigames/juju/JujuBlocks.ts`
- Modifier : `src/minigames/chacha/ChachaRunner.ts`
- Créer ou modifier : `tests/minigame-balance.mjs`

**Interfaces :**
- Consommer les fonctions de difficulté de la tâche 1.

- [x] Écrire des assertions navigateur pour la hauteur de l’arène, la suggestion valide de Maman après inactivité et les vitesses de chaque scène.
- [x] Lancer les assertions et confirmer l’échec des valeurs/cadrage actuels.
- [x] Corriger l’arène de Papa à 21 px par case ; garder les 46 colonnes et 26 rangées.
- [x] Appliquer les paliers et plafonds de vitesse définis dans la spécification.
- [x] Ajouter une suggestion non punitive de combinaison chez Maman après 7 secondes ; conserver la sélection en cours et le curseur clavier.
- [x] Relancer les tests de balance et vérifier que les objectifs de victoire n’ont pas changé.

### Tâche 4 : vérification de bout en bout

**Fichiers :**
- Modifier si besoin : `tests/minigames-controls.mjs`
- Captures : `shots/minigame-papa-controls.png`, `shots/minigame-papa-mobile-controls.png`, `shots/minigame-juju-controls.png`, `shots/minigame-chacha-controls.png`, `shots/minigame-maman-controls.png`

- [x] Vérifier les quatre scènes dans un navigateur bureau et capturer les écrans de commandes ; vérifier aussi le seuil tactile avec le canvas en 844 × 390.
- [x] Vérifier les tutoriels et pauses, le gain réel de clé après une partie de Maman, et l’absence d’erreurs page.
- [x] Exécuter `npm test`, `npm run typecheck`, `npm run build`, `npm run test:gameplay`, `npm run test:visual`, `npm run test:minigames` et `tests/scene-lifecycle.mjs`.
- [x] Mettre le ledger à jour avec commandes, résultats et éventuelles limites.

## Exécution dans l’archive fournie

Le dossier de l’application vient du ZIP et n’a pas de métadonnées Git. Le plan est donc exécuté dans `/workspace/christmas-quest` sans commit ; le dépôt `/workspace/anni` n’est pas modifié car il ne contient pas ces scènes Phaser.
