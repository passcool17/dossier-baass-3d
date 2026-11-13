# Dossier BAASS · 3D — v0.1.0

- Lien jouable : https://passcool17.github.io/dossier-baass-3d/
- Dépôt : https://github.com/passcool17/dossier-baass-3d
- État : v0.1.0 — première version jouable. Enquêteur fictif sur un site secret (ranch, hangar, laboratoire, site d’épave). Huit preuves, chacune un extrait réel du *BAASS Project Management Plan* (2 décembre 2008, DOW-UAP-D168). Survol du TR-3B (modèle de Dylusion) au-dessus du hangar, épave d’une soucoupe liée aux citations Roswell 1947 réellement présentes dans la source (page PDF 45). Interface en français.

Bandeau permanent : **plan de recherche, pas une preuve ; histoire fictive**.

Ceci est un **jeu**. Le document source est un plan de gestion de recherche, pas une preuve de physique nouvelle ni d’engin extraterrestre. L’histoire et le site sont une fiction. Les citations, elles, sont des extraits mot pour mot, vérifiés page par page.

## Contrôles

- **Tactile** : joystick virtuel à gauche, glisser pour regarder, bouton **Collecter** près d’une preuve (cible 44 px). Plein écran (⛶), muet.
- **Clavier** : WASD, ZQSD ou flèches pour se déplacer, souris (glisser) pour regarder, **E** ou Entrée pour collecter, Échap pour fermer un panneau.
- **Manette** : stick gauche (déplacement), stick droit (regard), bouton A (collecter).
- Son de synthèse Web Audio, déverrouillé au premier toucher.

Vue à la troisième personne. En laboratoire, la caméra se rapproche.

## Boucle de jeu

Environ 5 à 8 minutes.

1. Explorer le **ranch** (grange, hangar de bois, camion, clôtures) et le **hangar** industriel.
2. Entrer dans les **couloirs du laboratoire**.
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
| Chemise et classeur | Originaux Arcade 3D (PassCool_17) | Fournis avec le jeu |
| Three.js r170, detect-gpu 5.0.70, meshopt, KTX2 / Basis | importmap jsDelivr pour three ; transcodeurs **locaux** (`./vendor/basis/`, meshopt) | MIT / Apache-2.0 |

### Non utilisés (et pourquoi)

- **Kenney Nature Kit 2.1** (CC0, licence vérifiée sur [kenney.nl/assets/nature-kit](https://kenney.nl/assets/nature-kit)) : `gltfpack` a rejeté deux GLB (« invalid GLTF »). Les arbres et rochers viennent du Survival Kit. Mentionné à l’écran Crédits avec la mention « non retenu ».
- **Chemises PolyDavid, Lab Things (Renafox), Rusty Filing Cabinet (Amiel Goco)** — CC BY, licences confirmées via l’API Sketchfab, mais le téléchargement exige un compte (HTTP 401). Remplacés par des modèles originaux simples, documentés à l’écran Crédits.

Les GLB des kits sont traités avec `gltf-transform` (textures embarquées, ETC1S / KTX2) puis `gltfpack -kn -km` (et `-ac` pour le personnage animé). Noms de fichiers versionnés (`*-v1.glb`). Les props répétés (clôtures, arbres, rochers, conteneurs, caisses) sont des `InstancedMesh`. Les maillages statiques de même matériau sont fusionnés. Les attributs quantifiés (`KHR_mesh_quantization`) sont décodés en Float32 avant instancing et fusion — sinon les positions brutes restent à l’échelle kilométrique.

## Technique

- Three.js r170 en modules ES, importmap, **pas d’étape de compilation**.
- Une seule constante `VERSION` dans `data.js` (0.1.0). Service worker manuel : enregistrement `./sw.js?v=` + VERSION, `updateViaCache: 'none'`, `skipWaiting` + `clients.claim`, anciens caches supprimés. HTML et `data.js` en réseau d’abord ; assets, vendor et CDN en cache d’abord. Le TR-3B (`assets/tr3b-v1.glb`) est dans le précache.
- detect-gpu 5.0.70, benchmarks auto-hébergés (`./detect-gpu-benchmarks`). Palier ≤ 1 → `pixelRatio` 1. Plafond 2.
- `?fps=1` : compteur fps, appels, triangles, palier. `?fx=` éteint par défaut (aucun effet optionnel en v0.1.0).
- Hook de test `window.__game` (zones, preuves, `tr3bSnap`, caméra, crédits).
- Pas de transmission, pas de second passage, ombres désactivées. Quelques lumières dynamiques (laboratoire, underside du TR-3B).
- PWA : `manifest.webmanifest`, `.nojekyll`.

## Mesures

Outil local des captures : Playwright (Chromium, SwiftShader) à 412×915, et 915×412 pour le paysage. **Les fps de la box ne sont pas les fps d’un Samsung S20 FE.** 0 erreur console, 0 HTTP 4xx, 0 transmission, tous les appels sous 100 (objectif 15–40 pour une vue typique).

Mesure live prévue : `node /home/box/opt/perf3d/measure.mjs '<url>' --gl angle-gl` après déploiement Pages.

| Vue | Appels | Triangles | Notes |
|---|---:|---:|---|
| Ranch (grange, vue 3/4) | 17 | 23 352 | Capture principale, 412×915 |
| Hangar (château d’eau, 3/4) | 29 | 28 300 | 412×915 |
| Hangar (vue d’ensemble) | 46 | 20 728 | Toits + ranch + épave |
| Laboratoire (vue haute) | 25 | 23 218 | Couloirs Kenney Space |
| Laboratoire (œil) | 23 | 26 638 | |
| Site d’épave | 21 | 7 372 | Soucoupe, débris, papiers |
| **Survol TR-3B (vol stationnaire)** | **38** | **22 726** | Triangle entier, 3 lumières underside, au-dessus du hangar |
| Paysage 915×412 (site complet) | 87 | 59 972 | Sous 100 ; vue large qui englobe tout le site |

Captures 412×915 (sauf paysage) :

- `/workspace/games3d/dossier-baass-3d-v010.png` — ranch
- `/workspace/games3d/dossier-baass-3d-v010-hangar.png` — hangar
- `/workspace/games3d/dossier-baass-3d-v010-tr3b.png` — TR-3B en vol stationnaire
- `/workspace/games3d/dossier-baass-3d-v010-epave.png` — site d’épave
- `/workspace/games3d/dossier-baass-3d-v010-preuve.png` — fiche « paper thin yet extremely strong », page 45
- `/workspace/games3d/dossier-baass-3d-v010-paysage.png` — site complet, 915×412

## Tests

- `tests/quotes.test.mjs` — les huit citations sur les pages indiquées, y compris Roswell 1947.
- `tests/t01.js` — Playwright 412×915 et 915×412 : chargement, 0 erreur console, 0 HTTP 4xx, chaque zone, collecte via `__game`, événement TR-3B, écran de fin + rejouer, crédits (Kenney, Quaternius, hat_my_guy, Dylusion, CC0, CC BY-NC), appels < 100.

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

