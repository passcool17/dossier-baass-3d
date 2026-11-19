/* Dossier BAASS 3D — textes, preuves, crédits. v0.2.0
   Les citations sont des extraits verbatim du BAASS Project Management Plan
   (2 décembre 2008, contrat HHM402-08-C-0072, document public DOW-UAP-D168).
   Chaque citation a été reprise des jeux 2D déjà vérifiés, puis revérifiée
   contre source/pages-extracted.txt à la page PDF indiquée.
   Rien n’est présenté comme une preuve. L’histoire du jeu est une fiction.
*/

export const VERSION = '0.3.3';

export const SAVE_KEY = 'baass.dossier3d.v1';
export const SETTINGS_KEY = 'baass.dossier3d.settings.v1';

export const BANNER = 'plan de recherche, pas une preuve ; histoire fictive';

export const DISCLAIMER =
  'Ceci est un plan de gestion de recherche (décembre 2008), pas une preuve de physique nouvelle ni d’engin extraterrestre. L’histoire du jeu est une fiction.';

export const DOCUMENT_META = {
  title: 'BAASS Project Management Plan (Overview Paper)',
  date: '2 décembre 2008',
  contract: 'HHM402-08-C-0072',
  org: 'Bigelow Aerospace Advanced Space Studies (BAASS)',
  sponsor: 'DIA, programme AAWSAP',
  pages: 49,
  file: 'DOW-UAP-D168.pdf',
};

/** 8 preuves. `quote` = extrait verbatim (y compris coquilles d’OCR).
 *  `pdfPage` = page du fichier PDF (1–49). `printedPage` = folio imprimé. */
export const EVIDENCE = [
  {
    id: 'area-other',
    zone: 'ranch',
    title: 'Le contrat HHM402-08-C-0072',
    pdfPage: 7,
    printedPage: '1',
    quote:
      'This Project Manager Report (PMR) fulfills the requirement to submit a report as part of the Advanced Aerospace Weapon System Application contract HHM402-08-C-0072.',
    summary:
      'Le document est un rapport de gestion de projet exigé par le contrat « Advanced Aerospace Weapon System Application » HHM402-08-C-0072. Le 12e domaine (« Other ») sert d’appui aux onze autres.',
  },
  {
    id: 'proj-engagement',
    zone: 'ranch',
    title: 'Project Engagement',
    pdfPage: 8,
    printedPage: '2',
    quote:
      'Project Engagement will locate and secure small geographic areas that experience very frequent displays of advanced aerospace vehicles. The purpose is to directly observe and measure advanced aerospace vehicle performance.',
    summary:
      'Le projet vise à trouver et sécuriser de petites zones où des engins seraient souvent observés, pour les mesurer sur place. C’est un plan d’observation, pas un compte rendu d’observation déjà faite.',
  },
  {
    id: 'area-materials',
    zone: 'hangar',
    title: 'Materials (matériaux)',
    pdfPage: 19,
    printedPage: '13',
    quote: 'Until actual materials are obtained, we must rely on more indirect means.',
    summary:
      'Pour le Project Engagement, BAASS écrit qu’en attendant d’obtenir de vrais matériaux, il faudra se contenter de moyens indirects. Le document constate donc l’absence de ces matériaux au moment du plan.',
  },
  {
    id: 'area-control',
    zone: 'hangar',
    title: 'Control (contrôle)',
    pdfPage: 11,
    printedPage: '5',
    quote:
      'the matter of #3, Control, as in the operators of these very advanced spacecraft and possibly the source or sources of these craft.',
    summary:
      'Dans les recommandations, le domaine n° 3 (contrôle) est relié à une question : qui piloterait ces engins, et d’où viendraient-ils. Le texte pose la question ; il n’y répond pas.',
  },
  {
    id: 'area-lift',
    zone: 'lab',
    title: 'Les douze domaines d’étude',
    pdfPage: 7,
    printedPage: '1',
    quote:
      'the twelve following areas: (1) lift, (2) Propulsion, (3) control, (4) Power Generation, (5) Spatial/Temporal Translation, (6) Materials, (7) Configuration/Structure, (8) Signature Reduction (Optical/lR/RF/Acoustic), (9)Human Interface, (10) Human effects, (11) Armament (RF and DEW), and {12) Other areas in support of 1-11.',
    summary:
      'Le plan énumère douze domaines d’étude pour le rapport final prévu en septembre 2009. « Lift » (portance) est le premier de la liste. C’est un sujet à traiter, pas un résultat déjà obtenu. Graphies « lR » et « {12) » conservées telles quelles (OCR).',
  },
  {
    id: 'area-spatial',
    zone: 'lab',
    title: 'Études « highly theoretical »',
    pdfPage: 16,
    printedPage: '10',
    quote:
      'Many of the approaches recommended in the 12 Earthtech Technical Studies are highly theoretical.',
    summary:
      'Les études Earthtech, qui incluent la « translation spatiale/temporelle », sont décrites comme très théoriques. Le plan ne prétend pas qu’une telle technologie est déjà maîtrisée.',
  },
  {
    id: 'roswell-pio',
    zone: 'wreck',
    title: 'Officier d’information, juillet 1947',
    pdfPage: 45,
    printedPage: 'Annexe 2, p. 10',
    quote:
      'In July, 1947, I was stationed at the Roswell Army Air Base In Roswell, New Mexico, serving as the base Public Information Officer.',
    summary:
      'Le déclarant de l’affidavit écrit qu’en juillet 1947 il était officier d’information publique à la base aérienne de Roswell, au Nouveau-Mexique. C’est son récit, daté de 2002, joint en annexe au plan. Ce n’est pas une constatation de BAASS.',
  },
  {
    id: 'roswell-debris',
    zone: 'wreck',
    title: 'Débris « paper thin yet extremely strong »',
    pdfPage: 45,
    printedPage: 'Annexe 2, p. 10',
    quote:
      'Pieces which resembled metal foll, paper thin yet extremely strong. and pieces with unusual markings along their length were handled from man to man, each voicing their opinion. No one was able to identify the crash debris.',
    summary:
      'L’affidavit décrit des morceaux ressemblant à une feuille de métal, « fins comme du papier mais extrêmement résistants », et des marques inhabituelles. Personne, selon le déclarant, n’a pu identifier ces débris. Graphie « foll » conservée telle quelle (OCR). C’est un témoignage, pas une analyse de laboratoire. Le site d’épave du jeu est une scène fictive, liée à cette citation réelle.',
  },
];

export const ZONES = {
  ranch: { id: 'ranch', name: 'Ranch', x0: -42, x1: -2, z0: -18, z1: 24 },
  hangar: { id: 'hangar', name: 'Hangar', x0: -2, x1: 18.5, z0: -16, z1: 26 },
  ramp: { id: 'ramp', name: 'Rampe', x0: 19.85, x1: 26.15, z0: 2.08, z1: 5.92 },
  lab: { id: 'lab', name: 'Laboratoire', x0: 18.5, x1: 62, z0: -6, z1: 24 },
  wreck: { id: 'wreck', name: 'Site de l’épave', x0: -28, x1: 8, z0: 28, z1: 62 },
};

export const CREDITS = [
  {
    name: 'BAASS Project Management Plan (Overview Paper), 2 décembre 2008, contrat HHM402-08-C-0072 (DOW-UAP-D168)',
    author: 'Bigelow Aerospace Advanced Space Studies / DIA (document public)',
    license: 'Document public — extraits verbatim pour le jeu',
    url: '',
    note: 'Les citations sont des extraits mot pour mot. Le plan est un document de gestion de recherche, pas une preuve.',
  },
  {
    name: 'City Kit (Industrial) 2.0',
    author: 'Kenney',
    license: 'CC0 1.0',
    url: 'https://kenney.nl/assets/city-kit-industrial',
    note: 'Hangars, réservoirs, cheminées, conteneurs, château d’eau.',
  },
  {
    name: 'Modular Space Kit 1.0',
    author: 'Kenney',
    license: 'CC0 1.0',
    url: 'https://kenney.nl/assets/modular-space-kit',
    note: 'Salles et couloirs du laboratoire.',
  },
  {
    name: 'Factory Kit 3.0',
    author: 'Kenney',
    license: 'CC0 1.0',
    url: 'https://kenney.nl/assets/factory-kit',
    note: 'Caisses, machines, écrans. Aucun modèle « verre / transmission ».',
  },
  {
    name: 'Survival Kit 2.0',
    author: 'Kenney',
    license: 'CC0 1.0',
    url: 'https://kenney.nl/assets/survival-kit',
    note: 'Arbres, rochers, barils.',
  },
  {
    name: 'Nature Kit 2.1',
    author: 'Kenney',
    license: 'CC0 1.0',
    url: 'https://kenney.nl/assets/nature-kit',
    note: 'Licence CC0 vérifiée. Le téléchargement officiel (kenney.nl/download-link) a renvoyé HTTP 403 ; les rochers et buissons supplémentaires de la v0.2.1 viennent du Survival Kit (déjà dans le jeu).',
    unused: true,
  },
  {
    name: 'Farm Buildings Pack (Barn, Storage Shed)',
    author: 'Quaternius',
    license: 'CC0 1.0',
    url: 'https://quaternius.com/packs/farmbuildings.html',
    note: 'Aussi sur Poly Pizza (CC0, sans compte) : grange https://poly.pizza/m/vSqQNA7ez6 , hangar https://poly.pizza/m/JrFL3mLOKg',
  },
  {
    name: 'Truck',
    author: 'Quaternius',
    license: 'CC0 1.0',
    url: 'https://poly.pizza/m/cXw6oiFtZ8',
    note: 'Pickup du ranch.',
  },
  {
    name: 'Fence et Metal Fence',
    author: 'Quaternius',
    license: 'CC0 1.0',
    url: 'https://poly.pizza/m/e02PFKKhbr',
    note: 'Clôture bois https://poly.pizza/m/e02PFKKhbr , clôture métal https://poly.pizza/m/qWKhREFj7H',
  },
  {
    name: 'Debris Pile et Debris Papers',
    author: 'Quaternius',
    license: 'CC0 1.0',
    url: 'https://poly.pizza/m/WrIiMMxyEP',
    note: 'Débris https://poly.pizza/m/WrIiMMxyEP , papiers https://poly.pizza/m/PTvW67lIoU',
  },
  {
    name: 'Private Investigator (Detective) — personnage jouable',
    author: 'Jungle Jim',
    license: 'CC BY 4.0',
    url: 'https://skfb.ly/oPEIo',
    note: 'Détective jouable (Sketchfab), allégé pour mobile : 5 052 triangles, animations Idle, Walk, Run, Pickup et Inspect. Si le fichier ne charge pas, le jeu montre un détective de secours (« Man » de Quaternius, CC0, avec manteau et chapeau ajoutés).',
  },
  {
    name: 'Kit de décor (cactus, rochers, caisses, poteaux, éolienne…)',
    author: 'Dossier BAASS 3D (pipeline Blender sur le PC de Pascal)',
    license: 'CC0 1.0',
    url: '',
    note: 'assets/decor-v1.glb — 20 accessoires, couleurs de sommet, maillages fusionnés par zone. Fait pour le jeu, aucune transmission.',
  },
  {
    name: 'Ultimate Modular Men Pack (personnage « Man »)',
    author: 'Quaternius',
    license: 'CC0 1.0',
    url: 'https://quaternius.com/packs/ultimatemodularcharacters.html',
    note: 'Aussi sur Poly Pizza : https://poly.pizza/m/HMnuH5geEG — maillages fusionnés, animations Idle / Walk / Run / Standing.',
  },
  {
    name: 'Ufo',
    author: 'hat_my_guy',
    license: 'CC0 1.0',
    url: 'https://poly.pizza/m/NgURFR5T9m',
    note: 'Soucoupe du site d’épave. Page officielle : Public Domain (CC0), sans compte.',
  },
  {
    name: 'TR-3B',
    author: 'Dylusion (Dylan.Sakiri)',
    license: 'CC BY-NC 4.0',
    url: 'https://sketchfab.com/3d-models/50d8e1fdffad4f8a9064e657bda9c248',
    note: 'TR-3B by Dylusion, CC BY-NC 4.0, Sketchfab. Jeu gratuit, sans publicité, usage non commercial (condition de la licence NC).',
  },
  {
    name: '(Free) Low Poly Document File Folder',
    author: 'PolyDavid',
    license: 'CC BY 4.0',
    url: 'https://sketchfab.com/3d-models/free-low-poly-document-file-folder-eb55498ef9bc4358891816a9922d93a8',
    note: 'Chemises de dossier du jeu. Variante Manilla : https://sketchfab.com/3d-models/free-low-poly-document-file-folder-manilla-ba725589a1074659a7007e596ccf40da',
  },
  {
    name: '(Free) Low Poly Document File Folder — Manilla',
    author: 'PolyDavid',
    license: 'CC BY 4.0',
    url: 'https://sketchfab.com/3d-models/free-low-poly-document-file-folder-manilla-ba725589a1074659a7007e596ccf40da',
    note: 'Variante manille des chemises PolyDavid.',
  },
  {
    name: 'Paper Clip Box',
    author: 'PolyDavid',
    license: 'CC BY 4.0',
    url: 'https://sketchfab.com/3d-models/paper-clip-box-0bc35b02979146179ad2733bc9303291',
    note: 'Boîte de trombones sur les bureaux du laboratoire.',
  },
  {
    name: 'Rusty Filing Cabinet',
    author: 'Amiel Goco',
    license: 'CC BY 4.0',
    url: 'https://sketchfab.com/3d-models/rusty-filing-cabinet-619484b78fbe449ea5c0cdb68e8f2bd6',
    note: 'Classeur du laboratoire souterrain.',
  },
  {
    name: 'Laboratory Cabinet Storage | PBR Low poly | FREE',
    author: 'Naked Singularity Studio',
    license: 'CC BY 4.0',
    url: 'https://sketchfab.com/3d-models/laboratory-cabinet-storage-pbr-low-poly-free-6c5d3bde09dd4f55ad973d8429441190',
    note: 'Armoire de laboratoire. Le verre est en alpha simple, sans transmission.',
  },
  {
    name: 'Lab Things',
    author: 'Renafox',
    license: 'CC BY 4.0',
    url: 'https://sketchfab.com/3d-models/lab-things-6ed351eea02e4aefb6c3aad80a763890',
    note: 'Instruments de laboratoire.',
  },
  {
    name: 'Server Rack',
    author: 'Spellkaze',
    license: 'CC BY 4.0',
    url: 'https://sketchfab.com/3d-models/server-rack-62f6779cb7e448b19aaf58544c3c7218',
    note: 'Baies de serveurs du bunker.',
  },
  {
    name: 'Interface Sounds 1.0 et Sci-Fi Sounds',
    author: 'Kenney (www.kenney.nl)',
    license: 'CC0 1.0',
    url: 'https://kenney.nl/assets/interface-sounds',
    note: 'Clics, collecte, bourdonnement TR-3B, porte. Sci-Fi : https://kenney.nl/assets/sci-fi-sounds',
  },
  {
    name: 'Ambiances ranch, hangar et bunker',
    author: 'Arcade 3D · PassCool_17, générées avec MusicGen (facebook/musicgen-small, local)',
    license: 'Création originale du jeu',
    url: '',
    note: 'Lits sonores instrumentaux, sans voix, générés sur la box pour ce jeu.',
  },
  {
    name: 'Concrete 034 (murs du bunker)',
    author: 'ambientCG',
    license: 'CC0 1.0',
    url: 'https://ambientcg.com/a/Concrete034',
    note: 'Texture PBR, 1024 px, KTX2 ETC1S / UASTC. Murs et plafond du bunker.',
  },
  {
    name: 'Concrete 003 (sol du bunker, taches)',
    author: 'ambientCG',
    license: 'CC0 1.0',
    url: 'https://ambientcg.com/a/Concrete003',
    note: 'Texture PBR, 1024 px, KTX2. Sol du laboratoire et dalle du hangar.',
  },
  {
    name: 'Ground 054 (sable / terre)',
    author: 'ambientCG',
    license: 'CC0 1.0',
    url: 'https://ambientcg.com/a/Ground054',
    note: 'Texture PBR, 1024 px, KTX2. Sol du ranch, du désert et du site d’épave.',
  },
  {
    name: 'Metal Walkway 010 (caillebotis)',
    author: 'ambientCG',
    license: 'CC0 1.0',
    url: 'https://ambientcg.com/a/MetalWalkway010',
    note: 'Texture PBR avec opacité (alphaTest, sans transmission). Rampe et palier du bunker.',
  },
  {
    name: 'Three.js r170, detect-gpu 5.0.70, meshopt, KTX2 / Basis',
    author: 'three.js authors, pmndrs, Khronos, Binomial',
    license: 'MIT / Apache-2.0 selon le composant',
    url: 'https://threejs.org/',
    note: 'Moteur 3D, détection de puce, compression des maillages et textures.',
  },
];


export const SOUND_CREDITS = [
  {
    file: 'assets/sfx/ui_click.ogg',
    use: 'Clic des boutons',
    source: 'click_001, Interface Sounds by Kenney (https://kenney.nl/assets/interface-sounds)',
    license: 'CC0 1.0',
  },
  {
    file: 'assets/sfx/ui_open.ogg',
    use: 'Ouverture d’un panneau',
    source: 'open_002, Interface Sounds by Kenney (https://kenney.nl/assets/interface-sounds)',
    license: 'CC0 1.0',
  },
  {
    file: 'assets/sfx/pickup.ogg',
    use: 'Collecte d’une preuve',
    source: 'confirmation_002, Interface Sounds by Kenney (https://kenney.nl/assets/interface-sounds)',
    license: 'CC0 1.0',
  },
  {
    file: 'assets/sfx/tr3b_hum.ogg',
    use: 'Bourdonnement du TR-3B (boucle pendant le survol)',
    source: 'spaceEngineLow_003, Sci-Fi Sounds by Kenney (https://kenney.nl/assets/sci-fi-sounds)',
    license: 'CC0 1.0',
  },
  {
    file: 'assets/sfx/door.ogg',
    use: 'Porte du bunker',
    source: 'doorOpen_001, Sci-Fi Sounds by Kenney (https://kenney.nl/assets/sci-fi-sounds)',
    license: 'CC0 1.0',
  },
  {
    file: 'assets/sfx/bunker_blip.ogg',
    use: 'Accès bunker',
    source: 'forceField_002, Sci-Fi Sounds by Kenney (https://kenney.nl/assets/sci-fi-sounds)',
    license: 'CC0 1.0',
  },
  {
    file: 'assets/sfx/amb_desert.mp3',
    use: 'Ambiance ranch / désert (boucle)',
    source: 'Généré avec MusicGen (facebook/musicgen-small, local, CPU) pour ce jeu, à partir d’une invite « desert wind ».',
    license: 'Création originale du jeu',
  },
  {
    file: 'assets/sfx/amb_hangar.mp3',
    use: 'Ambiance hangar (boucle)',
    source: 'Généré avec MusicGen (facebook/musicgen-small, local, CPU) pour ce jeu, à partir d’une invite « hangar hum ».',
    license: 'Création originale du jeu',
  },
  {
    file: 'assets/sfx/amb_bunker.mp3',
    use: 'Ambiance bunker / laboratoire (boucle)',
    source: 'Généré avec MusicGen (facebook/musicgen-small, local, CPU) pour ce jeu, à partir d’une invite « bunker drone ».',
    license: 'Création originale du jeu',
  },
];

export const ASSETS_USED = CREDITS.filter((c) => !c.unused);
