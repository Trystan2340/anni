# Christmas Quest

Ce dépôt contient le site prêt à publier à sa racine et le projet complet dans `projet/`. Les fichiers dans `assets/` et `index.html` sont destinés à GitHub Pages ; conservez-les au même niveau à la racine du dépôt.

Dans **Settings → Pages**, choisissez la branche `main` et le dossier `/ (root)` pour publier les fichiers déjà construits. Pour reconstruire le site automatiquement à chaque mise à jour du dossier `projet/`, choisissez **GitHub Actions** dans les paramètres Pages : le workflow `.github/workflows/pages.yml` construit et publie le jeu.

La configuration Web Firebase est publique et sert à identifier le projet Firebase. Les règles Firestore se trouvent dans `projet/firestore.rules` ; elles doivent être installées dans Firebase pour synchroniser les clés. La synchronisation et les règles n'ont pas encore été vérifiées sur le projet réel. Les réservations restent locales.
