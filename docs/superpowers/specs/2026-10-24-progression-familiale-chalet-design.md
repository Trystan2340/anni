# Progression familiale et chalet des clés

## Intent

Les quatre joueurs gagnent chacun la clé de leur maison et la déposent dans un coffre familial. Tous les profils doivent voir la même progression, y compris après déconnexion. Le coffre se trouve dans une pièce visitable au centre du village.

## Approaches

- **Nouvelle scène Phaser intérieure (choisie)** : entrer depuis le village, marcher jusqu'au petit coffre, déposer avec l'interface existante et ressortir par la porte. Cela suit les commandes et le style du jeu.
- **Fenêtre React représentant la pièce** : plus courte à construire, mais enlève le déplacement dans la pièce et ne répond pas à « entrer dedans ».
- **Chalet décoratif sans intérieur jouable** : ne couvre pas le dépôt dans le chalet demandé.

## Goals

- Partager les clés gagnées et déposées entre les quatre profils joueur.
- Migrer les sauvegardes locales existantes en réunissant les clés déjà gagnées.
- Afficher distinctement les clés gagnées et les clés déposées.
- Remplacer le coffre extérieur par un chalet central; placer à l'intérieur un sapin, une cheminée, des guirlandes et un petit coffre interactif.
- Garder la validation des mini-jeux associée au bon profil et conserver la progression dans localStorage.

## Constraints and calls

- Utiliser le rendu pixel art procédural et les commandes déjà présentes (E/Espace, flèches/ZQSD).
- Le coffre intérieur ouvre le dialogue de dépôt existant. Les quatre clés ouvrent toujours l'accès aux listes.
- Une seule famille est configurée dans ce prototype local; sa progression partagée est stockée sous une clé réservée distincte des identifiants de comptes.
- Le code Supabase n'est pas branché par le prototype; le changement concerne sa couche locale et sa documentation.
