# Guide d'administration – Chasse au trésor

Le contenu (établissements, parcours, énigmes, durée, point de ralliement) se gère désormais dans la page **`admin.html`**, sans toucher au code. Les données sont stockées dans une base **Supabase** ; le site les lit à chaque chargement.

- **Partie 1** : mise en place (une seule fois, par une personne à l'aise avec les comptes en ligne).
- **Partie 2** : mode d'emploi pour les collègues.
- **Partie 3** : dépannage et bonnes pratiques.

---

## Partie 1 – Mise en place (une seule fois)

### 1. Créer la base Supabase
1. Créer un compte sur supabase.com avec une **adresse partagée de l'agence** (pas une adresse personnelle : le projet doit survivre aux départs).
2. « New project » : nom au choix, région **Europe (Paris ou Francfort)**, mot de passe de base de données à conserver dans un coffre partagé.

### 2. Créer les tables
1. Ouvrir `schema.sql`, repérer la ligne `insert into public.admins … 'prenom.nom@francetravail.fr'` et **remplacer par l'adresse du premier administrateur** (un collègue de Saint-Malo).
2. Dans Supabase : **SQL Editor > New query**, coller tout le fichier, cliquer **Run**.
   À faire **une seule fois** : relancer le script créerait des doublons ou des erreurs.
3. Vérifier dans **Table Editor** : 5 établissements, 2 parcours, 10 étapes.

### 3. Régler l'adresse du site (obligatoire) et la connexion par mail (facultative)
**Obligatoire** : dans **Authentication > URL Configuration**, renseigner *Site URL* et *Redirect URLs* comme indiqué ci-dessous, sinon les liens de connexion renvoient vers `localhost`.

**Facultatif** : la connexion par lien reçu par mail. Elle demande un service d'envoi de mails (SMTP) personnalisé, car le service intégré de Supabase est limité à quelques mails par heure et ne permet pas de modifier les modèles de mail. **Sans SMTP, utiliser la connexion par mot de passe (étape 4 bis).**

1. **Authentication > URL Configuration** :
   - *Site URL* : l'adresse du site (ex. `https://compte.github.io/depot/`).
   - *Redirect URLs* : ajouter `https://compte.github.io/depot/admin.html`.
2. **Authentication > Emails > Magic Link** (recommandé) : ajouter dans le texte du mail la ligne `Code : {{ .Token }}`. Certains filtres de messagerie « consomment » le lien avant que la personne ne clique ; le code permet alors de se connecter quand même.
3. **Point à vérifier absolument – l'envoi des mails.** Le service d'envoi intégré de Supabase est très limité (quelques mails par heure) et, selon la configuration du projet, peut n'envoyer qu'aux membres de l'équipe Supabase. Ouvrir **Authentication > SMTP Settings** et lire ce qui est indiqué. Deux solutions :
   - configurer un **SMTP personnalisé** (Brevo, Resend, etc. ont des offres gratuites suffisantes), ou le SMTP de France Travail si la DSI en fournit un ;
   - ou inviter chaque collègue comme membre du projet Supabase (solution de dépannage).

### 4. Relier le site à la base
1. **Project Settings > API** : copier **Project URL** et la clé **anon / public**.
2. Les coller dans `config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`).
   Ces deux valeurs sont publiques par conception : la protection vient des règles de la base (`schema.sql`), pas du secret de la clé. **Ne jamais copier la clé `service_role`.**
3. Déposer tous les fichiers sur le dépôt GitHub (voir « Fichiers » ci-dessous), puis attendre la mise à jour de GitHub Pages (1 à 2 minutes).

### 4 bis. Créer les comptes des collègues (connexion par mot de passe, sans mail)
Pour chaque collègue :
1. Supabase : **Authentication > Users > Add user > Create new user**.
2. Saisir son adresse **@francetravail.fr** et un mot de passe de départ (12 caractères minimum, différent pour chaque personne). Cocher **Auto Confirm User** s'il apparaît.
3. Lui communiquer le mot de passe de façon sûre (de vive voix ou par téléphone, pas dans le même mail que l'adresse du site). Il pourra le changer lui-même avec le bouton « Changer mon mot de passe » de la page d'administration.
4. Vérifier que son adresse figure bien dans l'onglet **Administrateurs** de la page d'administration (le premier administrateur est celui indiqué dans `schema.sql`). Avoir un compte ne suffit pas : c'est la liste des administrateurs qui donne le droit de modifier.

### 5. Avant le départ de la personne qui met en place
- Transférer le **dépôt GitHub** à un compte ou à une organisation de l'agence (ou donner le rôle propriétaire à un collègue).
- Vérifier que le **projet Supabase** appartient au compte partagé et que deux personnes au moins peuvent y accéder.
- Vérifier que **deux administrateurs** au moins sont dans l'onglet « Administrateurs ».

### Fichiers
| Fichier | Rôle |
|---|---|
| `admin.html` | page d'administration (nouveau) |
| `config.js` | adresse et clé de la base (nouveau, à remplir) |
| `schema.sql` | création de la base, à exécuter une fois (nouveau) |
| `parcours.html` | page de jeu unique : `parcours.html?p=<numéro>` (nouveau) |
| `data.js`, `hunt.js`, `index.html` | modifiés : lisent la base, avec données de secours |
| `parcours1.html`, `parcours2.html` | redirigent vers `parcours.html?p=1` et `?p=2` (anciens QR codes et liens conservés) |
| `common.js`, `style.css`, `questionnaire.html`, `thankyou.html` | inchangés |

---

## Partie 2 – Mode d'emploi pour les collègues

### Se connecter
1. Ouvrir la page **admin.html** du site.
2. Saisir son adresse **@francetravail.fr** et le mot de passe reçu, puis « Se connecter ».
3. Changer son mot de passe avec le bouton « Changer mon mot de passe » (en haut de la page, une fois connecté).
   (Si l'envoi de mails est configuré, la connexion par lien reçu par mail reste possible dans la zone repliable sous le formulaire.)

Seules les adresses présentes dans l'onglet « Administrateurs » peuvent modifier le contenu.

### Ajouter un établissement
Onglet **Établissements > Ajouter un établissement** : nom, adresse complète (numéro, rue, code postal, ville), site web et photo si on veut. La position sur la carte est trouvée toute seule.
**Toujours cliquer sur « voir sur la carte »** après l'enregistrement pour vérifier que le point est au bon endroit. S'il est faux, ouvrir « Modifier > Avancé » et saisir latitude et longitude (clic droit sur Google Maps).

### Créer ou modifier un parcours
Onglet **Parcours et énigmes** :
- **Créer un parcours** : saisir un nom, puis « Ajouter une étape » autant de fois que nécessaire. Le nombre d'étapes est libre.
- **Une étape** = un établissement + une énigme + les réponses acceptées (une par ligne) + un indice facultatif. Les accents, majuscules et « le / la / l' » sont ignorés lors de la vérification.
- Les flèches ↑ ↓ changent l'ordre, ✎ modifie, ✕ retire l'étape.
- **Visible sur le site** : décocher pour masquer un parcours sans le supprimer (utile entre deux saisons).

Les changements sont **visibles tout de suite** sur le site (recharger la page).

### Paramètres
Durée du chrono et point de ralliement (affiché sur l'accueil si renseigné).

### Ajouter ou retirer un collègue
Onglet **Administrateurs** : ajouter son adresse @francetravail.fr. Il pourra se connecter immédiatement.

### Supprimer un établissement
Impossible tant qu'il figure dans une étape : le retirer d'abord des parcours concernés.

---

## Partie 3 – Dépannage et bonnes pratiques

- **Le site affiche d'anciennes données** : si la base est injoignable, le site utilise la dernière version mémorisée dans le navigateur, sinon les données de secours de `data.js` (Saint-Malo, version d'origine). Vérifier que le projet Supabase n'est pas en pause.
- **Projet en pause** : sur l'offre gratuite, Supabase met un projet en pause après environ une semaine sans activité. Pour un projet saisonnier, ouvrir le tableau de bord Supabase avant chaque période d'utilisation et cliquer sur « Restore » si besoin. Ne rien perdre : les données sont conservées.
- **Je ne reçois pas le mail de connexion** : regarder les indésirables ; vérifier le point 3 de la Partie 1 (envoi des mails) ; attendre quelques minutes entre deux demandes.
- **« Accès non autorisé »** : l'adresse n'est pas dans la liste des administrateurs.
- **Sauvegarde** : dans Supabase, **Table Editor**, chaque table peut être exportée en CSV. À faire avant chaque saison.
- **Anciens liens** : `parcours1.html` et `parcours2.html` pointent vers les parcours numérotés 1 et 2 dans la base. Si on supprime puis recrée ces parcours, leurs numéros changent : l'adresse à imprimer sur un QR code est alors `parcours.html?p=<numéro>` (le bouton « Voir » de l'administration ouvre la bonne adresse).
- **Confidentialité** : les réponses aux énigmes sont lisibles par quiconque inspecte le site, comme avant. Ne jamais saisir de données personnelles dans l'administration.
- **Carte** : la restriction à l'intra-muros de Saint-Malo a été retirée pour pouvoir placer un établissement hors des remparts ; la carte se centre sur le premier établissement du parcours.
