# Graphismes et qualité visuelle

## Intention

Rendre Christmas Quest plus chaleureux, lisible et fini, en renforçant la profondeur de la carte, le caractère des maisons, le confort de l'intérieur du chalet et la cohérence de l'interface.

## Approches

- **Retouche du pixel-art procédural existant (retenue)** : enrichir les fonctions de dessin Canvas avec textures, ombres, lumières et détails; cela respecte les sprites et la direction visuelle déjà validée.
- **Fonds peints générés** : pourrait ajouter de la richesse rapidement, mais créerait un mélange de styles et compliquerait le rendu aux différentes tailles.
- **Remplacement par des formes vectorielles lisses** : plus simple à mettre à l'échelle, mais romprait avec le pixel-art existant.

## Objectifs

- Donner à la neige, aux sentiers et à la place centrale des variations et des repères visuels moins répétitifs.
- Donner aux quatre maisons et au chalet des façades mieux structurées, des ombres et des décorations plus riches.
- Rendre l'intérieur plus lumineux et accueillant, avec des fenêtres, un feu, un sapin, des cadeaux et un coffre détaillés.
- Mieux intégrer les panneaux HUD et les indications de commandes au style du jeu tout en gardant leur lisibilité.

## Hors périmètre

- Ne pas modifier la progression, les mini-jeux, les commandes ou les portraits des membres.
- Ne pas ajouter de dépendance, de ressources externes ni de rendu photoréaliste.

## Contraintes et décisions

- Conserver les scènes Phaser et le rendu Canvas à 1280×760 pour le village et 1280×720 pour le chalet.
- Garder les pixels nets, les fonctions de dessin déterministes et la prise en charge de la réduction des animations.
- Les changements de couleurs et de disposition restent cantonnés au décor et aux surfaces d'interface.
