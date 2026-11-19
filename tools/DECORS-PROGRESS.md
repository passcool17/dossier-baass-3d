# Décors + cadrage — progression (Grok Bot, 18 nov 2026, heure de Toronto)

## Fait (préparé et testé sur la box, copie du jeu)
- Cadrage : main.js cameraRig() — sur la rampe, visée adaptative (chapeau ≤ 80 % du demi-champ, plongée ≥ 40°) + champ +12° sur la rampe. Mesuré headless 412×915 et 915×412 : chapeau NDC max avant 1,05 / 1,21 (coupé) → après 0,75 / 0,76. Autres zones inchangées (≤ 0,66). t-joystick PASS (254/254), t01 PASS.
- Kit décor Blender (tools/decor_kit.py, RTX 2070 OptiX) : 20 objets low-poly, couleurs de sommets, 1 matériau, 3 302 tris, assets/decor-v1.glb (meshopt, ~126 Ko).
- mood.js buildDecor() : dispersion fixe (graine) par zone, refus près des indices / points de départ / rampe / collisions ; fusion → +1 appel de dessin.
- props.js : entrée `decor`. sw.js : decor-v1.glb en précache. Version 0.3.3 (index.html ?v=, data.js).
## En cours
- t-evidence sur la box (0 échec jusqu'ici).
- Copie des fichiers vers le PC, puis vérif git diff.

## 20:58
- Kit reconstruit (sauge allégée), installation en cours.
- 21:00 — TERMINÉ. Installé sur le PC : main.js (cadrage rampe + branchement décor), mood.js (buildDecor), props.js, sw.js (précache decor-v1.glb), index.html + data.js (version 0.3.3), assets/decor-v1.glb (112 Ko, 3 062 tris dans le kit).
- Tests sur la box (copie identique) : t-evidence 40/40, t-joystick 254/254, t01 PASS, 0 erreur console.
- Appels de dessin : +1 partout (décor fusionné). Hangar vue large 93 → 94. Tris : +19 000 environ.
- Aperçus : tools/previews-decors/ (before/, after/, planche.jpg, decor_kit_sheet.png, decor_vignette_dusk.png).
- Sauvegarde des fichiers d'avant : ~/blender-work/decor/backup-pre-decor/. Aucun GLB existant modifié (pas de .orig.glb nécessaire).
