# Graphismes et qualité visuelle — plan d’implémentation

> **Pour les agents :** l'exécution reste native dans cette session. Les tâches sont suivies ici; aucune suite de tests ne sera ajoutée ni lancée pour cette demande visuelle.

**Objectif :** améliorer le relief, la chaleur et la finition de la carte, du chalet et des éléments d'interface sans quitter le pixel-art.

**Architecture :** enrichir les dessins Canvas déjà utilisés par Phaser; laisser gameplay, états, commandes et sprites de personnages intacts. Polir légèrement les surfaces DOM de HUD et d'indications.

**Technologies :** TypeScript, Canvas 2D, Phaser, CSS existants.

**Spécification :** `docs/superpowers/specs/2026-10-25-visual-quality-design.md`

## Contraintes globales

- Village 1280×760, intérieur 1280×720.
- Pixel-art net, décor procédural déterministe, sans dépendance ni ressource externe.
- Garder la réduction des animations et les commandes existantes.

## Points de revue

- Le dessin reste lisible à l'échelle du canvas et aux tailles d'écran habituelles.
- Le contraste des panneaux et du texte HUD reste suffisant.
- La déco n'obstrue pas les passages ni les points d'interaction.
- Le chalet intérieur reste lumineux et distinct du village enneigé.
- Le nouvel effet de profondeur ne dépend pas d'animations permanentes.

---

### Tâche 1 : Carte, maisons et façade du chalet

**Fichiers :** `src/game/village/villageArt.ts`, `src/game/village/ambient.ts`

- [x] Enlever le motif régulier qui produit le quadrillage répétitif des sentiers; le remplacer par des variations de pavés/neige déterministes.
- [x] Ajouter de la profondeur à la neige et des détails de silhouettes de fond.
- [x] Renforcer volume des maisons et du chalet avec socles, ombres, bardeaux, boiseries, fenêtres et décorations lumineuses.
- [x] Garder les dimensions, portes, collisions et positions d'interaction existantes.
- [x] Vérifier le rendu visuel de la carte dans Chromium.

### Tâche 2 : Chalet intérieur et coffre

**Fichiers :** `src/game/chalet/chaletArt.ts`, `src/game/chalet/ChaletScene.ts`, `src/game/village/actors.ts`

- [x] Réchauffer la palette et enrichir fenêtres, murs, cheminée, feu, sapin, tapis et cadeaux.
- [x] Ajouter du détail au petit coffre et rendre clairement visible son état de progression.
- [x] Conserver les collisions, les coordonnées et les interactions.
- [x] Vérifier visuellement la scène d'intérieur.

### Tâche 3 : Finition des surfaces d'interface

**Fichiers :** `src/styles.css`, `src/game/village/prompt.ts`

- [x] Améliorer lisibilité et cohérence du HUD et des indications de commandes sans couvrir le décor.
- [x] Garder les adaptations mobiles et les contrôles de mouvement.
- [x] Exécuter `npm run build` et relire le rendu final.
