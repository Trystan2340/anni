# 🎄 Christmas Quest — prototype jouable (Noël 2026)

Prototype **Phaser 3 + TypeScript + React** du cahier des charges v3.1 : village enneigé, quatre
maisons, quatre mini-jeux originaux, chalet à coffre familial, cinq mascottes éditables et la liste
de Noël de Trystan, avec des réservations masquées dans l'interface jusqu'au **25 décembre 2026, 11 h**.

> État : **prototype jouable de bout en bout**. La couche « serveur » (`src/data/server.ts`) simule
> la base et toutes les règles d'autorisation derrière un contrat (`src/data/api/contract.ts`)
> prêt à être remplacé par Supabase. Le schéma PostgreSQL/RLS/RPC cible est fourni dans
> [`docs/schema.sql`](docs/schema.sql).
> Les données restent dans le navigateur : elles ne sont pas synchronisées entre appareils et
> les réservations ne sont pas protégées contre l'inspection du stockage local.

---

## Démarrer

```bash
npm install
npm run dev          # http://localhost:5173
npm run typecheck    # TypeScript strict
npm run build        # build de production
```

Pour un aperçu derrière un proxy qui impose le port 443 au rechargement automatique, définir
`CQ_HMR_CLIENT_PORT=443` avant de lancer Vite. En local, le port est choisi automatiquement.

### Comptes de démonstration (mot de passe commun : `noel2026`)

| Membre | E-mail | Rôle | Mascotte | Maison / mini-jeu |
|---|---|---|---|---|
| Maman | maman@famille-noel.fr | joueur | rose | La Fabrique de Friandises (match-3) → clé rose |
| Papa | papa@famille-noel.fr | joueur | bleue | Les Traîneaux Lumineux (arène) → clé bleue |
| Juju | juju@famille-noel.fr | joueur | dorée | Les Cadeaux Empilés (blocs) → clé dorée |
| Chacha | chacha@famille-noel.fr | joueur | violette | La Course du Père Noël (3 couloirs) → clé violette |
| Trystan | trystan@famille-noel.fr | admin | verte | aucune maison, aucune clé |

Un membre ne peut pas prendre une autre identité : l'invitation est nominative et l'aperçu de
mascotte est celui du profil choisi. Les clés commencent vides et sont ajoutées à l'inventaire
familial après les victoires.

### Ambiance et feedback

* **Effets** : neige sur deux plans (loin / devant), aurores douces, guirlandes qui clignotent,
  fumée de cheminée, halos de lanternes, empreintes dans la neige, étincelles au-dessus du coffre
  dès qu'une clé attend, confettis et secousse sur les victoires, textes flottants (« +3 »,
  « Combo ×2 », « Manche perdue »), transitions de caméra.
* **Sons 100 % synthétisés** (WebAudio, aucun fichier) : cloches, impacts, cascade de combo,
  fanfare de clé, ouverture du coffre, boucle musicale pentatonique. Boutons 🔇/🎵 en haut de
  chaque écran ; la musique s'arrête quand l'onglet passe en arrière-plan.
* Accessibilité : `prefers-reduced-motion` coupe toutes les animations décoratives.

### Commandes

| Action | Touche |
|---|---|
| Marcher | Flèches ou ZQSD |
| Interagir (porte, coffre, panneau, Trystan) | **E** ou **Espace** |
| Pause / retour | **Échap** |
| Mini-jeux sur ordinateur | voir le tutoriel affiché au lancement (souris + clavier) |
| Mini-jeux sur écran tactile | glissements indiqués dans chaque tutoriel (direction, saut, glissade, rotation) |

Un menu **Pause** propose aussi « Ouvrir la liste de Noël » et « Changer de compte » : si le clavier
ne passe pas dans un aperçu intégré, tout reste accessible à la souris. Le panneau `LISTE DE NOËL`
au centre du village apparaît lorsque les quatre clés ont été déposées et que l'image mystère a été résolue.

---

## Ce qui est implémenté

### Architecture des mascottes (contrainte §2)

```text
src/mascots/
  Maman.ts      Papa.ts      Juju.ts      Chacha.ts      Trystan.ts   ← un fichier par design
  types.ts      renderer.ts  index.ts
```

* Chaque fichier ne contient **que du design** : palette, pixel art 16 × 18 par direction
  (`down` / `up` / `side`), échelle, cadence de marche, accessoires, notes.
* `types.ts` = interface commune + validateur (`validateDesign`).
* `renderer.ts` = peinture canvas, textures Phaser, animations de marche générées
  (deux foulées + repos), avatars React (data-URL) : **aucun autre fichier de design n'est touché**.
* `index.ts` = registre des cinq designs + audit de validation au démarrage.
* Aucune permission, aucun mini-jeu, aucune règle métier dans ces fichiers.
* Modifier par exemple la coiffure de Maman = éditer les lignes de `Maman.ts` uniquement.

### Village (§3)

Vue du dessus, décor **entièrement procédural** (aucune ressource externe) : quatre maisons aux
quatre coins (rose, bleue, dorée, violette), chalet visitable au centre avec sapin et coffre familial,
sentiers, guirlandes,
sapins, bonshommes de neige, cadeaux, neige animée en particules. Collisions solides (zones
statiques), caméra suiveuse, indicateur `E` contextuel près des portes / du coffre / du panneau /
de Trystan, enseignes et noms de maisons.

### Mini-jeux (§4 à §8)

| Fichier | Jeu | Objectif | Victoire | Échec |
|---|---|---|---|---|
| `minigames/maman/MamanMatch3.ts` | La Fabrique de Friandises | 20 objets en 25 coups | clé rose | coups épuisés |
| `minigames/papa/PapaTron.ts` | Les Traîneaux Lumineux | 2 manches sur 3 | clé bleue | 2 manches perdues |
| `minigames/juju/JujuBlocks.ts` | Les Cadeaux Empilés | 8 lignes | clé dorée | pile qui déborde |
| `minigames/chacha/ChachaRunner.ts` | La Course du Père Noël | 600 unités + 15 cadeaux + 1 cœur | clé violette | 3 cœurs perdus |

Tous partagent (`minigames/common/shell.ts`) : présentation personnalisée, tutoriel, pause
(`Échap`), règle de victoire et d'échec, boutons **Rejouer / Quitter**, effets visuels de Noël.
Les quatre acceptent maintenant des glissements tactiles ; les objectifs restent les mêmes. La fabrique
de Maman indique un coup possible après 7 secondes d’inactivité, l’arène de Papa tient entièrement
dans l’écran et les vitesses de Papa, Juju et Chacha montent plus progressivement.
Aucune résolution automatique : tout est joué manuellement.

Optimisations demandées, effectivement codées :

* **Match-3** : analyse limitée aux lignes/colonnes touchées par l'échange et la chute ; détection
  de coup légal ; régénération bornée (6 tentatives) sans boucle infinie.
* **Arène** : `Uint8Array` d'occupation, collision évaluée sur la case suivante (aucun test de
  trace graphique) ; IA par évaluation des trois directions + remplissage d'espace borné, sans
  triche (elle voit la même grille que le joueur).
* **Blocs** : grille compacte, sac équilibré de sept pièces (pas de doublon à la jonction), rendu
  redessiné seulement sur changement.
* **Runner** : pool de 34 entités réutilisées, motifs toujours franchissables (un couloir libre
  minimum), difficulté progressive plafonnée (intervalle minimal 960 ms, vitesse max 6,6).

### Progression, clés et coffre (§9)

* `awardKey` est **idempotent** : chaque maison attribue sa clé à la famille, quel que soit le
  personnage choisi pour jouer.
* Les profils partagent l'inventaire familial. `depositKey` refuse une clé non gagnée; le
  petit coffre du chalet s'ouvre au 4ᵉ dépôt. Les anciennes sauvegardes locales sont réunies lors
  de la première ouverture de cette version.
* Chaque dépôt dévoile un quart de l'image mystère. Une fois les quatre morceaux visibles, écrire
  le nom de la personne débloque la liste de Noël de Trystan pour les profils de la famille.
* L'administration permet de corriger les clés ; l'énigme reste nécessaire pour accéder à la liste.

### Liste de Trystan et mode surprise (§10, §11)

* L'interface affiche uniquement la liste de Trystan. Les autres données de démonstration restent
  enregistrées, mais ne sont pas affichées.
* Cadeaux de Trystan : titre, description, priorité, prix indicatif, lien marchand facultatif, dates
  de mise à jour ; ajout / modification / suppression logique par le propriétaire.
* Les autres profils peuvent réserver les cadeaux visibles de Trystan ; une seule réservation active
  par cadeau, annulation réservée à son auteur, libération immédiate après annulation.
* **Surprise** : avant le 25/12/2026 11 h, le DTO envoyé au propriétaire **ne contient aucun champ
  de réservation** (`GiftOwnerBlind`), pas un simple champ masqué. Aucun badge, compteur, tri,
  message ou export ne peut donc révéler quoi que ce soit — y compris pour la liste de Trystan
  malgré son rôle d'administrateur.
* Après 11 h (horloge **serveur**, jamais celle du téléphone), le propriétaire voit qui a réservé
  quoi ; l'affichage est recalculé à chaque ouverture/reconnexion. Un commutateur
  « Simuler le 25/12 11 h » permet de tester les deux états instantanément.

### Administration (§1, §9)

Panneau admin : progression familiale et clés, corrections sans victoire fictive, nombre
d'incidents journalisés. Il **ne lit jamais** le statut des réservations de la liste de
l'administrateur avant la révélation.

---

## Architecture en un coup d'œil

| Couche | Rôle | Ne dépend jamais de |
|---|---|---|
| `mascots/` | design pur + rendu partagé | UI, données, mini-jeux |
| `minigames/` | règles de jeu uniquement | données, droits, clés |
| `minigames/common/MinigameScene.ts` | tutoriel, pause, résultat, boutons, effets, sons | règles des jeux |
| `game/` | village, contrôleur Phaser, effets, bus | React |
| `data/` | service autoritaire + règles pures de visibilité | React, Phaser |
| `ui/` | React, DTO déjà filtrés | décisions de sécurité |

Détail complet et règles de dépendance : [`docs/architecture.md`](docs/architecture.md).

## Tests

```bash
npm run dev                 # dans un terminal
npm run test:unit           # 17 tests des règles de visibilité (Node, sans navigateur)
npm run test:acceptance     # 24 vérifications du cahier des charges
npm run test:gameplay       # partie réelle de match-3 → clé rose → dépôt
npm run test:minigames      # gestes, cadrage et équilibre (navigateur, nécessite le serveur)
npm run test:minigames:visual # captures ordinateur/téléphone, commandes portrait et rotation
npm run test:visual         # parcours complet + captures dans shots/
npm run test:chalet-list    # chalet au toucher, liste de Trystan, réservations (Chromium)
npm run test:mobile-fullscreen # écran portrait plein viewport, commandes tactiles, chalet et mini-jeu
npm run test:visual-regressions # connexion tactile, compteur des clés et tutoriels mobiles
node tests/mystery-quest.mjs   # attribution, dépôt, réponse et sauvegarde
node tests/mystery-visual.mjs  # parcours mobile de l'image mystère (victoires simulées)
node tests/final-check.mjs  # captures « produit » (village, listes, mini-jeux, coffre)
```

`tests/acceptance.mjs` vérifie notamment : absence totale de champ de réservation avant Noël,
visibilité pour les autres membres, refus de réserver sa propre liste, double réservation
simultanée (une seule réussit), annulation réservée à son auteur, bascule 10 h 59 / 11 h 00 sur
horloge serveur, unicité des clés, dépôt impossible sans clé, ouverture du coffre au 4ᵉ dépôt,
persistance après actualisation, accès après l'énigme, ordre et titres des listes,
messages neutres lors de l'édition d'un cadeau réservé.

---

## Structure du projet

```text
src/
  App.tsx                     orchestration des vues et des modales
  audio/audio.ts              moteur sonore et musique procéduraux (WebAudio)
  mascots/                    cinq designs + types + renderer + registre
  minigames/
    common/MinigameScene.ts   socle commun : tutoriel, pause, résultat, boutons
    common/shell.ts           panneaux, boutons, overlays, HUD
    maman/MamanMatch3.ts      papa/PapaTron.ts
    juju/JujuBlocks.ts        chacha/ChachaRunner.ts
  game/
    VillageScene.ts           joueur, interactions (≈290 lignes)
    village/villageArt.ts     décor procédural + obstacles + positions de guirlandes
    village/hotspots.ts       zones d'interaction, fonctions pures
    village/actors.ts         coffre, présentateur, panneau des listes
    village/prompt.ts         pastille « E »
    village/ambient.ts        neige, aurores, guirlandes, fumée, empreintes
    fx/effects.ts             particules, confettis, halos, textes flottants
    controller.ts             cycle de vie Phaser, bascule village ⇄ mini-jeu
    bus.ts                    événements Phaser → React
  data/
    types.ts                  DTO (vues propriétaire masquée / révélée / autres)
    server.ts                 service autoritaire (sessions, clés, réservations)
    mock/seed.ts              jeu de démonstration + persistance
    mock/visibility.ts        règles pures : révélation et projection des cadeaux
    api/contract.ts|index.ts  frontière prête pour Supabase
  ui/                         connexion, HUD, coffre, listes, admin, neige, confettis, audio
docs/schema.sql               schéma PostgreSQL + RLS + RPC cible
docs/architecture.md          couches, sens des dépendances, socle commun
tests/                        unitaires, acceptation, gameplay, captures
```

## Passage en production (ce qui reste à brancher)

1. **Supabase Auth** : invitations nominatives, e-mail vérifié, mots de passe gérés par le
   fournisseur — remplacer `signIn()` du mock par `supabase.auth.signInWithPassword`.
2. **PostgreSQL** : appliquer `docs/schema.sql` (RLS, index unique partiel, RPC `list_gifts`,
   `reserve_gift`, `cancel_reservation`, `award_key`, `deposit_key`).
3. **Temps réel filtré** : ne publier que `gifts` ; les statuts de réservation repassent toujours
   par `list_gifts()` (donc par l'heure serveur).
4. **Stockage privé** pour les photos de cadeaux (URL signées), journaux et sauvegardes protégés.
5. **Sons et musiques originales**, atlas de textures si le volume d'images augmente.

Voir [`docs/revue-cahier-des-charges.md`](docs/revue-cahier-des-charges.md) pour les points à
trancher (§17 du cahier des charges) et les écarts assumés du prototype.
