# KTT · Kill Team Tactics

Le site se reconstruit tout seul à chaque modification enregistrée sur GitHub (environ une minute).
Tu n'as jamais besoin d'installer quoi que ce soit.

## Mise en ligne (une seule fois)

1. Dans le dépôt `ktt` sur GitHub : **Settings › Pages › Build and deployment › Source** : choisis **GitHub Actions**.
2. Envoie les fichiers de ce dossier dans le dépôt (**Add file › Upload files**, glisse tout le contenu du dossier, puis **Commit changes**).
3. Le dossier caché `.github` ne passe pas toujours par le glisser-déposer. Vérifie qu'il existe dans le dépôt. Sinon : **Add file › Create new file**, nomme le fichier `.github/workflows/deploy.yml` et colle dedans le contenu du fichier du même nom.
4. Onglet **Actions** : la publication démarre. Coche verte = le site est en ligne sur https://kteamtactics.github.io/ktt/

Les anciens fichiers du site (analysis.html, puzzle.html, assets/…) peuvent rester ou être supprimés : ils ne sont plus publiés.

## Publier depuis le site (owner mode)

Le plus simple : https://kteamtactics.github.io/ktt/owner/ (page cachée, non référencée par Google).

1. **Une seule fois par appareil** : crée une clé GitHub. github.com › Settings › Developer settings › Personal access tokens › **Fine-grained tokens** › Generate new token. Choisis seulement le dépôt `kteamtactics/ktt`, puis dans *Permissions* : **Contents : Read and write** et **Actions : Read-only**. Copie la clé.
2. Sur la page owner, colle la clé et choisis un mot de passe. La clé reste sur cet appareil, verrouillée par ton mot de passe. Les fois suivantes, seul le mot de passe est demandé.
3. Choisis une rubrique (News, Tactics, Battle analysis, Teams, Maps, Pages, Site settings), ouvre un contenu ou crée-en un, remplis les champs, puis **Publish**. Le statut passe à « Online ✓ » quand le site est à jour (environ une minute).

Tu peux y envoyer des images, modifier le plateau Game Boy (ajouter un opérateur, le placer en cliquant, dessiner les déplacements, tirs, combats et morts de chaque étape) et supprimer une page.

### Publier une fiche d'équipe

Chaque fiche contient déjà ses règles, mais elles restent cachées tant que la case **« Guide published »** n'est pas cochée : la page affiche alors les notes, les points forts et faibles, et un encadré « Guide in progress ». Relis les règles dans les cinq grands champs (une règle par ligne, `Nom: ce qu'elle fait`), coche la case, puis **Publish**. La carte de l'équipe affiche alors le badge « Full guide ».

**New team** crée une nouvelle équipe. Sans pixel art, un personnage « ? » s'affiche ; tu peux envoyer ton image dans le champ « Pixel art ».

### Maps

- **New map (squares)** : un plateau en cases, pour les puzzles. Choisis la taille. **Wall** et **Cover** posent un mur ou un couvert sur la ligne entre deux cases : clique sur la ligne (ou glisse le long), reclique dessus pour l'enlever ; **Eraser** efface. **Cover —**, **Cover |** et **Cover ■** posent un couvert n'importe où : clique à l'endroit voulu (reclique dessus pour l'enlever). Pour remplir une case entière : **Solid block**, **Cover block**, **Empty square**.
- Les maps « killzone » (Volkus, Tomb World, Gallowdark…) se modifient avec leurs chiffres ; l'aperçu se met à jour quand tu quittes le cadre. **Save as a copy** crée une nouvelle map à partir d'une existante.
- Une nouvelle map apparaît dans la liste des plateaux environ une minute après sa publication (recharge la page owner).

### Pages (KTT…)

Les pages fixes du site, comme **About KTT**. Le champ « Name in the top menu » ajoute la page au menu (ex. « KTT ») ; vide, la page existe mais n'est pas dans le menu.

## Modifier un contenu directement sur GitHub

Tout se fait dans GitHub, avec le **crayon** (Edit) en haut à droite d'un fichier, puis **Commit changes**.

| Je veux… | Fichier |
|---|---|
| Écrire une news | copier `content/news/_template.md` dans un nouveau fichier `content/news/mon-titre.md` |
| Écrire un article tactique ou un puzzle | copier `content/tactics/_template.md` |
| Écrire une battle analysis | copier `content/battle-analysis/_template.md` |
| Modifier une équipe (résumé, étoiles, forces…) | `content/teams/nom-de-l-equipe.md` |
| Publier le guide d'une équipe | dans son fichier, ajouter la ligne `guide: published` |
| Modifier la page « About KTT » | `content/pages/about.md` |
| Newsletter, réseaux, pubs, adresse du site | `site.yml` |
| Ajouter une image | l'envoyer dans `static/img/articles/`, puis écrire `/img/articles/nom.jpg` dans l'article |

Règles simples :
- Le haut de chaque fichier, entre les deux lignes `---`, contient les réglages (`titre: valeur`). Garde les espaces au début des lignes : ils comptent.
- En dessous, tu écris le texte normalement. Une ligne vide = nouveau paragraphe. `## Titre` = intertitre. `**gras**`, `*italique*`.
- Le nom du fichier devient l'adresse de la page : `content/news/legion-du-damne.md` → `/news/legion-du-damne/`.
- Un fichier dont le nom commence par `_` n'est jamais publié (pratique pour les brouillons). Tu peux aussi mettre `draft: true`.
- Pour mettre un article en grand sur la page d'accueil : `featured: true`.

## Le plateau Game Boy

Il se règle dans l'owner mode, sous les champs de l'article (bouton « Add a board »). Trois types :
- **Battle analysis** : déploiement, puis les moments clés, avec Précédent / Suivant ;
- **Tactics concept** : les étapes d'une idée tactique ;
- **Your move** (puzzle) : le lecteur choisit l'action (Reposition, Charge, Fight, Shoot, Loot…). Pour chaque étape de la solution, indique la bonne action et l'opérateur. Les sprites des équipes s'affichent sur le plateau.

Dans les fichiers, les positions s'écrivent avec le nom de la case (`C4`) ou en pouces (`[12.4, 8.6]`). Les maps sont dans `data/maps.json`.

## Si quelque chose ne marche pas

Si une modification contient une erreur, le site **ne change pas** : l'ancienne version reste en ligne.
Dans l'onglet **Actions**, la ligne avec une croix rouge explique quoi corriger (nom du fichier et problème), par exemple une équipe inconnue ou une ligne mal alignée.

## Les pubs

Quand ton compte Google AdSense est validé, remplis `ads` dans `site.yml` (`enabled: true`, ton `client` `ca-pub-…` et les numéros de blocs). Les emplacements sont déjà prévus dans les pages. AdSense demande en général un nom de domaine à toi : quand tu l'as, change `url` et `base_path` dans `site.yml`.
