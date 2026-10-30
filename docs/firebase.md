# Firebase : comptes et clés

## Mise en service

Le projet Web utilise la configuration publique Firebase de `.env`. Dans Authentication, activer la connexion par e-mail et mot de passe. Chaque personne peut choisir un personnage, créer son compte et se connecter dans le jeu. Le personnage est stocké dans le nom d'affichage de Firebase Authentication ; ce champ est modifiable et ne prouve pas l'identité de la personne.

La connexion Firebase du jeu nécessite les règles `firestore.rules`. Dans Firestore > Règles, remplacer le contenu par ce fichier, puis publier. Les règles sont préparées pour le document `families/famille-noel/state/progress` et refusent l'accès aux autres documents. À vérifier sur le projet cible avant utilisation : elles n'ont pas été exécutées contre un émulateur ni sur ce projet.

## Fonctionnement et limites

- Toute personne qui crée un compte peut rejoindre la partie : c'est le choix retenu. Tout compte connecté peut lire la progression familiale et essayer de gagner ou déposer une clé. Les transactions empêchent les pertes lors de modifications simultanées et les règles conservent les clés déjà enregistrées.
- Les règles ne prouvent pas qu'un mini-jeu a été gagné : un utilisateur qui modifie le client ou utilise directement Firestore peut obtenir des clés et résoudre l'énigme sans jouer. Le personnage et son nom d'affichage ne sont pas une preuve d'identité et plusieurs comptes peuvent choisir le même personnage.
- Les clés, dépôts et réponse à l'énigme sont partagés entre les comptes. Une transaction nécessitant le serveur, la connexion doit être disponible pour enregistrer une victoire ou un dépôt. La fenêtre de victoire permet de réessayer en cas d'échec.
- Les clés de l'ancien mode local ne sont pas automatiquement importées, pour éviter d'écraser les données Firestore. Elles restent dans le mode démo sur le navigateur d'origine.
- Les cadeaux et réservations restent en local et ne sont pas synchronisés. Ces règles ne donnent aucun accès aux documents de réservation. Il faut encore une architecture de réservation qui garde les informations invisibles à Trystan avant la date prévue, y compris en accès direct, puis l'intégrer et la vérifier.
- Les comptes ne sont pas limités à la famille et le choix de Trystan n'accorde aucune protection d'administrateur côté Firebase. La fonction d'administration des clés est désactivée en mode Firebase.
- Ne pas placer de secret ni de compte de service dans les variables `VITE_` ; elles sont incluses dans le navigateur.
