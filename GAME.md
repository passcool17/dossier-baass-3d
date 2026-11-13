# Dossier BAASS · 3D — v0.2.4

- Lien jouable : https://passcool17.github.io/dossier-baass-3d/ (le `?v=` du SHA sera ajouté après le push)
- Dépôt : https://github.com/passcool17/dossier-baass-3d
- Commit : à venir (jeu v0.2.4). La v0.2.3 était `a396e5e62c566f1f7461635c9440b9ccdafc63c2` (a396e5e), docs `417fd16`. La v0.2.2 était `6b679e3`, docs `0ea8b8a`. Un second commit de documentation suit, avec le lien live et les mesures.
- État : v0.2.4 — le pad de direction vient du module partagé `/workspace/shared/touch-controls/` (copie dans `vendor/touch-controls/`). Mapping inchangé par rapport à la v0.2.3. Rien de visuel n’a changé. Enquêteur fictif sur un site secret (ranch, hangar, bunker, site d’épave). Huit preuves, chacune un extrait réel du *BAASS Project Management Plan* (2 décembre 2008, DOW-UAP-D168). Survol du TR-3B (modèle de Dylusion) au-dessus du hangar, épave d’une soucoupe liée aux citations Roswell 1947 réellement présentes dans la source (page PDF 45). Interface en français.

Bandeau permanent : **plan de recherche, pas une preuve ; histoire fictive**.

Ceci est un **jeu**. Le document source est un plan de gestion de recherche, pas une preuve de physique nouvelle ni d’engin extraterrestre. L’histoire et le site sont une fiction. Les citations, elles, sont des extraits mot pour mot, vérifiés page par page.






## v0.2.4 — module partagé de pad tactile (13 nov. 2026)

Règle approuvée par Pascal le 13 novembre 2026 : **un seul** module de pad tactile pour tous les jeux, à `/workspace/shared/touch-controls/`. Les deux Arcade (3D et Phaser 2D) le réutilisent et le corrigent là, jamais une copie divergente. Chaque jeu le copie dans son dépôt au moment de publier. Ce jeu est le premier à l’adopter. `VERSION` **0.2.4**. Le mapping de la v0.2.3 (pad, WASD, manette, regard) est conservé ; l’apparence du pad est la même. Le service worker reste network-first (v0.2.2).

### Module

Source : `/workspace/shared/touch-controls/` (module ES **1.0.0**, sans dépendance Three.js).

| Fichier | Rôle |
|---|---|
| `touch-controls.js` | `createMoveInput`, `cameraRelative`, `screenRelative2D`, `padAxesFromDelta` |
| `touch-controls.css` | style par défaut du pad |
| `tests/signs.test.mjs` | tests de signes (node) |
| `demo.html` | petite page de démo |
| `README.md` | API, signes, copie dans un dépôt, checklist (FR + EN) |

Copie dans ce dépôt : `vendor/touch-controls/touch-controls.js` et `.css`. Importmap et précache : `./vendor/touch-controls/touch-controls.js?v=0.2.4`.

`createMoveInput({ element, keyboard, azerty, gamepad, lookElement, lookFilter, onStart, deadzone })` → `{ read(), readLook(), reset(), destroy(), resize() }`.

- `read()` : `{x, y}` dans [−1, 1], **`y = +1` = avant / haut** (le signe Y de l’écran, qui grandit vers le bas, est corrigé dans le module). Fusionne le pad, le clavier (WASD, flèches, ZQSD optionnel) et le stick gauche.
- `cameraRelative(x, y, yaw)` → `{x, z}` monde Three.js. Caméra en `(px − sin(yaw)·hd, pz − cos(yaw)·hd)`, regard `(sin(yaw), cos(yaw))`. Haut = s’éloigner de la caméra, droite = droite caméra.
- `screenRelative2D(x, y)` : haut = −Y (Phaser).
- `readLook()` : `{dx, dy}`, glisser à droite = `dx` positif. Recalcul sur `resize` / `orientationchange`. Remise à zéro sur `visibilitychange` et `blur`. Multi-touch (un doigt pad, un doigt regard).

Dans `main.js`, l’ancien code de mapping du joystick et du clavier est retiré. Le regard souris / verrouillage du pointeur et le stick droit de manette restent dans le jeu. Le visuel du pad (`#joyL`, styles dans `style.css`) est inchangé.

### Tests

- `/workspace/shared/touch-controls/tests/signs.test.mjs` **16 / 16 PASS**.
- `tests/t-joystick.cjs` **124 / 124 PASS** (412×915 et 915×412, toutes les zones, passage du menu, `look.dragRight.turnsRight`, 0 erreur, 0 HTTP ≥ 400).
- `quotes.test.mjs` **PASS** (2/2).
- `t01.js` 412×915 et 915×412 **PASS**, 0 erreur, 0 HTTP ≥ 400.
- `tests/t-sw-upgrade.cjs` **PASS** : worktree `6c8de4e` (v0.2.0) → 0.2.4, menu affiché, `__game.version === "0.2.4"`, 0 erreur, 0 HTTP ≥ 400, cache **uniquement** `dossier-baass-3d-v0.2.4` (81 fichiers, dont `touch-controls.js?v=0.2.4`).

### Mesures live

À venir dans le commit de documentation, après publication. Attendues identiques aux vues de jeu de la v0.2.3 (la plus chargée : épave paysage **69 / 56 924**).

Bandeau et citations : **inchangés**.

## v0.2.3 — pad de direction et regard (13 nov. 2026)

Pascal, sur son S20, à la v0.2.2 (`?v=6b679e3`) : « le pad de direction tout est inversé ». `VERSION` **0.2.3**. Rien de visuel n’a changé ; les appels et triangles doivent rester ceux de la v0.2.2 (identiques aux vues de jeu de la v0.2.1). Le correctif network-first du service worker (v0.2.2) est **inchangé**.

### Cause

Ce n’est pas le signe Y du joystick (un glissement vers le haut donne déjà `joy.ny < 0`, comme la touche W), ni particulièrement le `camYaw` posé par `goto` / `placeCameraSafe` en v0.2.1. La **transformée caméra-relative** `fx` / `fz` était entièrement niée depuis au moins la v0.2.0 :

```
fx =  input.x * cos(yaw) + input.z * sin(yaw)
fz = -input.x * sin(yaw) + input.z * cos(yaw)
```

La caméra est en `(px − sin(yaw)·hd, pz − cos(yaw)·hd)` et regarde le joueur, donc sa direction de regard en XZ est `(sin(yaw), cos(yaw))`. Avec cette formule, W (ou stick vers le haut) rapprochait le joueur de la caméra, et D l’envoyait à gauche de l’écran. Le pad virtuel, WASD / flèches et le stick gauche de manette partagent le même `input.x` / `input.z` : les trois axes étaient donc inversés.

Le regard était aussi inversé : `camYaw -= dx` faisait tourner la vue vers la gauche quand on glissait vers la droite (souris, verrouillage du pointeur, doigt, stick droit de manette).

### Correctif

```
fx = -(input.x * cos(yaw) + input.z * sin(yaw))
fz = -(-input.x * sin(yaw) + input.z * cos(yaw))
```

Stick / W vers le haut = s’éloigner de la caméra (avant à l’écran). Stick / S vers le bas = se rapprocher. Stick / D vers la droite = droite caméra à l’écran. Le mapping `joy.nx` / `joy.ny` n’a pas été touché (le corriger en plus aurait doublé le signe).

Regard : `camYaw +=` (glisser à droite tourne la vue à droite) et `camPitch += movementY` (glisser vers le bas baisse le regard), pour la souris, le doigt et la manette.

`index.html` : `?v=0.2.3` sur `style.css`, `main.js` et l’importmap (`data.js`, `mood.js`, `props.js`, detect-gpu). `sw.js` inchangé : VERSION toujours lue sur l’URL d’enregistrement `./sw.js?v=` + VERSION, HTML/CSS/JS toujours network-first.

### Test du pad — `tests/t-joystick.cjs`

À 412×915 et 915×412, pour chaque zone (ranch, hangar, entrée, rampe, laboratoire, épave) et après le passage menu orbite → **Commencer**, un glissement haut / droite / bas / gauche sur le joystick, puis les touches W / D / S / A. La position du joueur **après** le mouvement est projetée avec une **copie figée** de la caméra d’avant (la caméra de jeu suit le joueur, donc une projection « live » donnerait un delta nul). Sur la rampe, en descente, « s’éloigner de la caméra » peut apparaître vers le bas de l’écran : le test retombe alors sur le déplacement monde le long des vecteurs regard `(sin, cos)` et droite `(−cos, sin)`.

Le regard est aussi vérifié : après un glissement de 80 px vers la droite, un point devant le joueur doit glisser vers la gauche de l’écran (NDC x diminue).

Résultat : **124 / 124 PASS**, 0 erreur console, 0 HTTP ≥ 400, aux deux orientations, toutes les zones, le passage du menu, et `look.dragRight.turnsRight`.

### Autres tests

`quotes.test.mjs` **PASS** (2/2). `t01.js` 412×915 et 915×412 **PASS**, 0 erreur, 0 HTTP ≥ 400. `tests/t-sw-upgrade.cjs` **PASS** : worktree `6c8de4e` (v0.2.0) → arbre 0.2.3, menu affiché, `__game.version === "0.2.3"`, 0 erreur, 0 HTTP ≥ 400, cache **uniquement** `dossier-baass-3d-v0.2.3` (80 fichiers, `mood.js?v=0.2.3`).

### Mesures live (Chrome `--use-gl=angle --use-angle=gl`, llvmpipe, `?v=a396e5e&tier=3`)

Vues de jeu **identiques** à la v0.2.2 (et donc à la v0.2.1). Menu portrait : 49 / 45 304 (v0.2.2 était 49 / 45 144 — écart d’orbite de 160 triangles, même nombre d’appels). Menu paysage : 63 / 48 850, identique. Toutes sous 100. 0 transmission. 0 erreur console, 0 HTTP ≥ 400. Version servie **0.2.3**. Service worker `sw.js?v=0.2.3`, cache **`dossier-baass-3d-v0.2.3` uniquement**. Bandeau inchangé. Modules demandés en `?v=0.2.3`.

Ces chiffres sont ceux de la box (llvmpipe), **pas** ceux du S20 FE (non mesuré). Vue la plus chargée : site de l’épave en paysage, **69 appels / 56 924 triangles**.

| Vue | 412×915 (appels / tris) | 915×412 (appels / tris) | v0.2.2 |
|---|---|---|---|
| Menu (orbite TR-3B) | 49 / 45 304 | 63 / 48 850 | 49 / 45 144 · 63 / 48 850 |
| Ranch | 22 / 29 914 | 38 / 35 056 | identique |
| Hangar | 16 / 14 740 | 23 / 18 688 | identique |
| Entrée du bunker | 35 / 41 578 | 56 / 49 730 | identique |
| Rampe | 43 / 40 258 | 48 / 42 084 | identique |
| Laboratoire (goto lab) | 35 / 34 412 | 42 / 36 096 | identique |
| Site de l’épave | 42 / 41 928 | **69 / 56 924** | identique |
| TR-3B (vol stationnaire) | 36 / 34 376 | 59 / 47 386 | identique |
| Classeurs (cadrage composé) | 28 / 26 032 | 31 / 29 364 | identique |
| Serveurs (cadrage composé) | 36 / 34 612 | 42 / 36 096 | identique |

Bandeau et citations : **inchangés**.

## v0.2.2 — mise à jour du service worker sans mélange (13 nov. 2026)

Correction du bug QA moyen de la v0.2.1 : après un passage v0.2.0 → v0.2.1, le service worker encore en place servait un `mood.js` périmé (sans `?v=`). L’écran restait sur le chargement, avec l’erreur `./mood.js has no export named addServerLeds` et un HTTP 404. `VERSION` **0.2.2**. Rien de visuel n’a changé ; les appels et triangles doivent rester ceux de la v0.2.1.

### Correctif

- **Importmap** dans `index.html` : tous les modules locaux (`./data.js`, `./mood.js`, `./props.js`, `./vendor/detect-gpu.esm.js`) sont résolus en `?v=0.2.2`. `main.js` et `style.css` aussi. C’est la source unique des URL versionnées ; la constante `VERSION` dans `data.js` doit rester égale à ce `?v=`.
- **sw.js** : précache de ces mêmes URL versionnées. HTML, CSS et tout JavaScript sont **network-first** (`cache: 'no-store'`). `skipWaiting` + `clients.claim`. Les anciens caches sont effacés à l’activation, puis une seconde fois 800 ms plus tard, et à chaque `fetch`, pour qu’un `put` encore en cours de l’ancien worker ne fasse pas réapparaître `dossier-baass-3d-v0.2.0`.
- Un ancien SW (v0.2.0 ou v0.2.1), qui reste cache-first sur les URL avec `?v=`, ne trouve pas `mood.js?v=0.2.2` dans son cache et va donc au réseau : plus de mélange `main.js` neuf + `mood.js` vieux.

### Test de mise à jour

`tests/t-sw-upgrade.cjs` : servir la v0.2.0 depuis un worktree `6c8de4e` (`/tmp/baass-v020`) jusqu’à ce que son SW installe le cache `dossier-baass-3d-v0.2.0` (68 fichiers, `mood.js` sans `?v=`), puis servir la v0.2.2 sur le même origine et recharger.

Résultat local : le menu s’affiche, `__game.version === "0.2.2"`, 0 erreur console, 0 HTTP ≥ 400, cache **uniquement** `dossier-baass-3d-v0.2.2`, modules demandés en `mood.js?v=0.2.2` (idem props, data, main). Le 404 vu en QA sur la mise à jour cassée ne se reproduit pas.

En ligne : une visite neuve de `?v=6b679e3` sert bien la v0.2.2 (`sw.js?v=0.2.2`, cache uniquement `dossier-baass-3d-v0.2.2`, modules en `?v=0.2.2`, menu affiché, 0 erreur, 0 HTTP ≥ 400). Le parcours de mise à jour en ligne (profil déjà sur `?v=df0ef95`) n’a pas pu être rejoué après la publication : GitHub Pages servait déjà la v0.2.2 quelques secondes après le push, donc on ne pouvait plus installer le SW 0.2.1 sur cette origine. Le parcours local (worktree `6c8de4e` → arbre 0.2.2, même origine) couvre le cas réel, y compris l’ancien SW cache-first.

### Tests et budget

`quotes.test.mjs` **PASS**, `t01.js` 412×915 et 915×412 **PASS**, `tests/t-sw-upgrade.cjs` **PASS**.

#### Mesures live (Chrome `--use-gl=angle --use-angle=gl`, llvmpipe, `?v=6b679e3&tier=3`)

Identiques à la v0.2.1 sur toutes les vues de jeu. Menu paysage : 63 / 48 850 (v0.2.1 live 62 / 48 770 — écart d’orbite d’1 appel, déjà vu en QA). Toutes sous 100. 0 transmission. Version servie **0.2.2**. Cache **`dossier-baass-3d-v0.2.2` uniquement**.

| Vue | 412×915 (appels / tris) | 915×412 (appels / tris) | v0.2.1 |
|---|---|---|---|
| Menu (orbite TR-3B) | 49 / 45 144 | 63 / 48 850 | 49 / 45 144 · 62 / 48 770 |
| Ranch | 22 / 29 914 | 38 / 35 056 | identique |
| Hangar | 16 / 14 740 | 23 / 18 688 | identique |
| Entrée du bunker | 35 / 41 578 | 56 / 49 730 | identique |
| Rampe | 43 / 40 258 | 48 / 42 084 | identique |
| Laboratoire (goto lab) | 35 / 34 412 | 42 / 36 096 | identique |
| Site de l’épave | 42 / 41 928 | **69 / 56 924** | identique |
| TR-3B (vol stationnaire) | 36 / 34 376 | 59 / 47 386 | identique |
| Classeurs (cadrage composé) | 28 / 26 032 | 31 / 29 364 | identique |
| Serveurs (cadrage composé) | 36 / 34 612 | 42 / 36 096 | identique |

Bandeau et citations : **inchangés**.

## v0.2.1 — passage visuel (13 nov. 2026)

Polish demandé après la v0.2.0, pour que le jeu ne se lise plus comme un prototype (règle de Pascal). `VERSION` **0.2.1**.

### Laboratoire / bunker

Textures PBR CC0 d’[ambientCG](https://ambientcg.com/), 1024 px, KTX2 (ETC1S couleur/ORM, UASTC normales, mipmaps), UV en mètres, matériaux partagés :

| Fichier | Source | Licence | Usage | Poids (3 cartes) |
|---|---|---|---|---:|
| `assets/tex/concrete-wall-*.ktx2` | [Concrete 034](https://ambientcg.com/a/Concrete034), ambientCG | CC0 1.0 | Murs et plafond | 797 589 o |
| `assets/tex/concrete-floor-*.ktx2` | [Concrete 003](https://ambientcg.com/a/Concrete003) (béton granuleux, taches) | CC0 1.0 | Sol du bunker, dalle du hangar | 1 850 025 o |
| `assets/tex/grate-*.ktx2` | [Metal Walkway 010](https://ambientcg.com/a/MetalWalkway010) | CC0 1.0 | Caillebotis de la rampe (alphaTest, **sans** transmission) | 1 148 340 o |

Éclairage : nappes fluorescentes froides, accents rouges de secours, cadre de porte émissif chaud, cônes factices (masqués au palier ≤ 1), brouillard plus court pour la profondeur, coins plus sombres. Les DEL des baies Spellkaze clignotent (vert / rouge / ambre, 3 InstancedMesh).

### Entrée

Pavillon à l’est du hangar (ouverture à x ≈ 18,5, hangar-main se termine à x ≈ 15, écart d’environ 3,5 m). Panneau « ZONE RESTREINTE » sur le linteau, au-dessus de l’ouverture (il ne la bouche plus). Bandes jaunes au sol et sur les chambranles, cadre lumineux. Collision de caméra : un rayon du personnage vers la caméra s’arrête avant les solides. La porte Kenney est ouverte, décalée au nord, à échelle 0,55. Cadrage par défaut : le joueur est un peu au sud-ouest, regard vers l’entrée.

### Désert, ranch, épave

| Fichier | Source | Licence | Usage | Poids |
|---|---|---|---|---:|
| `assets/tex/sand-*.ktx2` | [Ground 054](https://ambientcg.com/a/Ground054), ambientCG | CC0 1.0 | Sol du ranch, du désert et de l’épave | 1 749 904 o |

Ciel dégradé crépuscule (1 appel, vertex colors, `fog: false`, pas de passage de rendu de plus). Silhouette de montagnes à l’horizon (1 maillage). Rochers et buissons instanciés supplémentaires : **Survival Kit** Kenney, CC0 1.0 (le téléchargement officiel du Nature Kit a renvoyé HTTP 403). Décalque de brûlé sous la soucoupe (texture originale du jeu, cercle radial).

### Menu

Caméra cinématique lente autour du TR-3B au-dessus de la base, au crépuscule, derrière la carte « classifié ». Le TR-3B est plus lisible en paysage qu’en portrait (la carte couvre le centre).

### Collecte

Durée de l’effet portée à **1,2 s** (orbe + particules), avec filet de sécurité `setTimeout`.

### Budget (box, Playwright SwiftShader, `?tier=3`)

Toutes les vues mesurées restent sous **100 appels**. 0 `KHR_materials_transmission`. 0 erreur console, 0 HTTP ≥ 400 (tests locaux et live).

#### Mesures live (Chrome `--use-gl=angle --use-angle=gl`, llvmpipe, `?v=df0ef95&tier=3`)

Version servie : **0.2.1**. Service worker : `sw.js?v=0.2.1`, cache **`dossier-baass-3d-v0.2.1` uniquement**. Palier forcé à 3 (pire cas d’appels). Ces chiffres sont ceux de la box (llvmpipe), **pas** ceux du S20 FE (non mesuré). Vue la plus chargée : site de l’épave en paysage, **69 appels / 56 924 triangles**.

Positions par défaut du hook `__game.goto` / `tr3bSnap('hover')` / menu cinématique :

| Vue | 412×915 (appels / tris) | 915×412 (appels / tris) |
|---|---|---|
| Menu (orbite TR-3B) | 49 / 45 144 | 62 / 48 770 |
| Ranch | 22 / 29 914 | 38 / 35 056 |
| Hangar | 16 / 14 740 | 23 / 18 688 |
| Entrée du bunker | 35 / 41 578 | 56 / 49 730 |
| Rampe | 43 / 40 258 | 48 / 42 084 |
| Laboratoire (goto lab) | 35 / 34 412 | 42 / 36 096 |
| Site de l’épave | 42 / 41 928 | **69 / 56 924** |
| TR-3B (vol stationnaire) | 36 / 34 376 | 59 / 47 386 |
| Classeurs (cadrage composé) | 28 / 26 032 | 31 / 29 364 |
| Serveurs (cadrage composé) | 36 / 34 612 | 42 / 36 096 |

Sur la box, des cadrages composés (Playwright SwiftShader, `?tier=3`, 412×915) avaient donné : menu 45 / 45 278, menu paysage 59 / 52 546, entrée 27–35 selon l’angle, rampe 33–43, laboratoire couloir 31 / 31 360, classeurs 56 / 54 828, serveurs 19 / 20 268, plafond 23 / 24 978, épave 21 / 17 778, TR-3B 24 / 24 004, HUD paysage 41 / 33 216. Toujours sous 100.

Tests : `quotes.test.mjs` **PASS**, `t01.js` 412×915 et 915×412 **PASS** (bunker, audio, palier, collecte 1,2 s, crédits, 0 erreur). Service worker : cache `dossier-baass-3d-v0.2.1`.

### Captures

`/workspace/games3d/dossier-baass-3d-v021-menu.png`, `menu-paysage.png`, `entree-bunker.png`, `entree-bunker-large.png`, `entree-rampe.png`, `lab-interieur.png`, `lab-cabinets.png`, `lab-serveurs.png`, `lab-salle.png`, `lab-plafond.png`, `epave-debris.png`, `epave-cote.png`, `tr3b-lights.png`, `pickup-fx.png`, `hud-paysage.png`.

Les plus parlantes : `menu-paysage` (TR-3B + crépuscule), `epave-cote` et `epave-debris` (sable texturé, montagnes, ciel), `lab-serveurs` (DEL), `lab-plafond` et `lab-interieur` (béton PBR, néons), `pickup-fx` (orbe et particules, 1 / 8).

### Limites honnêtes

- L’entrée reste serrée contre le hangar (environ 3,5 m) : on ne peut pas reculer beaucoup sans entrer dans le hangar. Le cadrage d’ensemble (crépuscule, montagnes, cadre lumineux, panneau « ZONE RESTREINTE » sur le linteau, bandes au sol) se lit clairement. La collision évite que la caméra du joueur soit *dans* un mur ; elle peut encore se coller tout près.
- Le laboratoire a du béton et des lumières, mais les salles Kenney restent des volumes assez « kit ».
- Nature Kit Kenney : pas intégré (HTTP 403 sur le lien officiel). Rochers et arbustes = Survival Kit déjà présent.
- Palier et cadence réels du **S20 FE** : non mesurés. iOS, PWA, hors ligne sur téléphone : non testés. La box est llvmpipe / SwiftShader.
- Testeur QA n’a pas encore tourné sur la v0.2.1.

Bandeau et citations : **inchangés**.

## v0.2.0 — bunker, accessoires Sketchfab, son et ambiance (13 nov. 2026)

Amélioration demandée par Pascal (« améliore ce jeu »), à partir de la v0.1.1 (`e22f0b1`).

### Laboratoire souterrain

Le laboratoire n’est plus posé sur le désert. Un kiosque et une rampe mènent sous terre (niveau du sol du labo : −6,5 m). Le bunker a une coque de béton, un plafond, des tuyaux, des néons et des feux de secours. Les salles Kenney Space Kit sont teintées béton (gris). Le trou de la rampe est découpé dans le sol du désert, pour ne pas voir le ciel en regardant vers le haut depuis le labo.

### Accessoires Sketchfab (CC BY 4.0)

Les chemises, classeurs, armoires, instruments et baies de serveurs faits maison sont remplacés par des modèles Sketchfab, optimisés (`gltf-transform` : PNG, redimensionnés 1024 px max ou 512 px pour les petits props, ETC1S couleur/ORM/émissif, UASTC normales ; puis `gltfpack -c -kn -km`). Copies aussi dans `/workspace/assets3d/dossier-baass-3d/glb/`. Le verre de l’armoire de labo est en alpha simple (BLEND, 0,28), **sans** `KHR_materials_transmission`. Chemises et classeurs répétés en `InstancedMesh` quand c’est possible ; les baies et instruments sont posés pièce par pièce, pieds au sol.

| Fichier | Titre | Auteur | Licence | URL | Poids |
|---|---|---|---|---|---:|
| `assets/props-folder-v1.glb` | (Free) Low Poly Document File Folder | PolyDavid | CC BY 4.0 | https://sketchfab.com/3d-models/free-low-poly-document-file-folder-eb55498ef9bc4358891816a9922d93a8 | 5 676 o |
| `assets/props-folder-manilla-v1.glb` | (Free) Low Poly Document File Folder — Manilla | PolyDavid | CC BY 4.0 | https://sketchfab.com/3d-models/free-low-poly-document-file-folder-manilla-ba725589a1074659a7007e596ccf40da | 5 240 o |
| `assets/props-paperclip-v1.glb` | Paper Clip Box | PolyDavid | CC BY 4.0 | https://sketchfab.com/3d-models/paper-clip-box-0bc35b02979146179ad2733bc9303291 | 31 336 o |
| `assets/props-cabinet-rusty-v1.glb` | Rusty Filing Cabinet | Amiel Goco | CC BY 4.0 | https://sketchfab.com/3d-models/rusty-filing-cabinet-619484b78fbe449ea5c0cdb68e8f2bd6 | 2 282 864 o |
| `assets/props-lab-cabinet-v1.glb` | Laboratory Cabinet Storage \| PBR Low poly \| FREE | Naked Singularity Studio | CC BY 4.0 | https://sketchfab.com/3d-models/laboratory-cabinet-storage-pbr-low-poly-free-6c5d3bde09dd4f55ad973d8429441190 | 340 524 o |
| `assets/props-lab-things-v1.glb` | Lab Things | Renafox | CC BY 4.0 | https://sketchfab.com/3d-models/lab-things-6ed351eea02e4aefb6c3aad80a763890 | 690 888 o |
| `assets/props-server-rack-v1.glb` | Server Rack | Spellkaze | CC BY 4.0 | https://sketchfab.com/3d-models/server-rack-62f6779cb7e448b19aaf58544c3c7218 | 1 303 796 o |

Mêmes crédits à l’écran **Crédits** du jeu.

### Débris

Au site de l’épave, les tas de débris sont plus petits et plus dispersés (échelles 0,8 à 1,65), plus réalistes par rapport à la soucoupe (~13 × 8 m).

### Son

Web Audio, déverrouillé au premier toucher. Le déverrouillage relance aussi les boucles déjà demandées (ambiance de zone et bourdonnement du TR-3B). Bouton muet et touche **M**, choix mémorisé (`baass.dossier3d.settings.v1`). Neuf fichiers, **894 761 o** au total :

| Fichier | Usage | Source | Licence | Poids |
|---|---|---|---|---:|
| `assets/sfx/ui_click.ogg` | Clics d’interface | `click_001`, [Interface Sounds](https://kenney.nl/assets/interface-sounds) de Kenney | CC0 1.0 | 4 876 o |
| `assets/sfx/ui_open.ogg` | Ouverture de fiche | `open_002`, même pack | CC0 1.0 | 14 975 o |
| `assets/sfx/pickup.ogg` | Collecte d’une preuve | `confirmation_002`, même pack | CC0 1.0 | 14 169 o |
| `assets/sfx/tr3b_hum.ogg` | Bourdonnement du TR-3B | `spaceEngineLow_003`, [Sci-Fi Sounds](https://kenney.nl/assets/sci-fi-sounds) de Kenney | CC0 1.0 | 85 760 o |
| `assets/sfx/door.ogg` | Porte / entrée du bunker | `doorOpen_001`, même pack Sci-Fi | CC0 1.0 | 21 442 o |
| `assets/sfx/bunker_blip.ogg` | Signal à l’entrée du bunker | `forceField_002`, même pack Sci-Fi | CC0 1.0 | 27 647 o |
| `assets/sfx/amb_desert.mp3` | Ambiance ranch et épave | MusicGen (`facebook/musicgen-small`, local, CPU), invite « desert wind » | Création originale du jeu | 241 964 o |
| `assets/sfx/amb_hangar.mp3` | Ambiance hangar | MusicGen, invite « hangar hum » | Création originale du jeu | 241 964 o |
| `assets/sfx/amb_bunker.mp3` | Ambiance bunker | MusicGen, invite « bunker drone » | Création originale du jeu | 241 964 o |

### Ambiance, animations, interface

- Éclairage par lieu (brouillard, hémisphère, accents émissifs, cônes factices pour les néons — masqués au palier ≤ 1). Aucune ombre par défaut (les ombres sont un passage de rendu de plus ; seulement derrière `?fx=` et hors palier bas).
- Lumières du TR-3B : émissif et intensité des points qui pulsent, léger mouvement de stationnaire.
- Collecte : éclair et particules, orbe qui file vers le compteur du haut, puis ouverture de la fiche. Respecte `prefers-reduced-motion`.
- Transitions : fondu CSS (`#fade`), pas de passage de rendu supplémentaire.
- Interface « dossier classifié » : tampon, puces mono, cibles 44 px, `safe-area`, `dvh`. Le compteur de preuves ne passe plus à la ligne en portrait. La grille du menu en paysage de la v0.1.1 est **conservée**.

### detect-gpu

Comme c204-2026 : detect-gpu **5.0.70** auto-hébergé (`./vendor/detect-gpu.esm.js`, `./detect-gpu-benchmarks/`, `benchmarksURL` relatif). Secours silencieux, `Promise.race` 4 s, `?tier=` pour forcer. Palier ≤ 1 → `pixelRatio` 1 et effets coûteux coupés (cônes, fill, env). `?fps=1` affiche le palier et le nom de la puce.

### Budget et mesures live (Chrome `--use-gl=angle --use-angle=gl`, llvmpipe, `?v=6c8de4e&tier=3`)

Toutes les vues restent sous **100 appels**. Vue la plus chargée : site de l’épave en paysage, **66 appels / 59 092 triangles**. Ces chiffres sont ceux de la box (llvmpipe), **pas** ceux du S20 FE (non mesuré). Palier forcé à 3 pour le pire cas d’appels (qualité haute). 0 erreur console, 0 HTTP ≥ 400. Version servie : **0.2.0**. Service worker : `sw.js?v=0.2.0`, cache **`dossier-baass-3d-v0.2.0` uniquement** (68 entrées).

Positions par défaut du hook `__game.goto` / `tr3bSnap('hover')` :

| Vue | 412×915 (appels / tris) | 915×412 (appels / tris) |
|---|---|---|
| Menu | 28 / 29 194 | 35 / 33 012 |
| Ranch | 17 / 23 362 | 33 / 28 504 |
| Hangar | 15 / 8 440 | 22 / 13 088 |
| Entrée du bunker | 25 / 15 192 | 33 / 22 318 |
| Laboratoire (goto lab) | 12 / 7 464 | 18 / 19 486 |
| Site de l’épave | 40 / 35 464 | **66 / 59 092** |
| TR-3B (vol stationnaire, max sur 10 cadres) | 16 / 10 728 | 24 / 15 754 |

Sur la box, des cadrages composés (caméra placée pour voir les pièces, Playwright SwiftShader, `?tier=3`) ont donné, en portrait 412×915 : laboratoire couloir 35 / 33 558, classeurs 17 / 19 980, serveurs 14 / 16 276, salle 22 / 20 456, plafond 20 / 21 202, entrée 30 / 23 994, rampe 35 / 36 844, épave (autre angle) 20 / 11 316, TR-3B lumières 28 / 22 532. Toujours sous 100.

0 `KHR_materials_transmission`. Précache : `mood.js`, `props.js`, 9 sons, 7 props Sketchfab, Basis, detect-gpu.

### Tests

- `tests/quotes.test.mjs` : 8 preuves vérifiées, **PASS**.
- `tests/t01.js` (412×915 et 915×412) : bunker sous terre (`y < −1`, `indoors`), entrée en surface, déverrouillage audio, muet + M + mémoire, palier GPU, collecte avec effet, crédits Sketchfab CC BY 4.0 (PolyDavid, Amiel Goco, Naked Singularity Studio, Renafox, Spellkaze), 0 erreur console, 0 HTTP ≥ 400. **PASS**.

### Captures

- `/workspace/games3d/dossier-baass-3d-v020-menu.png`
- `/workspace/games3d/dossier-baass-3d-v020-menu-paysage.png`
- `/workspace/games3d/dossier-baass-3d-v020-entree-bunker.png`
- `/workspace/games3d/dossier-baass-3d-v020-entree-bunker-large.png`
- `/workspace/games3d/dossier-baass-3d-v020-entree-rampe.png`
- `/workspace/games3d/dossier-baass-3d-v020-lab-interieur.png`
- `/workspace/games3d/dossier-baass-3d-v020-lab-cabinets.png`
- `/workspace/games3d/dossier-baass-3d-v020-lab-serveurs.png`
- `/workspace/games3d/dossier-baass-3d-v020-lab-salle.png`
- `/workspace/games3d/dossier-baass-3d-v020-lab-plafond.png`
- `/workspace/games3d/dossier-baass-3d-v020-epave-debris.png`
- `/workspace/games3d/dossier-baass-3d-v020-epave-cote.png`
- `/workspace/games3d/dossier-baass-3d-v020-tr3b-lights.png`
- `/workspace/games3d/dossier-baass-3d-v020-pickup-fx.png`
- `/workspace/games3d/dossier-baass-3d-v020-hud-paysage.png`

### Limites honnêtes

- Le laboratoire est plus sombre et plus « kit » que le désert : les salles Kenney restent lisibles en béton, les baies Spellkaze et les instruments Renafox se voient clairement, mais l’entrée de la rampe peut encore être un peu serrée contre le hangar.
- L’effet de collecte est court (~0,6 s) : une capture peut le rater.
- Cadence réelle et palier GPU du **S20 FE** : non mesurés. iOS, installation PWA et jeu hors ligne sur téléphone : non testés. La box n’a pas de vraie puce graphique (souvent palier 1, FALLBACK / SwiftShader ou llvmpipe).
- Le TR-3B et l’épave restent tels quels (pas de retouches visuelles demandées au-delà des débris plus petits et d’un éclairage un peu relevé).

Bandeau, mentions et citations : **inchangés** (« plan de recherche, pas une preuve ; histoire fictive »).

## v0.1.1 — menu en paysage (12 nov. 2026, soir)

Correction du bug QA (priorité basse) : à 915×412, le panneau du menu mesurait 364 px de haut, le bouton **Commandes** était collé au bord inférieur et **Crédits** était sous le pli (`top` 420 > 412). Il fallait défiler pour voir les trois boutons.

En paysage court (`orientation: landscape` et `max-height: 500px`, donc aussi 844×390) :

- le menu devient une grille : texte à gauche, les trois boutons à droite (cible 44 px conservée) ;
- padding et polices un peu plus compacts, `dvh` et `safe-area` ;
- tout le panneau tient sans défilement (195 px de haut à 915×412, boutons entièrement visibles, `Crédits.bottom` 280 < 412) ;
- le portrait 412×915 est **inchangé** (colonne unique, 472 px).

`VERSION` unique dans `data.js` : **0.1.1** (enregistrement `sw.js?v=0.1.1`, `updateViaCache: 'none'`). Test de régression `menu.buttonsVisible` dans `tests/t01.js`.

Captures :

- `/workspace/games3d/dossier-baass-3d-v011-menu-paysage.png` — 915×412
- `/workspace/games3d/dossier-baass-3d-v011-menu.png` — 412×915

Appels et triangles du **menu** : inchangés par rapport à la v0.1.0 (mesure Playwright, SwiftShader) — 412×915 : **31 / 23 298** ; 915×412 : **35 / 32 284**. Live (`?v=e22f0b1`, Chrome angle-gl, llvmpipe) : 412×915 **29 / 22 454** (v0.1.0 live était 30 / 22 762 — écart d’orbite de la caméra, 1 appel) ; 915×412 **35 / 32 284**. 0 erreur console, 0 HTTP 4xx. Version servie : 0.1.1.

## Contrôles

- **Tactile** : joystick virtuel à gauche, glisser pour regarder, bouton **Collecter** près d’une preuve (cible 44 px). Plein écran (⛶), muet.
- **Clavier** : WASD, ZQSD ou flèches pour se déplacer, souris (glisser) pour regarder, **E** ou Entrée pour collecter, **M** pour couper le son, Échap pour fermer un panneau.
- **Manette** : stick gauche (déplacement), stick droit (regard), bouton A (collecter).
- Son Web Audio (Kenney CC0 et ambiances MusicGen), déverrouillé au premier toucher. Le déverrouillage relance les boucles déjà demandées.

Vue à la troisième personne. En laboratoire, la caméra se rapproche.

## Boucle de jeu

Environ 5 à 8 minutes.

1. Explorer le **ranch** (grange, hangar de bois, camion, clôtures) et le **hangar** industriel.
2. Entrer dans le **bunker souterrain** (rampe à l’est du hangar) et explorer les couloirs du laboratoire.
3. S’approcher des dossiers dorés et les **collecter** : une fiche s’ouvre avec la citation réelle, la page PDF et le folio.
4. Après quelques preuves, un **TR-3B** survole le hangar, reste en vol stationnaire, puis repart.
5. Visiter le **site d’épave** (soucoupe, débris, papiers) — scène fictive, liée aux citations Roswell de la page 45.
6. Les huit preuves + le survol + l’épave ouvrent l’écran de fin (score, temps, meilleur score en `localStorage`). Rejouer.

## Preuves (huit extraits vérifiés)

Chaque citation a été revérifiée, lettre pour lettre (graphies OCR conservées : « foll », « lR », « {12) »), contre `pages-extracted.txt` du document source, à la page indiquée. Tests : `tests/quotes.test.mjs`.

| Id | Zone | Page PDF | Folio | Sujet |
|---|---|---:|---|---|
| `area-other` | ranch (hangar de bois) | 7 | 1 | Contrat HHM402-08-C-0072 |
| `proj-engagement` | ranch | 8 | 2 | Engagement du projet |
| `area-materials` | hangar | 19 | 13 | « Until actual materials are obtained… » |
| `area-control` | hangar | 11 | 5 | Opérateurs d’engins (question, pas une réponse) |
| `area-lift` | laboratoire | 7 | 1 | Liste des douze domaines (OCR conservé) |
| `area-spatial` | laboratoire | 16 | 10 | « highly theoretical » |
| `roswell-pio` | épave | 45 | Annexe 2, p. 10 | Communiqué du PIO, Roswell AAB, juillet 1947 |
| `roswell-debris` | épave | 45 | Annexe 2, p. 10 | « paper thin yet extremely strong » |

Les deux citations Roswell 1947 **sont** dans la source ; le site d’épave du jeu est une scène fictive explicitement présentée comme telle sur la fiche.

## TR-3B (v0.1.0, modèle final)

Fichier : `assets/tr3b-v1.glb` (67 456 o), copie de `/workspace/assets3d/dossier-baass-3d/glb/tr3b.glb`. Statique, aucun clip.

- Nœuds : `tr3b` (racine) → `tr3b_body`, `tr3b_lights`, vides `tr3b_light1` (pointe, avant +Z), `tr3b_light2` (arrière −X), `tr3b_light3` (arrière +X). Le maillage est sur un enfant non nommé sous chaque nœud nommé.
- 2 666 triangles, 2 appels, 2 matériaux, gpuSize 556,51 Ko. Dimensions **30,000 × 3,197 × 26,482 m** (X × Y haut × Z). Origine au centre du dessous (Y = 0) : le vol stationnaire est un décalage en Y (ici y ≈ 22 m au-dessus du hangar). Avant +Z.
- Extensions : `KHR_mesh_quantization`, `EXT_meshopt_compression`, `KHR_texture_basisu`, `KHR_texture_transform`, `KHR_materials_unlit`. Chargeur : MeshoptDecoder + KTX2Loader, transcodeur Basis local (`./vendor/basis/`), pas de CDN.
- Lumières ponctuelles accrochées aux trois vides, pour un lueur orangée sous l’engin (en plus de l’émissif unlit du modèle).
- **Crédit :** [TR-3B by Dylusion, CC BY-NC 4.0, Sketchfab](https://sketchfab.com/3d-models/50d8e1fdffad4f8a9064e657bda9c248). Le jeu reste **gratuit, sans publicité**, usage non commercial (condition de la licence NC). Même crédit à l’écran Crédits.

Montage de référence : `/workspace/assets3d/dossier-baass-3d/rendus/tr3b_vs_references.jpg`. Vérification Rendu : `tr3b_verify.png`.

## Ressources (source et licence)

Les kits ont été téléchargés uniquement depuis les pages officielles HTTPS. Licence vérifiée sur chaque page source.

| Fichier / usage | Source | Licence |
|---|---|---|
| Hangars, réservoirs, cheminées, conteneurs, château d’eau (`building-*`, `tank`, `chimney`, `water-tower`, `container-*`) | [Kenney City Kit Industrial 2.0](https://kenney.nl/assets/city-kit-industrial) | CC0 1.0 |
| Salles et couloirs du laboratoire (`room-*`, `corridor-*`, `gate-door`) | [Kenney Modular Space Kit 1.0](https://kenney.nl/assets/modular-space-kit) | CC0 1.0 |
| Caisses, machines, écrans (`box-*`, `machine*`, `screen-panel`) | [Kenney Factory Kit 3.0](https://kenney.nl/assets/factory-kit) | CC0 1.0 |
| Arbres, rochers, barils | [Kenney Survival Kit 2.0](https://kenney.nl/assets/survival-kit) | CC0 1.0 |
| Grange et hangar de bois (`barn`, `shed`) | [Quaternius Farm Buildings](https://quaternius.com/packs/farmbuildings.html) (aussi Poly Pizza) | CC0 1.0 |
| Camion (`truck`) | [Quaternius, Poly Pizza](https://poly.pizza/m/cXw6oiFtZ8) | CC0 1.0 |
| Clôtures bois et métal | [Quaternius](https://poly.pizza/m/e02PFKKhbr) | CC0 1.0 |
| Débris et papiers | [Quaternius](https://poly.pizza/m/WrIiMMxyEP) | CC0 1.0 |
| Enquêteur (`man-v1.glb`, animations Idle / Walk / Run / Standing, maillages fusionnés) | [Quaternius Ultimate Modular Men](https://quaternius.com/packs/ultimatemodularcharacters.html) | CC0 1.0 |
| Soucoupe de l’épave (`ufo-v1.glb`) | [hat_my_guy, Poly Pizza](https://poly.pizza/m/NgURFR5T9m) | CC0 1.0 (Public Domain) |
| `assets/tr3b-v1.glb` (67 456 o, 2 666 tris, 2 appels) | [TR-3B by Dylusion, Sketchfab](https://sketchfab.com/3d-models/50d8e1fdffad4f8a9064e657bda9c248), livré par Rendu | **CC BY-NC 4.0** — jeu gratuit, sans pub |
| Chemises, classeurs, armoires, instruments, baies (`props-*-v1.glb`) | Sketchfab, voir le tableau de la v0.2.0 (PolyDavid, Amiel Goco, Naked Singularity Studio, Renafox, Spellkaze) | **CC BY 4.0** |
| Textures PBR bunker et désert (`assets/tex/*`) | [ambientCG](https://ambientcg.com/) : Concrete 034, Concrete 003, Ground 054, Metal Walkway 010 | **CC0 1.0** |
| Sons d’interface, collecte, porte, TR-3B | [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds) et [Sci-Fi Sounds](https://kenney.nl/assets/sci-fi-sounds) | CC0 1.0 |
| Ambiances ranch, hangar, bunker (`amb_*.mp3`) | MusicGen local (`facebook/musicgen-small`) | Création originale du jeu |
| Three.js r170, detect-gpu 5.0.70, meshopt, KTX2 / Basis | importmap jsDelivr pour three ; transcodeurs **locaux** (`./vendor/basis/`, meshopt) | MIT / Apache-2.0 |

### Non utilisés (et pourquoi)

- **Kenney Nature Kit 2.1** (CC0, licence vérifiée sur [kenney.nl/assets/nature-kit](https://kenney.nl/assets/nature-kit)) : `gltfpack` a rejeté deux GLB (« invalid GLTF »). Les arbres et rochers viennent du Survival Kit. Mentionné à l’écran Crédits avec la mention « non retenu ».
- (v0.1.1) Les modèles Sketchfab n’avaient pas pu être téléchargés (HTTP 401). En v0.2.0 ils sont intégrés : voir le tableau ci-dessus.

Les GLB des kits sont traités avec `gltf-transform` (textures embarquées, ETC1S / KTX2) puis `gltfpack -kn -km` (et `-ac` pour le personnage animé). Noms de fichiers versionnés (`*-v1.glb`). Les props répétés (clôtures, arbres, rochers, conteneurs, caisses) sont des `InstancedMesh`. Les maillages statiques de même matériau sont fusionnés. Les attributs quantifiés (`KHR_mesh_quantization`) sont décodés en Float32 avant instancing et fusion — sinon les positions brutes restent à l’échelle kilométrique.

## Technique

- Three.js r170 en modules ES, importmap, **pas d’étape de compilation**.
- Une seule constante `VERSION` dans `data.js` (**0.2.0**). Service worker manuel : enregistrement `./sw.js?v=` + VERSION, `updateViaCache: 'none'`, `skipWaiting` + `clients.claim`, anciens caches supprimés. HTML, `data.js` et les JS non versionnés en réseau d’abord ; `main.js?v=` et assets en cache d’abord. Précache : TR-3B, 7 props Sketchfab, 9 sons, `mood.js`, `props.js`, Basis, detect-gpu.
- detect-gpu 5.0.70, comme c204-2026 : `./vendor/detect-gpu.esm.js`, benchmarks auto-hébergés (`./detect-gpu-benchmarks`, `benchmarksURL` relatif). Palier ≤ 1 → `pixelRatio` 1 et effets coûteux coupés. `?tier=` pour forcer. Secours silencieux, 4 s.
- `?fps=1` : compteur fps, appels, triangles, palier et nom de la puce. `?fx=` éteint par défaut (aucun passage de rendu supplémentaire ; ombres seulement derrière `?fx=`).
- Hook de test `window.__game` (zones, preuves, `tr3bSnap`, caméra, crédits).
- Pas de transmission, pas de second passage, ombres désactivées. Quelques lumières dynamiques (laboratoire, underside du TR-3B).
- PWA : `manifest.webmanifest`, `.nojekyll`.

## Mesures

Outil local des captures : Playwright (Chromium, SwiftShader) à 412×915, et 915×412 pour le paysage. **Les fps de la box ne sont pas les fps d’un Samsung S20 FE.** 0 erreur console, 0 HTTP 4xx, 0 transmission, tous les appels sous 100 (objectif 15–40 pour une vue typique).

Live vérifié le 12 novembre 2026, 22:29 (heure de Toronto) : `https://passcool17.github.io/dossier-baass-3d/?v=35f28a3` charge v0.1.0, TR-3B `loaded: true`, `placeholder: false`, taille 30,000 × 3,197 × 26,482 m. 0 erreur console, 0 HTTP 4xx.

`/home/box/opt/perf3d/measure.mjs` est couplé à `__c204` (jeu Titor) : la mesure live ci-dessous utilise le même Chrome (`/usr/bin/google-chrome`) et les mêmes drapeaux `--use-gl=angle --use-angle=gl`, à 412×915, sur `__game`. Le rendu GL de la box est **ANGLE / Mesa llvmpipe** — **pas les fps d’un S20 FE**.

| Vue | Appels | Triangles | fps box | Notes |
|---|---:|---:|---:|---|
| Menu (live, angle-gl) | 30 | 22 762 | ~50 | Caméra d’orbite au ranch |
| Ranch, caméra de jeu (live) | 25 | 23 510 | ~60 | Départ troisième personne |
| Hangar, caméra de jeu (live) | 17 | 8 458 | ~30 | Point `__game.goto('hangar')` |
| Laboratoire, caméra de jeu (live) | 8 | 7 644 | ~38 | |
| Épave, caméra de jeu (live) | 41 | 31 096 | ~60 | |
| **Survol TR-3B, vol stationnaire (live)** | **38** | **22 726** | ~29 | Même cadrage que la capture (triangle + 3 lumières) |

Captures cinématiques locales (Playwright, SwiftShader, 412×915 sauf paysage). Tous les appels < 100.

| Vue | Appels | Triangles | Notes |
|---|---:|---:|---|
| Ranch (grange, vue 3/4) | 17 | 23 352 | Capture principale |
| Hangar (château d’eau, 3/4) | 29 | 28 300 | |
| Hangar (vue d’ensemble) | 46 | 20 728 | Toits + ranch + épave |
| Laboratoire (vue haute) | 25 | 23 218 | Couloirs Kenney Space |
| Laboratoire (œil) | 23 | 26 638 | |
| Site d’épave | 21 | 7 372 | Soucoupe, débris, papiers |
| **Survol TR-3B (vol stationnaire)** | **38** | **22 726** | Identique à la mesure live |
| Paysage 915×412 (site complet) | 87 | 59 972 | Vue large, toujours sous 100 |

Captures 412×915 (sauf paysage) :

- `/workspace/games3d/dossier-baass-3d-v010.png` — ranch
- `/workspace/games3d/dossier-baass-3d-v010-hangar.png` — hangar
- `/workspace/games3d/dossier-baass-3d-v010-tr3b.png` — TR-3B en vol stationnaire
- `/workspace/games3d/dossier-baass-3d-v010-epave.png` — site d’épave
- `/workspace/games3d/dossier-baass-3d-v010-preuve.png` — fiche « paper thin yet extremely strong », page 45
- `/workspace/games3d/dossier-baass-3d-v010-paysage.png` — site complet, 915×412

## Tests

- `tests/quotes.test.mjs` — les huit citations sur les pages indiquées, y compris Roswell 1947.
- `tests/t01.js` — Playwright 412×915 et 915×412 : chargement, 0 erreur console, 0 HTTP 4xx, les trois boutons du menu visibles sans défilement (`menu.buttonsVisible`, aussi en paysage), chaque zone, collecte via `__game`, événement TR-3B, écran de fin + rejouer, crédits (Kenney, Quaternius, hat_my_guy, Dylusion, CC0, CC BY-NC), appels < 100. **PASS** en v0.1.1.

## Limites honnêtes (v0.1.0)

- Fps réels **S20 FE**, Safari, et PWA hors-ligne sur appareil : **non testés**. Les fps box (SwiftShader) ne s’y substituent pas.
- Téléchargement Sketchfab CC BY impossible sans compte (401) : chemises, Lab Things et classeur remplacés par des originaux simples.
- Nature Kit Kenney non retenu (`gltfpack`).
- Le laboratoire est un ensemble de modules Space Kit posés au sol, ouvert sur le désert (pas un bunker enterré).
- Les modèles Kenney Industrial sont à l’échelle « jouet » (~2 m) : le jeu les agrandit ×8 (~16 m) pour des hangars lisibles.
- FPS et appels ci-dessus = box / SwiftShader, pas un téléphone.

## Suite possible

- Mesure live `measure.mjs --gl angle-gl` sur chaque zone, et une passe fps réelle sur S20 FE (`?fps=1`).
- Safari / iOS, PWA hors-ligne.
- Si un compte Sketchfab est autorisé : remplacer chemise et classeur par les modèles CC BY prévus, crédits à jour.
- Rétablir le Nature Kit si les GLB passent `gltfpack`.
- Affiner l’échelle des débris d’épave et la lecture intérieure du laboratoire au niveau des yeux.

