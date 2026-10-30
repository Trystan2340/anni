# Mini-jeux des maisons : commandes et équilibre

## Intention

Rendre les quatre mini-jeux plus faciles à prendre en main et plus justes pour une partie en famille, au clavier comme au tactile. Les règles de progression et les clés gagnées restent identiques.

## Objectifs

- Chaque jeu accepte les commandes clavier existantes et des gestes tactiles cohérents.
- Les consignes de tutoriel et du HUD expliquent les commandes tactiles.
- L’arène de Papa est entièrement visible dans le canevas 1280 × 720.
- Les courbes de vitesse et les aides rendent les essais moins punitifs sans changer les objectifs.
- Tous les gestes sont ignorés pendant les tutoriels, les pauses et les écrans de résultat.

## Hors périmètre

- Pas de nouvelle mécanique de bonus, d’objet ou de clé.
- Pas de changement des conditions de victoire : Maman 20 objets en 25 coups, Papa 2 manches sur 3, Juju 8 lignes, Chacha 600 unités et 15 cadeaux.
- Pas de changement des identifiants de mini-jeux, du service de progression, ni du contrat d’attribution des clés.

## Approches considérées

1. **Commandes seulement** : rend les jeux au clavier jouables au tactile, mais laisse inchangée la difficulté actuelle.
2. **Équilibrage seulement** : ajuste les vitesses et les aides, mais les jeux restent difficiles à piloter sur écran tactile.
3. **Commandes et équilibre ensemble (choisi)** : ajoute les gestes, corrige le cadrage de l’arène de Papa et ajuste les paliers de vitesse et l’aide visuelle de Maman. Cela correspond au choix de l’utilisateur et conserve les objectifs existants.

## Conception

- Un helper partagé classe un geste horizontal ou vertical à partir de ses points de départ et d’arrivée, avec un seuil exprimé en pixels écran pour éviter les swipes accidentels.
- Maman conserve le tap sur deux cases et accepte aussi un glissement vers une case voisine. Après 7 secondes sans action ni sélection en cours, une combinaison valide est indiquée sans consommer de coup. Deux marqueurs verts indiquent les cases, sans déplacer le curseur clavier. Le plateau descend pour dégager son titre et son sous-titre.
- Papa accepte les swipes directionnels, en conservant l’interdiction de demi-tour contre la direction engagée. Sa pause est effacée à chaque ouverture. Sa grille passe à des cases de 21 px : 26 rangées tiennent alors dans la hauteur de jeu et le bas du plateau ne disparaît plus.
- Juju interprète un swipe gauche/droite comme un déplacement, un swipe vers le haut comme une rotation et un swipe vers le bas comme une chute immédiate. Les instructions tactiles quittent le bord inférieur pour rejoindre la marge libre à gauche du plateau.
- Chacha associe les swipes gauche/droite au changement de couloir, vers le haut au saut et vers le bas à la glissade.
- Les gestes tactiles ne déclenchent pas de commande après le seuil de mouvement ; les taps et les clics gardent leur fonction normale.
- Les valeurs d’équilibre choisies sont : Papa 96/90/84 ms par case selon la manche ; Juju `max(320, 800 - 80 × (niveau - 1))` ms ; Chacha vitesse `min(6.6, 4.2 + distance / 260)` et motifs d’obstacles espacés d’au moins 960 ms. L’aide de Maman apparaît après 7 secondes d’inactivité.
- Le mouvement respecte toujours `prefers-reduced-motion`. Aucun nouvel effet animé obligatoire n’est ajouté.

## Contraintes

- Rester sur Phaser 3, TypeScript et les dépendances déjà installées.
- Garder la résolution logique actuelle de 1280 × 720.
- Ne jamais attribuer de clé côté scène : la récompense reste décidée par la couche de progression existante.
- Les entrées souris et clavier existantes doivent continuer à fonctionner.

## À la charge du développeur

Ajouter des tests purs pour le classement des gestes et les valeurs de difficulté, puis des tests navigateur pour les commandes des scènes et la visibilité du plateau. Mettre à jour les textes du tutoriel/HUD sans agrandir les panneaux hors écran.
