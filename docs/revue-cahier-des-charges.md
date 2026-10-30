# Revue du cahier des charges v3.1 — état du prototype et points à trancher

## 1. Couverture du cahier des charges

| § | Exigence | État |
|---|---|---|
| 1 | Cinq comptes, rôles, mascottes assignées, invitations nominatives | ✅ prototype (auth locale) |
| 1 | Trystan admin sans identité interchangeable, sans cinquième maison | ✅ |
| 2 | Cinq fichiers de design séparés + types/renderer/registre | ✅ |
| 2 | Animations repos/face/dos/profil/marche, registre textures | ✅ (générées depuis les pixels) |
| 2 | Trystan présentateur près du coffre | ✅ (PNJ + dialogue de règles) |
| 3 | Village enneigé, collisions, portes, coffre, indicateurs | ✅ |
| 4–7 | Quatre mini-jeux jouables, victoire/défaite/récompense uniques | ✅ |
| 8 | Tutoriel, pause, Rejouer/Quitter, pas de résolution automatique | ✅ |
| 9 | Clés idempotentes, dépôt physique, coffre 0/4 → 4/4, cinématique | ✅ |
| 10 | Liste de Noël de Trystan seule affichée, édition des cadeaux | ✅ |
| 11 | Réservations, unicité, annulation, surprise jusqu'au 25/12 11 h | ✅ (règles serveur simulées) |
| 12 | Sécurité serveur, RLS, RPC, unicité SQL, horloge serveur | 🟡 schéma fourni, non déployé |
| 13 | Modèle de données PostgreSQL | ✅ `docs/schema.sql` |
| 14 | Stack Phaser 3 + TypeScript + React, responsive | ✅ (tests visuels desktop + mobile) |
| 15 | Tests d'acceptation | ✅ 24 tests automatisés |
| 16 | Ordre de réalisation | étapes 1 à 9 couvertes, étape 10 partielle (sons/musiques absents) |

Légende : ✅ fait · 🟡 préparé mais à déployer · ⬜ non commencé.

## 2. Ce que le prototype ne fait pas (par choix, pour rester testable)

* **Pas de backend réel** : `src/data/server.ts` remplace Postgres/Supabase. Les règles sont écrites
  au même endroit (une seule couche) pour que le remplacement soit mécanique. Le vrai déploiement
  demande Supabase Auth, le schéma fourni et le stockage privé.
* **Pas de sons ni musiques** : le cahier des charges les exige à l'étape 10 ; ils sont volontairement
  laissés pour la passe finale (droits et création des pistes originales).
* **Photos de cadeaux** : champ prévu, upload non branché (stockage privé + URL signées).
* **Expiration à 48 h** : le réglage existe (`game_settings.reservation_expiry_hours`) et reste
  `NULL` par défaut, conformément à §11.
* **Téléphone** : l'espace listes/réservations est responsive et utilisable ; le village complet
  reste une expérience clavier (souris possible pour les mini-jeux, pas pour se déplacer).

## 3. Décisions d'interprétation prises

1. **« Trône » = Tron** (arène à traînées lumineuses), comme proposé dans le cahier des charges.
   Le module est isolé (`minigames/papa/PapaTron.ts`) : le remplacer ne touche ni le coffre, ni les
   comptes, ni les listes.
2. **Titres de listes** : « Ma liste de Noël » pour le propriétaire de la liste principale (Trystan),
   « Liste de Trystan » pour les autres ; « Ma liste de Noël » pour sa propre carte secondaire et
   « Liste de <prénom> » sinon. L'ordre global ne dépend jamais du titre.
3. **Dévoilement** : contrôle serveur strict (`now() >= reveal_at`), recalcule à chaque appel. Un
   onglet déjà ouvert à 11 h ne se met pas à jour tout seul (aucun événement temps réel ne porte le
   statut) : une actualisation ou une réouverture dévoile l'information, ce qui satisfait §11 tout en
   évitant toute fuite par diffusion.
4. **Administration** : le rôle admin ouvre les listes et corrige les progressions ; il ne crée
   aucune victoire (`key_awards` n'est jamais alimenté par la correction) et ne voit pas sa propre
   liste dévoilée avant l'heure.
5. **Suppression** : logique (`deleted_at`), message strictement neutre, identique que le cadeau
   soit réservé ou non.

## 4. Points à confirmer (renvoi au §17)

- [ ] **Jeu de Papa** : Tron confirmé, ou un autre jeu désigné par « trône » ?
- [ ] **Mascottes** : souvenirs, couleurs et accessoires réels de Maman, Papa, Juju et Chacha
      (le prototype propose des palettes et accessoires provisoires, modifiables dans un seul fichier).
- [ ] **Maisons** : ambiance intérieure souhaitée (décor, souvenirs, photos autorisées).
- [ ] **Listes** : contenu réel des cadeaux, liens marchands, photos autorisées.
- [ ] **Expiration 48 h** des réservations : à activer ou non (désactivée par défaut).
- [ ] **Sons/musiques** : pistes originales à commander ou bibliothèque libre de droits ?

## 5. Recommandations techniques pour la suite

1. Déployer le schéma tel quel puis **tester les RLS** avec les cinq comptes réels (le test
   d'acceptation §11 « à 10 h 59, aucune donnée révélatrice par API » doit tourner contre Postgres).
2. Faire passer `list_gifts()` par une fonction `security definer` unique : c'est le seul point qui
   décide de la visibilité, donc le seul à auditer.
3. Ajouter un test d'intégration sur la course de réservation en parallèle (`Promise.all` de deux
   RPC) : l'index partiel `reservations_one_active_per_gift` est la garantie, pas le code client.
4. Prévoir un mode « répétition générale » : simulateur d'horloge côté serveur de préproduction,
   pour vérifier le passage à 11 h sans attendre décembre.
5. Charger les scènes de mini-jeux à la demande (`scene.launch` paresseux / découpage Vite) quand
   les assets graphiques définitifs arriveront.
