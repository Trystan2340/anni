# Refonte des personnages, du village et des effets

## Intention

Rendre Christmas Quest plus personnel et vivant : représenter les cinq membres à partir des photos fournies, enrichir la carte enneigée et les quatre maisons, et rendre les animations et retours visuels plus soignés. Corriger en même temps les problèmes de cycle de vie repérés dans les scènes Phaser.

## Résultat attendu

- L’écran de sélection montre cinq personnages pixel art reconnaissables, et le personnage associé au profil sélectionné apparaît ensuite dans le village.
- La carte conserve son plan, ses coordonnées et ses zones de jeu, avec davantage de relief, de détails hivernaux et une meilleure lisibilité.
- Les maisons gardent leurs couleurs et mini-jeux actuels, mais ont chacune une façade, une toiture, des fenêtres et des décorations plus travaillées.
- Les effets du village et des mini-jeux sont cohérents, lisibles et correctement nettoyés.
- `prefers-reduced-motion` réduit aussi les animations Phaser.
- Aucun changement aux invitations, aux droits, aux règles de progression, aux clés, aux réservations ou aux listes.

## Personnages

Ordre et correspondance confirmés par l’utilisateur :

1. Maman — première photo renvoyée : cheveux bruns mi-longs, lunettes, haut sombre.
2. Papa — deuxième photo : lunettes, cheveux foncés clairsemés, chemise claire à motifs.
3. Juju — troisième photo : cheveux gris, débardeur clair et bijoux.
4. Chacha — quatrième photo : cheveux longs clairs, haut sombre.
5. Trystan — cinquième photo : cheveux bruns bouclés, barbe courte, polo bleu marine.

Créer des sprites pixel art plus détaillés à partir de ces références, avec des poses dans les trois directions que le jeu utilise (`down`, `up`, `side`) et des états de marche. Utiliser un style homogène, une silhouette lisible à la taille réelle du jeu et quelques accents de couleur qui rappellent les couleurs de profil existantes. Le rendu doit rester net avec le filtrage pixel art de Phaser.

Utiliser les cinq photos du message utilisateur comme références pour la génération des sprites ; les photos originales ne sont pas ajoutées au bundle de l’application. Les profils restent associés à leur identité et à leur rôle actuels. La sélection visuelle ne permet pas de changer de compte ou de permissions.

## Carte et maisons

Conserver la topologie actuelle du village : quatre maisons dans les coins, chalet familial, coffre, présentateur, sentiers et panneau. Conserver les coordonnées de jeu, hotspots, portes, interactions et règles de collision. Améliorer le dessin procédural pour donner plus de profondeur à la neige et aux sentiers, une lumière plus chaude aux zones habitées, et davantage de détails de saison qui ne gênent ni les personnages ni la lecture des interactions.

Garder les couleurs et l’identité de chaque maison. Leur donner des silhouettes et détails distinctifs cohérents avec le jeu associé : enseignes plus lisibles, fenêtres éclairées, neige sur les toits, éléments décoratifs et entrée visuellement claire. Les éléments qui deviennent solides doivent rester cohérents avec les rectangles de collision déjà définis.

Direction visuelle proposée : village de Noël au crépuscule, pixel art chaleureux, éclairages ambrés en contraste avec la neige bleue, animations discrètes de vent et de lumière. Le plan de jeu n’est pas déplacé.

## Animations, effets et corrections

- Améliorer les animations d’ambiance : neige à plusieurs plans, vent léger, guirlandes décalées, fumée, fenêtres et lanternes, coffre et présentateur.
- Harmoniser les effets d’interaction, de réussite et d’échec du village et des quatre mini-jeux ; conserver une intensité mesurée et éviter les flashes ou secousses inutiles.
- Réduire ou suspendre les effets Phaser quand `prefers-reduced-motion` est activé, avec prise en compte d’un changement de préférence pendant la session.
- Nettoyer les abonnements et animations appartenant aux scènes lorsqu’elles sont arrêtées ou recréées, en particulier l’abonnement `village:ready` du contrôleur.
- Garder les effets légers : nombre de particules borné, animations déterministes lorsque cela aide les captures, et pas de boucle ou d’émetteur orphelin après un changement de scène.

## Approches considérées

1. Redessiner les mascottes dans leurs petits tableaux de pixels actuels. Cette voie est légère et garde le rendu existant, mais limite la ressemblance aux cheveux, couleurs et accessoires.
2. Créer des sprites pixel art plus détaillés avec plusieurs poses et adapter le rendu React/Phaser pour les utiliser. Cette voie demande une intégration d’images, mais rend mieux les personnes fournies. **Option choisie par l’utilisateur.**

Les deux approches gardent le même plan de village et les mêmes règles de jeu. Les filtres pixelisés sur les photos originales n’ont pas été retenus : ils conserveraient les photos dans l’application et produiraient moins l’effet de personnage demandé.

## Contraintes et choix laissés à la réalisation

- Le code fourni se trouve dans `/workspace/christmas-quest`, extrait du ZIP utilisateur ; le checkout GitHub `anni` est vide et reste intact.
- Réutiliser les outils et dépendances présents dans le projet (`Phaser`, `React`, `TypeScript`, `Vite`, `Playwright`) et le verrouillage `package-lock.json`.
- Préserver la structure des profils et les contrats entre Phaser, React et la couche de données.
- Choisir le format de spritesheet et le découpage qui s’intègrent le mieux au renderer existant, après inspection du résultat généré. Ne pas inclure de dépendance de génération d’images à l’exécution.
- Préserver les fichiers source, tests, scripts et verrou de dépendances de l’archive avant toute modification ; vérifier les différences à la fin.

## Vérification

Après validation de la conception : installer avec `npm ci`, écrire les tests de comportement avant l’implémentation, puis exécuter `npm run typecheck`, `npm run build`, les tests unitaires et d’acceptation, le test de gameplay, et les vérifications Playwright visuelles pertinentes. Vérifier notamment le choix du bon personnage, la navigation et les collisions autour des maisons, les effets en mouvement réduit, l’absence d’erreurs navigateur et la recréation propre des scènes.

## Portée exclue

Pas de refonte de l’authentification, de sélection libre d’identité, de changement de mini-jeu, de données de compte, de contenu des listes ou de déploiement d’un backend. Les règles et résultats des mini-jeux restent inchangés.
