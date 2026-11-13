/* Dossier BAASS 3D — textes, preuves, crédits. v0.1.1
   Les citations sont des extraits verbatim du BAASS Project Management Plan
   (2 décembre 2008, contrat HHM402-08-C-0072, document public DOW-UAP-D168).
   Chaque citation a été reprise des jeux 2D déjà vérifiés, puis revérifiée
   contre source/pages-extracted.txt à la page PDF indiquée.
   Rien n’est présenté comme une preuve. L’histoire du jeu est une fiction.
*/

export const VERSION = '0.1.1';

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
  hangar: { id: 'hangar', name: 'Hangar', x0: -2, x1: 26, z0: -16, z1: 26 },
  lab: { id: 'lab', name: 'Laboratoire', x0: 26, x1: 56, z0: -12, z1: 22 },
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
    note: 'Licence vérifiée sur la page officielle. Les modèles de ce kit n’ont pas été retenus dans v0.1.0 (gltfpack a rejeté deux GLB) ; les arbres et rochers viennent du Survival Kit.',
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
    name: 'Chemise de dossier et classeur (modèles originaux du jeu)',
    author: 'Arcade 3D · PassCool_17',
    license: 'Originaux, fournis avec le jeu',
    url: '',
    note: 'Les modèles Sketchfab CC BY prévus (chemises PolyDavid, Lab Things de Renafox, Rusty Filing Cabinet d’Amiel Goco) n’ont pas pu être téléchargés : l’API Sketchfab exige un compte (HTTP 401). Remplacés par ces modèles simples, faits pour le jeu.',
  },
  {
    name: 'Three.js r170, detect-gpu 5.0.70, meshopt, KTX2 / Basis',
    author: 'three.js authors, pmndrs, Khronos, Binomial',
    license: 'MIT / Apache-2.0 selon le composant',
    url: 'https://threejs.org/',
    note: 'Moteur 3D, détection de puce, compression des maillages et textures.',
  },
];

export const ASSETS_USED = CREDITS.filter((c) => !c.unused);
