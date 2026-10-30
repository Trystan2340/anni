/**
 * villageArt.ts — décor du village entièrement procédural (aucune ressource protégée).
 * Tout est dessiné en rectangles « pixel art » : pas d'images externes.
 */
export const VILLAGE_W = 1280;
export const VILLAGE_H = 760;
const MAIN_PATH_TOP = 344;
const MAIN_PATH_BOTTOM = 440;
const HOUSE_PATH_WIDTH = 68;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type HouseDecoration =
  | 'wreath'
  | 'garland'
  | 'lantern'
  | 'star'
  | 'gift'
  | 'candy-cane'
  | 'cookie'
  | 'medal'
  | 'stocking'
  | 'race-flag';

export interface HouseSpec {
  id: string;
  name: string;
  member: 'Maman' | 'Papa' | 'Juju' | 'Chacha';
  x: number;
  y: number;
  roof: string;
  wall: string;
  trim: string;
  glow: string;
  doorX: number;
  doorY: number;
  /** Direction from the main path toward the entrance. */
  entryFacing: 'north' | 'south';
  sign: string;
  decorations: HouseDecoration[];
}

export const HOUSES: HouseSpec[] = [
  {
    id: 'maison-maman',
    name: 'Maison de Maman',
    member: 'Maman',
    x: 60,
    y: 60,
    roof: '#b84d76',
    wall: '#f2d6df',
    trim: '#e2709a',
    glow: '#ffd6e6',
    doorX: 170,
    doorY: 268,
    entryFacing: 'south',
    sign: 'Friandises',
    decorations: ['wreath', 'garland', 'cookie'],
  },
  {
    id: 'maison-papa',
    name: 'Maison de Papa',
    member: 'Papa',
    x: 1000,
    y: 60,
    roof: '#2b4a83',
    wall: '#c9d9ef',
    trim: '#3f6bb5',
    glow: '#cfe4ff',
    doorX: 1110,
    doorY: 268,
    entryFacing: 'south',
    sign: 'Arène',
    decorations: ['lantern', 'star', 'medal'],
  },
  {
    id: 'maison-juju',
    name: 'Maison de Juju',
    member: 'Juju',
    x: 60,
    y: 500,
    roof: '#a8791c',
    wall: '#f6e6bd',
    trim: '#e8b83f',
    glow: '#ffe9a8',
    doorX: 170,
    doorY: 490,
    entryFacing: 'north',
    sign: 'Cadeaux',
    decorations: ['gift', 'candy-cane', 'stocking'],
  },
  {
    id: 'maison-chacha',
    name: 'Maison de Chacha',
    member: 'Chacha',
    x: 1000,
    y: 500,
    roof: '#5b3f96',
    wall: '#dcd2f2',
    trim: '#8e6ad6',
    glow: '#e3d4ff',
    doorX: 1110,
    doorY: 490,
    entryFacing: 'north',
    sign: 'Course',
    decorations: ['wreath', 'lantern', 'race-flag'],
  },
];

const VILLAGE_TREES: [number, number, number][] = [
  [330, 110, 1], [388, 78, 0.8], [900, 96, 1], [956, 66, 0.75],
  [330, 660, 1], [392, 700, 0.85], [900, 664, 1], [958, 704, 0.8],
  [240, 300, 0.7], [1040, 300, 0.7], [240, 500, 0.7], [1040, 500, 0.7],
  [500, 640, 0.75], [780, 640, 0.75],
  // Des bosquets encadrent la place sans empiéter sur les chemins.
  [432, 210, 0.82], [848, 210, 0.82],
  [540, 605, 0.65], [740, 605, 0.65],
];

export const CHEST = { x: 930, y: 486, w: 132, h: 100 };
export const CHALET = { x: 540, y: 248, w: 200, h: 150 };
export const CHALET_DOOR = { x: 640, y: 438 };
export const PRESENTER = { x: 776, y: 396 };
export const PLAYER_START = { x: 640, y: 500 };

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Générateur pseudo-aléatoire déterministe : le village est toujours identique. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  const w = 58 * scale;
  ctx.fillStyle = 'rgba(83, 111, 145, 0.22)';
  ctx.beginPath();
  ctx.ellipse(x + 2 * scale, y + 4 * scale, w * 0.72, 8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, x - 6 * scale, y - 8 * scale, 12 * scale, 14 * scale, '#5a3a22');
  px(ctx, x - 3 * scale, y - 8 * scale, 3 * scale, 13 * scale, '#8b6240');
  // Branches en plusieurs étages : elles s'élargissent naturellement vers le bas.
  const tiers = [
    { top: -80, width: 28 }, { top: -64, width: 38 },
    { top: -48, width: 48 }, { top: -32, width: 58 },
  ];
  for (const [index, tier] of tiers.entries()) {
    for (let row = 0; row < 8; row++) {
      const branchWidth = tier.width * scale * (row + 1) / 8;
      const rowY = y + (tier.top + row * 4) * scale;
      px(ctx, x - branchWidth / 2 - scale, rowY + 2 * scale, branchWidth + 2 * scale, 5 * scale, '#174b3c');
      px(ctx, x - branchWidth / 2, rowY, branchWidth, 4 * scale, index % 2 ? '#236b4b' : '#287753');
      if (row > 2) {
        px(ctx, x - branchWidth / 2 + 2 * scale, rowY + scale, branchWidth * 0.28, Math.max(1, scale), '#4a9162');
        px(ctx, x + branchWidth * 0.18, rowY + 2 * scale, branchWidth * 0.2, Math.max(1, scale), '#36845b');
      }
    }
    // Neige déposée sur les pointes des branches, en petites touches.
    const snowY = y + (tier.top + 24) * scale;
    const snowWidth = tier.width * scale * 0.22;
    px(ctx, x - tier.width * scale * 0.37, snowY, snowWidth, 3 * scale, '#f2f8ff');
    px(ctx, x + tier.width * scale * 0.15, snowY + 3 * scale, snowWidth, 3 * scale, '#f2f8ff');
    px(ctx, x - tier.width * scale * 0.34, snowY + 3 * scale, snowWidth * 0.65, Math.max(1, scale), '#bed5e6');
  }
  // Étoile discrète au sommet des plus grands sapins.
  if (scale >= 0.8) {
    px(ctx, x - 2 * scale, y - 87 * scale, 4 * scale, 10 * scale, '#ffd875');
    px(ctx, x - 5 * scale, y - 84 * scale, 10 * scale, 4 * scale, '#ffd875');
    px(ctx, x - scale, y - 83 * scale, 2 * scale, 2 * scale, '#fff6c9');
  }
  // Boules, guirlande et petits reflets donnent du relief au feuillage.
  for (let i = 0; i < 3; i++) {
    const ox = x + [-12, 10, 0][i] * scale;
    const oy = y + [-37, -25, -13][i] * scale;
    px(ctx, ox, oy, 4 * scale, 4 * scale, ['#ffcf62', '#e77893', '#79c6ea'][i]);
    px(ctx, ox + scale, oy + scale, 2 * scale, scale, '#fff4c9');
  }
  for (let tier = 0; tier < 3; tier++) {
    const tierWidth = w * (0.46 + tier * 0.16);
    const lineY = y - 58 * scale + tier * 18 * scale;
    for (let light = 0; light < 5; light++) {
      const lx = x - tierWidth / 2 + tierWidth * (light / 4);
      const ly = lineY + (light % 2) * 4 * scale;
      px(ctx, lx, ly, 3 * scale, 2 * scale, '#ffd166');
      px(ctx, lx, ly + 2 * scale, 2 * scale, 2 * scale, light % 2 ? '#e77893' : '#6cc6ff');
    }
  }
}

function drawHollyBush(ctx: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  ctx.fillStyle = 'rgba(83, 111, 145, 0.18)';
  ctx.beginPath(); ctx.ellipse(x + 2 * scale, y + 2 * scale, 24 * scale, 6 * scale, 0, 0, Math.PI * 2); ctx.fill();
  px(ctx, x - 20 * scale, y - 13 * scale, 15 * scale, 12 * scale, '#1e6548');
  px(ctx, x - 13 * scale, y - 20 * scale, 18 * scale, 19 * scale, '#287955');
  px(ctx, x + 1 * scale, y - 14 * scale, 19 * scale, 13 * scale, '#1b5c43');
  px(ctx, x - 17 * scale, y - 15 * scale, 10 * scale, 3 * scale, '#f7fbff');
  px(ctx, x - 10 * scale, y - 22 * scale, 12 * scale, 3 * scale, '#ffffff');
  px(ctx, x + 4 * scale, y - 16 * scale, 13 * scale, 3 * scale, '#f7fbff');
  for (const [dx, dy] of [[-9, -11], [4, -12], [12, -8]] as const) {
    px(ctx, x + dx * scale, y + dy * scale, 4 * scale, 4 * scale, '#d94b58');
    px(ctx, x + (dx + 1) * scale, y + (dy + 1) * scale, 2 * scale, 2 * scale, '#ffb068');
  }
}

function drawPlanter(ctx: CanvasRenderingContext2D, x: number, y: number, trim: string) {
  ctx.fillStyle = 'rgba(83, 111, 145, 0.18)';
  ctx.beginPath(); ctx.ellipse(x, y + 2, 15, 4, 0, 0, Math.PI * 2); ctx.fill();
  px(ctx, x - 8, y - 9, 16, 8, '#287955');
  px(ctx, x - 12, y - 6, 24, 4, '#1e6548');
  px(ctx, x - 9, y - 12, 18, 3, '#f7fbff');
  px(ctx, x - 9, y - 2, 18, 10, '#76503b');
  px(ctx, x - 7, y, 14, 6, trim);
  px(ctx, x - 8, y - 3, 16, 3, '#fff9e7');
  px(ctx, x - 3, y - 10, 4, 4, '#d94b58');
  px(ctx, x + 4, y - 8, 4, 4, '#d94b58');
  // Une petite étoile de Noël rouge au-dessus du feuillage enneigé.
  px(ctx, x - 2, y - 17, 4, 9, '#cf4e59');
  px(ctx, x - 6, y - 14, 12, 3, '#e56a6e');
  px(ctx, x - 1, y - 14, 2, 2, '#ffd166');
}

function drawSnowflakeMark(ctx: CanvasRenderingContext2D, x: number, y: number, size = 10, color = '#9eb5d0') {
  const arm = size;
  px(ctx, x - 2, y - arm, 4, arm * 2, color);
  px(ctx, x - arm, y - 2, arm * 2, 4, color);
  px(ctx, x - arm * 0.65, y - arm * 0.65, 4, 4, color);
  px(ctx, x + arm * 0.65 - 4, y - arm * 0.65, 4, 4, color);
  px(ctx, x - arm * 0.65, y + arm * 0.65 - 4, 4, 4, color);
  px(ctx, x + arm * 0.65 - 4, y + arm * 0.65 - 4, 4, 4, color);
  px(ctx, x - 1, y - 1, 2, 2, '#f8fbff');
}

function drawBench(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'rgba(83, 111, 145, 0.22)';
  ctx.beginPath(); ctx.ellipse(x, y + 3, 33, 7, 0, 0, Math.PI * 2); ctx.fill();
  px(ctx, x - 28, y - 15, 56, 4, '#6b4534');
  px(ctx, x - 26, y - 8, 52, 5, '#a56a43');
  px(ctx, x - 25, y - 18, 50, 4, '#f7fbff');
  px(ctx, x - 22, y - 6, 5, 12, '#563a32');
  px(ctx, x + 17, y - 6, 5, 12, '#563a32');
  px(ctx, x - 30, y - 22, 5, 18, '#684538');
  px(ctx, x + 25, y - 22, 5, 18, '#684538');
  px(ctx, x - 28, y - 24, 56, 4, '#d7b07d');
  px(ctx, x - 25, y - 27, 50, 3, '#ffffff');
  px(ctx, x - 3, y - 14, 6, 6, '#e2709a');
  // Une couverture et une tasse attendent les promeneurs sur chaque banc.
  px(ctx, x - 20, y - 13, 13, 7, '#bf6d73');
  px(ctx, x - 17, y - 12, 2, 5, '#f2d4aa');
  px(ctx, x - 12, y - 12, 2, 5, '#f2d4aa');
  px(ctx, x + 10, y - 18, 8, 8, '#fff0d4');
  px(ctx, x + 12, y - 16, 5, 5, '#cf7473');
  px(ctx, x + 18, y - 16, 3, 4, '#fff0d4');
}

function drawHouse(ctx: CanvasRenderingContext2D, house: HouseSpec) {
  const { x, y } = house;
  const w = 220;
  const h = 150;
  // Ombre douce et socle de pierre, pour mieux poser la maison dans la neige.
  ctx.fillStyle = 'rgba(76, 98, 130, 0.2)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2 + 8, y + h + 5, w * 0.56, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Murs clairs avec des lames de bois et des poutres d'angle.
  px(ctx, x + 16, y + 62, w - 32, h - 62, '#a9b4c5');
  px(ctx, x + 20, y + 62, w - 40, h - 66, house.wall);
  px(ctx, x + 20, y + 62, w - 40, 7, house.trim);
  for (let row = 0; row < 5; row++) {
    const lineY = y + 78 + row * 13;
    px(ctx, x + 24, lineY, w - 48, 2, row % 2 ? 'rgba(70, 61, 67, 0.13)' : 'rgba(255, 255, 255, 0.26)');
    for (let notch = 0; notch < 3; notch++) {
      const notchX = x + 42 + ((row * 47 + notch * 59) % 152);
      px(ctx, notchX, lineY + 3, 2, 1, 'rgba(90, 73, 69, 0.2)');
    }
  }
  // Poutres alpines apparentes, linteau sculpté et base en pierres irrégulières.
  px(ctx, x + 22, y + 68, 9, h - 84, '#694638');
  px(ctx, x + 24, y + 69, 3, h - 87, '#d8a66e');
  px(ctx, x + w - 31, y + 68, 9, h - 84, '#694638');
  px(ctx, x + w - 27, y + 69, 3, h - 87, '#d8a66e');
  px(ctx, x + 28, y + 76, w - 56, 5, '#694638');
  px(ctx, x + 32, y + 77, w - 64, 2, '#d8a66e');
  px(ctx, x + 20, y + 138, w - 40, 12, '#7d8290');
  px(ctx, x + 20, y + 138, w - 40, 2, '#eef4fa');
  for (let stone = 0; stone < 7; stone++) {
    const stoneX = x + 22 + stone * 25;
    const stoneY = y + 141 + (stone % 2) * 4;
    px(ctx, stoneX, stoneY, 21, 6, ['#9aa4b1', '#818b9a', '#a8b1bd'][stone % 3]);
    px(ctx, stoneX + 2, stoneY + 1, 12, 2, '#c8d1dc');
  }

  // Toit à deux pans avec bardeaux lisibles et congères en escalier.
  const roofH = 66;
  for (let i = 0; i < roofH; i++) {
    const t = (i + 1) / roofH;
    const rw = w * t;
    const roofX = x + (w - rw) / 2;
    px(ctx, roofX, y + 6 + i, rw, 1, i % 9 === 0 ? '#613c52' : house.roof);
    if (i > 16 && i % 10 === 2) {
      for (let shingle = 0; shingle < Math.floor(rw / 34); shingle++) {
        const sx = roofX + 10 + shingle * 34 + (i % 20 === 2 ? 10 : 0);
        if (sx < roofX + rw - 8) px(ctx, sx, y + 6 + i, 2, 4, 'rgba(48, 49, 72, 0.28)');
      }
    }
  }
  // Bardeaux en rangs décalés et poutres sombres qui soulignent le pignon.
  for (let row = 0; row < 6; row++) {
    const roofY = 15 + row * 7;
    const roofW = w * (roofY / roofH);
    const roofX = x + (w - roofW) / 2 + 6;
    const roofEnd = x + (w + roofW) / 2 - 8;
    for (let shingleX = roofX + (row % 2) * 10; shingleX < roofEnd; shingleX += 24) {
      px(ctx, shingleX, y + 6 + roofY, 15, 3, row % 2 ? 'rgba(40, 36, 58, 0.28)' : 'rgba(255, 232, 204, 0.2)');
      px(ctx, shingleX + 2, y + 6 + roofY + 1, 10, 1, 'rgba(255, 255, 255, 0.18)');
    }
  }
  for (let beam = 0; beam <= 12; beam++) {
    const beamX = beam * 7;
    const beamY = 9 + beam * 4;
    px(ctx, x + 109 - beamX, y + beamY, 4, 5, '#65434a');
    px(ctx, x + 107 + beamX, y + beamY, 4, 5, '#65434a');
  }
  for (let i = 0; i < 17; i++) {
    const rw = 16 + i * 3.55;
    const roofX = x + (w - rw) / 2;
    px(ctx, roofX, y + 4 + i, rw, 2, i % 4 === 1 ? '#e7f1fc' : '#f7fbff');
    if (i % 3 === 0) px(ctx, roofX + rw * 0.68, y + 5 + i, 16 + (i % 4) * 2, 3, '#ffffff');
  }
  // Congères en petits paliers le long des deux pans du toit.
  for (let row = 8; row < roofH; row += 8) {
    const roofW = w * ((row + 1) / roofH);
    const roofX = x + (w - roofW) / 2;
    const roofY = y + 6 + row;
    px(ctx, roofX + 1, roofY, 13, 4, '#ffffff');
    px(ctx, roofX + 1, roofY + 4, 10, 2, '#d8e6f5');
    px(ctx, roofX + roofW - 14, roofY, 13, 4, '#ffffff');
    px(ctx, roofX + roofW - 11, roofY + 4, 10, 2, '#d8e6f5');
  }
  // Petite lucarne éclairée dans le pignon, coiffée d'un toit enneigé.
  px(ctx, x + 94, y + 19, 32, 4, '#68434a');
  px(ctx, x + 98, y + 15, 24, 5, house.roof);
  px(ctx, x + 99, y + 14, 22, 3, '#f7fbff');
  px(ctx, x + 100, y + 23, 20, 14, '#503841');
  px(ctx, x + 103, y + 25, 14, 9, house.glow);
  px(ctx, x + 109, y + 25, 3, 9, '#5a3d42');
  px(ctx, x + 103, y + 29, 14, 2, '#5a3d42');
  px(ctx, x + 99, y + 36, 22, 3, '#d5e1ee');
  // Grande cheminée en brique, couronnée de neige.
  px(ctx, x + w - 54, y + 14, 28, 40, '#704844');
  px(ctx, x + w - 50, y + 18, 20, 34, '#a95f54');
  px(ctx, x + w - 48, y + 21, 4, 28, '#d17d65');
  for (let row = 0; row < 4; row++) {
    px(ctx, x + w - 49 + (row % 2) * 8, y + 25 + row * 7, 8, 2, '#784541');
    px(ctx, x + w - 39 - (row % 2) * 5, y + 29 + row * 7, 7, 2, '#ca7962');
  }
  px(ctx, x + w - 58, y + 11, 36, 6, '#d6e2ef');
  px(ctx, x + w - 57, y + 9, 34, 4, '#ffffff');
  px(ctx, x + w - 52, y + 6, 24, 3, '#f7fbff');
  // corniche et glaçons
  for (let i = 0; i < 12; i++) {
    const t = (i + 1) / roofH;
    const rw = w * t;
    px(ctx, x + (w - rw) / 2 + rw * 0.18, y + 7 + i + 14, rw * 0.64, 2, '#eaf2ff');
  }
  px(ctx, x + 4, y + 61, w - 8, 9, '#c8d8eb');
  px(ctx, x + 4, y + 61, w - 8, 3, '#ffffff');
  px(ctx, x + 7, y + 68, w - 14, 7, '#68473c');
  px(ctx, x + 10, y + 69, w - 20, 2, '#d29b66');
  for (let beam = 0; beam < 8; beam++) {
    px(ctx, x + 20 + beam * 25, y + 68, 4, 7, '#81563f');
    px(ctx, x + 21 + beam * 25, y + 68, 1, 5, '#e0b781');
  }
  for (let i = 0; i < 9; i++) {
    px(ctx, x + 14 + i * 24, y + 68, 3, 4 + (i % 3) * 3, '#e7f4ff');
    px(ctx, x + 15 + i * 24, y + 71 + (i % 3) * 3, 1, 2, '#b7cde3');
  }

  // Fenêtres profondes, volets colorés, rideaux et rebords enneigés.
  for (let i = 0; i < 2; i++) {
    const wx = x + 38 + i * 120;
    px(ctx, wx - 4, y + 82, 55, 51, '#493844');
    px(ctx, wx - 9, y + 86, 5, 39, house.trim);
    px(ctx, wx + 51, y + 86, 5, 39, house.trim);
    px(ctx, wx, y + 87, 47, 38, '#392f43');
    px(ctx, wx + 3, y + 90, 41, 32, house.glow);
    px(ctx, wx + 5, y + 92, 16, 12, '#fff3c7');
    px(ctx, wx + 25, y + 92, 16, 12, '#ffe6a1');
    px(ctx, wx + 5, y + 107, 16, 12, '#ffe7aa');
    px(ctx, wx + 25, y + 107, 16, 12, '#fff1c5');
    px(ctx, wx + 22, y + 90, 4, 32, '#493844');
    px(ctx, wx + 3, y + 104, 41, 3, '#493844');
    px(ctx, wx - 12, y + 124, 71, 5, '#dbe9f8');
    px(ctx, wx - 9, y + 86, 4, 40, '#fff0cc');
    // Volets à lames et jardinières fleuries sous les vitres.
    for (let slat = 0; slat < 4; slat++) {
      px(ctx, wx - 8, y + 94 + slat * 7, 3, 2, 'rgba(54, 44, 55, 0.3)');
      px(ctx, wx + 53, y + 94 + slat * 7, 3, 2, 'rgba(54, 44, 55, 0.3)');
    }
    px(ctx, wx + 3, y + 130, 41, 5, '#684536');
    px(ctx, wx + 1, y + 128, 45, 3, '#f7fbff');
    for (let flower = 0; flower < 4; flower++) {
      const flowerX = wx + 7 + flower * 10;
      px(ctx, flowerX, y + 124, 3, 5, '#287955');
      px(ctx, flowerX - 2, y + 123, 3, 3, '#e77893');
      px(ctx, flowerX + 2, y + 122, 3, 3, '#ffd166');
    }
    // halo discret autour des vitres
    ctx.fillStyle = house.glow;
    ctx.globalAlpha = 0.09;
    ctx.fillRect(wx - 14, y + 78, 74, 70);
    ctx.globalAlpha = 1;
  }

  // Petit porche à colonnes, auvent rayé et neige épaisse au-dessus de la porte.
  px(ctx, x + 83, y + 82, 64, 7, '#573a35');
  px(ctx, x + 85, y + 81, 60, 4, house.trim);
  px(ctx, x + 80, y + 78, 68, 5, '#f7fbff');
  px(ctx, x + 84, y + 77, 60, 2, '#ffffff');
  for (let stripe = 0; stripe < 6; stripe++) {
    px(ctx, x + 88 + stripe * 9, y + 84, 4, 4, stripe % 2 ? '#f5dfc3' : house.trim);
  }
  px(ctx, x + 88, y + 87, 4, 61, '#654338');
  px(ctx, x + 89, y + 88, 1, 57, '#d4a16b');
  px(ctx, x + 138, y + 87, 4, 61, '#654338');
  px(ctx, x + 139, y + 88, 1, 57, '#d4a16b');

  // Porte en bois à panneaux, avec une fenêtre chaude et poignée en laiton.
  px(ctx, x + 91, y + 89, 48, 61, '#583b36');
  px(ctx, x + 96, y + 93, 38, 57, house.trim);
  px(ctx, x + 101, y + 98, 28, 21, '#ffe7ad');
  px(ctx, x + 104, y + 101, 22, 15, house.glow);
  px(ctx, x + 113, y + 100, 3, 17, '#60413a');
  px(ctx, x + 101, y + 117, 28, 3, '#60413a');
  px(ctx, x + 101, y + 124, 28, 20, '#8b5641');
  px(ctx, x + 105, y + 128, 20, 2, 'rgba(255, 229, 188, 0.46)');
  px(ctx, x + 105, y + 136, 20, 2, 'rgba(47, 43, 58, 0.2)');
  px(ctx, x + 114, y + 97, 3, 48, 'rgba(54, 44, 55, 0.24)');
  px(ctx, x + 124, y + 121, 5, 5, '#f7ca69');
  px(ctx, x + 125, y + 122, 2, 2, '#fff2b9');
  px(ctx, x + 89, y + 148, 52, 5, '#c7d5e8');
  px(ctx, x + 94, y + 148, 41, 2, '#ffffff');

  // Enseigne en bois avec double liseré.
  px(ctx, x + 75, y + 40, 82, 25, '#48313b');
  px(ctx, x + 78, y + 42, 76, 20, '#b0814d');
  px(ctx, x + 81, y + 44, 70, 15, '#fff2d4');
  px(ctx, x + 78, y + 39, 76, 3, '#f7fbff');
  px(ctx, x + 76, y + 63, 80, 3, '#684536');
  px(ctx, x + 82, y + 59, 4, 5, '#f2c14e');
  px(ctx, x + 146, y + 59, 4, 5, '#f2c14e');

  // Guirlande sur le débord du toit.
  px(ctx, x + 26, y + 70, 168, 3, '#246148');
  for (let i = 0; i < 10; i++) {
    const lx = x + 22 + i * 20;
    const ly = y + 69 + Math.sin(i * 0.8) * 4;
    px(ctx, lx, ly, 5, 6, ['#ff7184', '#ffd166', '#7ae582', '#6cc6ff'][i % 4]);
    px(ctx, lx + 1, ly + 1, 2, 2, '#fff4d0');
  }
}

function drawHouseDecoration(ctx: CanvasRenderingContext2D, house: HouseSpec, decoration: HouseDecoration) {
  const { x, y } = house;
  if (decoration === 'wreath') {
    const green = '#1f7250';
    px(ctx, x + 112, y + 73, 16, 4, green);
    px(ctx, x + 108, y + 77, 4, 8, green);
    px(ctx, x + 128, y + 77, 4, 8, green);
    px(ctx, x + 112, y + 85, 16, 4, green);
    px(ctx, x + 112, y + 72, 4, 4, '#ff5d73');
    px(ctx, x + 124, y + 84, 4, 4, '#ffd166');
  } else if (decoration === 'garland') {
    px(ctx, x + 26, y + 72, 168, 3, '#1f7250');
    for (let i = 0; i < 8; i++) {
      const bx = x + 34 + i * 22;
      px(ctx, bx, y + 74 + (i % 2) * 2, 5, 5, i % 2 ? '#2e8a5a' : '#3f9d78');
      if (i % 2 === 0) px(ctx, bx + 5, y + 78, 4, 4, '#ffd166');
    }
  } else if (decoration === 'lantern') {
    px(ctx, x + 20, y + 78, 12, 4, '#3b2330');
    px(ctx, x + 24, y + 82, 4, 4, '#3b2330');
    px(ctx, x + 20, y + 86, 12, 16, '#3b2330');
    px(ctx, x + 23, y + 89, 6, 10, '#ffd166');
    px(ctx, x + 22, y + 102, 8, 3, '#3b2330');
    ctx.fillStyle = '#ffd166';
    ctx.globalAlpha = 0.2;
    ctx.fillRect(x + 14, y + 82, 24, 24);
    ctx.globalAlpha = 1;
  } else if (decoration === 'star') {
    const gold = '#ffd166';
    px(ctx, x + 82, y + 21, 4, 16, gold);
    px(ctx, x + 76, y + 27, 16, 4, gold);
    px(ctx, x + 79, y + 24, 4, 4, '#fff2b5');
    px(ctx, x + 85, y + 32, 4, 4, '#fff2b5');
  } else if (decoration === 'gift') {
    px(ctx, x + 174, y + 129, 20, 17, '#c8384f');
    px(ctx, x + 182, y + 129, 4, 17, '#ffd166');
    px(ctx, x + 174, y + 135, 20, 4, '#ffd166');
    px(ctx, x + 178, y + 125, 6, 4, '#ffd166');
    px(ctx, x + 186, y + 125, 6, 4, '#ffd166');
  } else if (decoration === 'candy-cane') {
    // candy-cane, placée sur le mur libre à gauche de la fenêtre
    px(ctx, x + 22, y + 120, 4, 22, '#ffffff');
    px(ctx, x + 22, y + 120, 14, 4, '#ffffff');
    px(ctx, x + 32, y + 120, 4, 8, '#ffffff');
    px(ctx, x + 22, y + 126, 4, 4, '#c8384f');
    px(ctx, x + 30, y + 120, 4, 4, '#c8384f');
    px(ctx, x + 22, y + 136, 4, 4, '#c8384f');
  } else if (decoration === 'cookie') {
    // Biscuit bonhomme au-dessus de la fenêtre, signature de la maison gourmande.
    px(ctx, x + 181, y + 70, 9, 11, '#9a5634');
    px(ctx, x + 179, y + 73, 13, 5, '#b86a3d');
    px(ctx, x + 183, y + 72, 2, 2, '#fff0c2');
    px(ctx, x + 187, y + 72, 2, 2, '#fff0c2');
    px(ctx, x + 185, y + 76, 3, 2, '#e27078');
  } else if (decoration === 'medal') {
    px(ctx, x + 183, y + 69, 4, 7, '#3f6bb5');
    px(ctx, x + 190, y + 69, 4, 7, '#c8384f');
    px(ctx, x + 181, y + 75, 15, 7, '#bb842e');
    px(ctx, x + 184, y + 77, 9, 3, '#ffd166');
    px(ctx, x + 187, y + 76, 3, 5, '#fff3bd');
  } else if (decoration === 'stocking') {
    px(ctx, x + 28, y + 71, 11, 4, '#fff1d2');
    px(ctx, x + 31, y + 75, 8, 10, '#c8384f');
    px(ctx, x + 36, y + 83, 8, 4, '#c8384f');
    px(ctx, x + 33, y + 77, 3, 3, '#ffd166');
  } else {
    // Drapeau à damier, clin d'œil au mini-jeu de course de Chacha.
    px(ctx, x + 184, y + 68, 3, 16, '#65443a');
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        px(ctx, x + 187 + col * 4, y + 69 + row * 4, 4, 4, (row + col) % 2 ? '#ffffff' : '#303246');
      }
    }
    px(ctx, x + 184, y + 83, 7, 2, '#ffd166');
  }
}

/** Chalet vu du côté nord : l'entrée donne sur la route et le toit reste à l'endroit. */
function drawNorthHouse(ctx: CanvasRenderingContext2D, house: HouseSpec): void {
  const { x, y } = house;
  ctx.fillStyle = 'rgba(76, 98, 130, 0.2)';
  ctx.beginPath(); ctx.ellipse(x + 114, y + 150, 123, 18, 0, 0, Math.PI * 2); ctx.fill();
  // Façade nord, au contact du seuil et du chemin.
  px(ctx, x + 18, y, 184, 57, '#694638');
  px(ctx, x + 23, y + 4, 174, 48, house.wall);
  for (let row = 0; row < 4; row++) px(ctx, x + 26, y + 12 + row * 10, 168, 2, 'rgba(70, 61, 67, 0.18)');
  for (const wx of [x + 39, x + 151]) {
    px(ctx, wx, y + 12, 30, 28, '#493844');
    px(ctx, wx + 4, y + 16, 22, 20, house.glow);
    px(ctx, wx + 14, y + 16, 3, 20, '#694638');
    px(ctx, wx + 4, y + 25, 22, 3, '#694638');
    px(ctx, wx - 3, y + 39, 36, 4, '#f7fbff');
  }
  // La porte est tournée vers le nord, juste derrière le seuil interactif.
  px(ctx, x + 88, y, 44, 48, '#503731');
  px(ctx, x + 93, y + 3, 34, 41, house.trim);
  px(ctx, x + 98, y + 8, 24, 16, house.glow);
  px(ctx, x + 109, y + 8, 3, 16, '#60413a');
  px(ctx, x + 98, y + 27, 24, 14, '#8b5641');
  px(ctx, x + 119, y + 26, 4, 4, '#f7ca69');
  px(ctx, x + 85, y, 50, 4, '#f7fbff');
  // Toit vu en perspective, sans retourner les détails ni la neige.
  px(ctx, x + 8, y + 51, 204, 96, '#68473c');
  px(ctx, x + 12, y + 55, 196, 88, house.roof);
  for (let row = 0; row < 7; row++) {
    const ry = y + 58 + row * 12;
    px(ctx, x + 15, ry, 190, 2, 'rgba(40, 36, 58, 0.3)');
    for (let col = 0; col < 7; col++) px(ctx, x + 18 + col * 27 + (row % 2) * 8, ry + 2, 2, 8, 'rgba(48, 49, 72, 0.24)');
  }
  px(ctx, x + 8, y + 48, 204, 7, '#f7fbff');
  px(ctx, x + 14, y + 50, 192, 3, '#ffffff');
  for (let i = 0; i < 8; i++) {
    const iceX = x + 18 + i * 25;
    px(ctx, iceX, y + 53, 3, 5 + (i % 3) * 2, '#e5f3ff');
    px(ctx, iceX + 1, y + 57 + (i % 3) * 2, 1, 2, '#bdd6e7');
  }
  px(ctx, x + 15, y + 139, 190, 6, '#e7f1fc');
  px(ctx, x + 20, y + 142, 180, 3, '#ffffff');
  // Enseigne lisible et guirlande festive.
  px(ctx, x + 75, y + 84, 82, 25, '#48313b');
  px(ctx, x + 78, y + 86, 76, 20, '#b0814d');
  px(ctx, x + 81, y + 88, 70, 15, '#fff2d4');
  px(ctx, x + 78, y + 83, 76, 3, '#f7fbff');
  px(ctx, x + 23, y + 53, 174, 3, '#246148');
  for (let i = 0; i < 9; i++) {
    px(ctx, x + 24 + i * 21, y + 54, 5, 5, ['#ff7184', '#ffd166', '#7ae582', '#6cc6ff'][i % 4]);
  }
}

/** Peint la façade et les éléments de Noël déclarés pour cette maison. */
export function paintHouse(ctx: CanvasRenderingContext2D, house: HouseSpec): void {
  if (house.entryFacing === 'north') drawNorthHouse(ctx, house);
  else drawHouse(ctx, house);
  house.decorations.forEach((decoration) => drawHouseDecoration(ctx, house, decoration));
}

function drawChalet(ctx: CanvasRenderingContext2D) {
  const { x, y, w, h } = CHALET;
  ctx.fillStyle = 'rgba(76, 98, 130, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x + w / 2 + 5, y + h + 6, w * 0.68, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, x + 14, y + 52, w - 28, h - 52, '#69483a');
  px(ctx, x + 20, y + 56, w - 40, h - 56, '#c28b55');
  px(ctx, x + 20, y + 56, w - 40, 8, '#efd5aa');
  for (let row = 0; row < 5; row++) {
    const logY = y + 72 + row * 15;
    px(ctx, x + 25, logY, w - 50, 3, row % 2 ? '#a76c43' : '#d9a66d');
    px(ctx, x + 32 + (row % 2) * 28, logY + 5, 15, 2, '#b77b4a');
  }
  px(ctx, x + 20, y + 138, w - 40, 12, '#69717e');
  px(ctx, x + 20, y + 138, w - 40, 3, '#eef4fa');
  for (let stone = 0; stone < 6; stone++) {
    const stoneX = x + 23 + stone * 28;
    const stoneY = y + 142 + (stone % 2) * 4;
    px(ctx, stoneX, stoneY, 24, 6, ['#8f9aa7', '#aab3bf', '#788391'][stone % 3]);
    px(ctx, stoneX + 2, stoneY + 1, 13, 2, '#cbd4df');
  }
  for (let i = 0; i < 5; i++) px(ctx, x + 34 + i * 34, y + 66, 4, h - 78, '#69483a');
  const chaletRoofH = 58;
  for (let i = 0; i < chaletRoofH; i++) {
    const t = (i + 1) / chaletRoofH;
    const rw = (w + 12) * t;
    const roofX = x + 6 + (w + 12 - rw) / 2;
    px(ctx, roofX, y + 6 + i, rw, 1, i % 8 === 0 ? '#68433d' : '#9b603e');
    if (i > 14 && i % 9 === 1) {
      for (let shingle = 0; shingle < Math.floor(rw / 25); shingle++) px(ctx, roofX + 8 + shingle * 25, y + 6 + i, 2, 4, '#704237');
    }
  }
  // Bardeaux en rangs alternés et poutres foncées le long du grand pignon.
  for (let row = 0; row < 5; row++) {
    const roofY = 17 + row * 8;
    const roofW = (w + 12) * (roofY / chaletRoofH);
    const roofX = x + 6 + (w + 12 - roofW) / 2 + 5;
    for (let shingle = 0; shingle < Math.floor((roofW - 10) / 22); shingle++) {
      const shingleX = roofX + shingle * 22 + (row % 2) * 8;
      px(ctx, shingleX, y + 6 + roofY, 14, 3, row % 2 ? 'rgba(49, 39, 50, 0.28)' : 'rgba(255, 232, 205, 0.22)');
      px(ctx, shingleX + 2, y + 7 + roofY, 10, 1, 'rgba(255, 255, 255, 0.18)');
    }
  }
  for (let beam = 0; beam <= 10; beam++) {
    const beamX = beam * 8;
    const beamY = 10 + beam * 4;
    px(ctx, x + 105 - beamX, y + beamY, 4, 5, '#68443e');
    px(ctx, x + 101 + beamX, y + beamY, 4, 5, '#68443e');
  }
  for (let i = 0; i < 18; i++) {
    const rw = 18 + i * 3.8;
    const roofX = x + (w + 12 - rw) / 2;
    px(ctx, roofX, y + 3 + i, rw, 2, i % 4 ? '#f7fbff' : '#e7f1fc');
    if (i % 4 === 0) px(ctx, roofX + rw * 0.65, y + 5 + i, 13, 3, '#ffffff');
  }
  for (let row = 8; row < chaletRoofH; row += 9) {
    const roofW = (w + 12) * ((row + 1) / chaletRoofH);
    const roofX = x + 6 + (w + 12 - roofW) / 2;
    const roofY = y + 6 + row;
    px(ctx, roofX + 1, roofY, 12, 4, '#ffffff');
    px(ctx, roofX + roofW - 13, roofY, 12, 4, '#ffffff');
  }
  // Lucarne dorée qui reprend les lignes du toit principal.
  px(ctx, x + 88, y + 20, 24, 4, '#68443e');
  px(ctx, x + 92, y + 16, 16, 5, '#9b603e');
  px(ctx, x + 94, y + 15, 12, 3, '#f7fbff');
  px(ctx, x + 92, y + 24, 16, 16, '#583b39');
  px(ctx, x + 95, y + 27, 10, 10, '#ffe6a3');
  px(ctx, x + 99, y + 27, 2, 10, '#583b39');
  px(ctx, x + 95, y + 31, 10, 2, '#583b39');
  px(ctx, x + 91, y + 39, 18, 3, '#d8e6f5');
  // Petite cheminée latérale, cohérente avec la fumée de l'ambiance.
  px(ctx, x + 28, y + 14, 22, 43, '#75453e');
  px(ctx, x + 33, y + 21, 12, 32, '#a86451');
  px(ctx, x + 24, y + 11, 30, 5, '#f5f9ff');
  px(ctx, x + 2, y + 54, w + 4, 9, '#d1deed');
  px(ctx, x + 2, y + 54, w + 4, 3, '#ffffff');
  px(ctx, x + 6, y + 62, w - 12, 7, '#68473c');
  px(ctx, x + 10, y + 63, w - 20, 2, '#d29b66');
  // Fenêtre centrale à quatre carreaux et rideaux rouges.
  px(ctx, x + 51, y + 74, 98, 42, '#583b39');
  px(ctx, x + 56, y + 78, 88, 34, '#ffe6a3');
  px(ctx, x + 60, y + 81, 36, 12, '#fff4c7');
  px(ctx, x + 104, y + 81, 36, 12, '#ffedb1');
  px(ctx, x + 60, y + 98, 36, 11, '#ffedb1');
  px(ctx, x + 104, y + 98, 36, 11, '#fff4c7');
  px(ctx, x + 99, y + 78, 5, 34, '#583b39');
  px(ctx, x + 56, y + 94, 88, 4, '#583b39');
  px(ctx, x + 47, y + 113, 106, 6, '#f5e8ce');
  px(ctx, x + 57, y + 80, 6, 31, '#be5961');
  px(ctx, x + 137, y + 80, 6, 31, '#be5961');
  // Poutres du porche et menuiserie sculptée autour de la porte.
  px(ctx, x + 73, y + 115, 5, 34, '#654338');
  px(ctx, x + 76, y + 117, 2, 29, '#d5a16b');
  px(ctx, x + 122, y + 115, 5, 34, '#654338');
  px(ctx, x + 124, y + 117, 2, 29, '#d5a16b');
  // Guirlande et petites ampoules sous le toit.
  px(ctx, x + 24, y + 64, w - 48, 3, '#1f7250');
  for (let i = 0; i < 7; i++) {
    const lightX = x + 34 + i * 22;
    const lightY = y + 66 + (i % 2) * 2;
    ctx.fillStyle = '#ffd166';
    ctx.globalAlpha = 0.16;
    ctx.beginPath(); ctx.arc(lightX + 3, lightY + 3, 10, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    px(ctx, lightX, lightY, 6, 6, ['#ff7184', '#ffd166', '#7ae582'][i % 3]);
    px(ctx, lightX + 2, lightY + 1, 2, 2, '#fff5d8');
  }
  // Porte centrale, assez haute pour se lire comme une vraie entrée.
  px(ctx, x + 79, y + 115, 42, 35, '#503732');
  px(ctx, x + 84, y + 119, 32, 31, '#945c3c');
  px(ctx, x + 89, y + 124, 21, 13, '#b87847');
  px(ctx, x + 89, y + 140, 21, 7, '#784832');
  px(ctx, x + 108, y + 134, 4, 4, '#ffe9a8');
  px(ctx, x + 78, y + 148, 44, 6, '#765039');
  // Couronne et lanternes de porche.
  px(ctx, x + 29, y + 84, 17, 4, '#246148');
  px(ctx, x + 25, y + 88, 4, 13, '#246148');
  px(ctx, x + 29, y + 101, 17, 4, '#246148');
  px(ctx, x + 39, y + 83, 6, 5, '#df6576');
  for (const lanternX of [x + 35, x + 160]) {
    px(ctx, lanternX, y + 103, 11, 4, '#603e34');
    px(ctx, lanternX + 2, y + 107, 7, 13, '#523936');
    px(ctx, lanternX + 4, y + 110, 3, 7, '#ffd166');
  }
  // Marche enneigée qui rejoint le sentier.
  px(ctx, x + 70, y + h, 60, 12, '#b6c9df');
  px(ctx, x + 76, y + h, 48, 3, '#ffffff');
  px(ctx, x + 84, y + h + 10, 32, 4, '#d7e3f1');
}

function drawSnowman(ctx: CanvasRenderingContext2D, x: number, y: number, scarf = '#c8384f') {
  // Petite ombre et branches de bras sous la neige fraîche.
  ctx.fillStyle = 'rgba(83, 111, 145, 0.2)';
  ctx.beginPath(); ctx.ellipse(x, y + 2, 24, 5, 0, 0, Math.PI * 2); ctx.fill();
  px(ctx, x - 23, y - 29, 12, 3, '#70472c');
  px(ctx, x - 28, y - 34, 3, 8, '#70472c');
  px(ctx, x + 12, y - 29, 12, 3, '#70472c');
  px(ctx, x + 23, y - 34, 3, 8, '#70472c');
  px(ctx, x - 16, y - 16, 32, 16, '#ffffff');
  px(ctx, x - 13, y - 14, 25, 4, '#dbe8f5');
  px(ctx, x - 12, y - 30, 24, 16, '#f7fbff');
  px(ctx, x - 10, y - 44, 20, 16, '#ffffff');
  px(ctx, x - 8, y - 42, 14, 3, '#dbe8f5');
  // Chapeau haut-de-forme.
  px(ctx, x - 12, y - 45, 24, 4, '#2b3548');
  px(ctx, x - 7, y - 57, 14, 13, '#2b3548');
  px(ctx, x - 5, y - 55, 10, 2, '#53617a');
  px(ctx, x - 4, y - 38, 3, 3, '#2a2a3a');
  px(ctx, x + 3, y - 38, 3, 3, '#2a2a3a');
  px(ctx, x - 1, y - 32, 3, 8, '#e2751f');
  px(ctx, x - 10, y - 32, 20, 5, scarf);
  px(ctx, x - 4, y - 28, 8, 3, '#a82944');
  px(ctx, x + 4, y - 27, 6, 12, scarf);
  px(ctx, x + 5, y - 17, 2, 4, '#f5d18b');
  px(ctx, x + 8, y - 17, 2, 4, '#f5d18b');
  px(ctx, x - 2, y - 22, 4, 3, '#4b6079');
  px(ctx, x - 2, y - 16, 4, 3, '#4b6079');
  px(ctx, x - 14, y - 22, 6, 4, '#2a2a3a');
}

function drawGiftPile(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const boxes: [number, number, number, number, string, string][] = [
    [0, -18, 24, 18, '#c8384f', '#ffd166'],
    [22, -14, 18, 14, '#3f6bb5', '#ffffff'],
    [-6, -32, 16, 14, '#4a9c6d', '#ffd166'],
  ];
  for (const [dx, dy, w, h, color, ribbon] of boxes) {
    px(ctx, x + dx, y + dy, w, h, color);
    px(ctx, x + dx + 2, y + dy + 2, Math.max(2, w - 5), 2, 'rgba(255, 255, 255, 0.25)');
    px(ctx, x + dx + w / 2 - 2, y + dy, 4, h, ribbon);
    px(ctx, x + dx, y + dy + h / 2 - 2, w, 4, ribbon);
    px(ctx, x + dx + w / 2 - 7, y + dy - 5, 6, 5, ribbon);
    px(ctx, x + dx + w / 2 + 1, y + dy - 5, 6, 5, ribbon);
  }
}

function drawTinyGift(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  // De petits paquets de Noël posés sur la neige, près des jardins.
  ctx.fillStyle = 'rgba(83, 111, 145, 0.18)';
  ctx.beginPath(); ctx.ellipse(x + 9, y + 2, 15, 4, 0, 0, Math.PI * 2); ctx.fill();
  px(ctx, x, y - 14, 18, 14, color);
  px(ctx, x + 2, y - 13, 14, 2, 'rgba(255, 255, 255, 0.35)');
  px(ctx, x + 7, y - 14, 4, 14, '#ffe3a5');
  px(ctx, x, y - 9, 18, 3, '#ffe3a5');
  px(ctx, x + 3, y - 18, 5, 4, '#ffe3a5');
  px(ctx, x + 10, y - 18, 5, 4, '#ffe3a5');
}

function drawCandyStake(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Canne en sucre plantée dans un petit monticule de neige.
  ctx.fillStyle = 'rgba(83, 111, 145, 0.18)';
  ctx.beginPath(); ctx.ellipse(x + 2, y + 2, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
  px(ctx, x - 8, y - 3, 18, 5, '#f8fcff');
  px(ctx, x - 1, y - 31, 7, 29, '#fff8ea');
  px(ctx, x - 7, y - 31, 8, 6, '#fff8ea');
  px(ctx, x - 10, y - 27, 6, 7, '#fff8ea');
  px(ctx, x - 1, y - 24, 7, 4, '#d75b65');
  px(ctx, x - 1, y - 14, 7, 4, '#d75b65');
  px(ctx, x - 1, y - 4, 7, 3, '#d75b65');
  px(ctx, x - 9, y - 27, 5, 3, '#d75b65');
}

function drawSnowSparkle(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x - 1, y - 6, 3, 13, '#ffffff');
  px(ctx, x - 6, y - 1, 13, 3, '#ffffff');
  px(ctx, x - 1, y - 1, 3, 3, '#b2cae4');
}

function drawFrozenPond(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Petite mare gelée au bord du chemin, entièrement plate et sans collision.
  ctx.fillStyle = 'rgba(83, 111, 145, 0.2)';
  ctx.beginPath(); ctx.ellipse(x + 3, y + 4, 58, 25, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f7fbff';
  ctx.beginPath(); ctx.ellipse(x, y, 58, 25, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#a8cde0';
  ctx.beginPath(); ctx.ellipse(x, y, 50, 19, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c7e4ec';
  ctx.beginPath(); ctx.ellipse(x - 3, y - 2, 43, 14, 0, 0, Math.PI * 2); ctx.fill();
  px(ctx, x - 34, y - 5, 22, 2, '#f4fcff');
  px(ctx, x - 20, y + 7, 28, 2, '#eafaff');
  px(ctx, x + 12, y - 3, 23, 2, '#f4fcff');
  px(ctx, x - 5, y - 12, 12, 2, '#eafaff');
  px(ctx, x + 27, y + 7, 9, 2, '#9fc4d7');
  drawSnowSparkle(ctx, x + 27, y - 9);
  // Une paire de petits patins laissée sur la neige au bord de la glace.
  for (const [dx, color] of [[-24, '#d96570'], [-8, '#6c9bd3']] as const) {
    px(ctx, x + dx, y + 15, 9, 9, color);
    px(ctx, x + dx + 2, y + 13, 5, 4, '#f7eee0');
    px(ctx, x + dx + 1, y + 18, 6, 2, '#fff3da');
    px(ctx, x + dx - 1, y + 24, 12, 2, '#8faac2');
    px(ctx, x + dx + 1, y + 22, 2, 3, '#8faac2');
  }
}

function drawSnowRabbit(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Petite sculpture de lapin dans la neige, à côté des jardins.
  ctx.fillStyle = 'rgba(83, 111, 145, 0.18)';
  ctx.beginPath(); ctx.ellipse(x, y + 2, 13, 4, 0, 0, Math.PI * 2); ctx.fill();
  px(ctx, x - 7, y - 10, 15, 10, '#f8fcff');
  px(ctx, x - 5, y - 15, 11, 7, '#ffffff');
  px(ctx, x - 4, y - 24, 3, 10, '#f5faff');
  px(ctx, x + 2, y - 25, 3, 11, '#f5faff');
  px(ctx, x - 3, y - 22, 1, 6, '#e8aeba');
  px(ctx, x + 3, y - 23, 1, 6, '#e8aeba');
  px(ctx, x - 3, y - 12, 2, 2, '#526479');
  px(ctx, x + 2, y - 12, 2, 2, '#526479');
  px(ctx, x - 1, y - 9, 2, 2, '#e69da5');
  px(ctx, x - 10, y - 7, 4, 5, '#ffffff');
}

function drawBirdhouse(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Nichoir de bois accroché à un sapin, avec une petite toiture enneigée.
  px(ctx, x + 7, y - 12, 2, 13, '#d8bd86');
  px(ctx, x, y, 16, 15, '#805338');
  px(ctx, x + 2, y + 2, 12, 11, '#bf8958');
  px(ctx, x + 5, y + 4, 6, 5, '#4d3831');
  px(ctx, x + 3, y + 12, 10, 2, '#e4ba7c');
  px(ctx, x - 2, y - 2, 20, 4, '#704535');
  px(ctx, x, y - 4, 16, 3, '#fff9ed');
  px(ctx, x + 3, y - 6, 10, 3, '#f7fbff');
  px(ctx, x + 5, y + 15, 8, 2, '#704535');
}

function drawRobin(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Petit rouge-gorge posé sur la neige, sans gêner les déplacements.
  px(ctx, x - 6, y - 7, 12, 7, '#754c3a');
  px(ctx, x - 3, y - 9, 9, 8, '#a66a46');
  px(ctx, x, y - 6, 6, 5, '#d66c53');
  px(ctx, x + 3, y - 11, 7, 6, '#80503a');
  px(ctx, x + 8, y - 8, 4, 2, '#e7ba70');
  px(ctx, x + 6, y - 9, 2, 2, '#283541');
  px(ctx, x - 5, y - 1, 2, 2, '#76503b');
  px(ctx, x + 2, y - 1, 2, 2, '#76503b');
}

function drawBirdFeeder(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Petite mangeoire enneigée près de la mare.
  ctx.fillStyle = 'rgba(83, 111, 145, 0.18)';
  ctx.beginPath(); ctx.ellipse(x + 10, y + 3, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
  px(ctx, x + 8, y - 13, 4, 18, '#78523c');
  px(ctx, x, y - 17, 20, 5, '#9c6d49');
  px(ctx, x + 2, y - 19, 16, 3, '#e3bd83');
  px(ctx, x + 3, y - 25, 3, 7, '#866044');
  px(ctx, x + 14, y - 25, 3, 7, '#866044');
  px(ctx, x - 1, y - 28, 22, 4, '#805238');
  px(ctx, x + 1, y - 30, 18, 3, '#f9fcff');
  px(ctx, x + 5, y - 20, 2, 2, '#c97854');
  px(ctx, x + 11, y - 20, 2, 2, '#dba15f');
}

function drawSmallSleigh(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Petit traîneau chargé de cadeaux, stationné dans la neige.
  ctx.fillStyle = 'rgba(83, 111, 145, 0.2)';
  ctx.beginPath(); ctx.ellipse(x + 25, y + 3, 33, 5, 0, 0, Math.PI * 2); ctx.fill();
  px(ctx, x - 4, y - 2, 56, 4, '#76503a');
  px(ctx, x + 1, y + 2, 46, 3, '#d3a36d');
  px(ctx, x - 6, y - 8, 4, 8, '#76503a');
  px(ctx, x + 50, y - 8, 4, 8, '#76503a');
  px(ctx, x + 2, y - 20, 46, 17, '#a43f4d');
  px(ctx, x + 6, y - 17, 38, 10, '#d56b63');
  px(ctx, x + 3, y - 6, 43, 3, '#f4cc86');
  px(ctx, x + 8, y - 26, 14, 10, '#76a589');
  px(ctx, x + 13, y - 26, 4, 10, '#ffe4a4');
  px(ctx, x + 26, y - 29, 14, 13, '#dda85e');
  px(ctx, x + 31, y - 29, 4, 13, '#fff0bb');
  px(ctx, x + 24, y - 30, 17, 3, '#f9fcff');
  px(ctx, x + 4, y - 21, 8, 2, '#fff6df');
}

function drawPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  px(ctx, x, y, w, h, '#d6e1ef');
  px(ctx, x + 3, y + 3, w - 6, h - 6, '#e3ebf5');
  px(ctx, x, y, w, 3, '#f8fbff');
  px(ctx, x, y + h - 3, w, 3, '#bccde1');
  const pathRandom = rng(Math.floor(x * 17 + y * 23 + w * 29 + h * 31));
  const rows = Math.max(2, Math.floor(h / 23));
  for (let row = 0; row < rows; row++) {
    const tileY = y + 4 + row * 22;
    let tileX = x + (row % 2 ? -14 : 5);
    while (tileX < x + w - 2) {
      const tileW = 28 + Math.floor(pathRandom() * 16);
      const stoneX = Math.max(x + 2, tileX);
      const stoneW = Math.min(tileW, tileX + tileW - stoneX, x + w - 2 - stoneX);
      if (stoneW <= 0) break;
      const tone = ['#e7eef7', '#dce6f2', '#e1eaf4', '#d8e3f0'][Math.floor(pathRandom() * 4)];
      px(ctx, stoneX, tileY, stoneW, 16, tone);
      px(ctx, stoneX + 1, tileY, Math.max(1, stoneW - 2), 2, '#f4f8fc');
      px(ctx, stoneX, tileY + 14, stoneW, 2, '#c8d6e7');
      if (pathRandom() > 0.57) {
        const markX = stoneX + 5 + Math.floor(pathRandom() * Math.max(2, stoneW - 10));
        px(ctx, markX, tileY + 6 + Math.floor(pathRandom() * 5), 3 + Math.floor(pathRandom() * 3), 2, '#c7d7e9');
      }
      tileX += tileW + 3 + Math.floor(pathRandom() * 4);
    }
  }
  // Neige en petits bourrelets sur les côtés, sans réduire la zone marchable.
  px(ctx, x + 2, y + 5, 2, h - 10, '#f7fbff');
  px(ctx, x + w - 4, y + 5, 2, h - 10, '#f7fbff');
}

export function houseApproachRect(house: HouseSpec): Rect {
  const northFacing = house.entryFacing === 'north';
  const junctionY = northFacing ? MAIN_PATH_BOTTOM : MAIN_PATH_TOP;
  const entryY = northFacing ? house.y - 12 : house.y + 150;
  return {
    x: house.doorX - HOUSE_PATH_WIDTH / 2,
    y: Math.min(junctionY, entryY),
    w: HOUSE_PATH_WIDTH,
    h: Math.abs(junctionY - entryY),
  };
}

function drawHouseApproach(ctx: CanvasRenderingContext2D, house: HouseSpec) {
  const { x, y, w, h } = houseApproachRect(house);

  drawPath(ctx, x, y, w, h);
  px(ctx, x, y, 2, h, '#cddbef');
  px(ctx, x + w - 2, y, 2, h, '#cddbef');

  // Quelques pavés de couleur signalent l'entrée sans rétrécir le passage.
  for (let i = 0, markerY = y + 18; markerY < y + h - 8; i++, markerY += 46) {
    const markerX = i % 2 === 0 ? x + 6 : x + w - 10;
    px(ctx, markerX, markerY, 4, 6, house.trim);
    px(ctx, markerX, markerY, 2, 2, house.glow);
  }
}

function drawHouseThreshold(ctx: CanvasRenderingContext2D, house: HouseSpec) {
  const y = house.entryFacing === 'north' ? house.y - 12 : house.y + 150;
  px(ctx, house.doorX - 22, y, 44, 9, house.trim);
  px(ctx, house.doorX - 18, y + 2, 36, 4, '#f8fbff');
  px(ctx, house.doorX - 3, y + 2, 6, 4, house.glow);
  px(ctx, house.doorX - 18, y + 9, 36, 4, '#c8d6e7');
  px(ctx, house.doorX - 15, y + 10, 30, 2, '#ffffff');
}

function drawHouseGarden(ctx: CanvasRenderingContext2D, house: HouseSpec) {
  const y = house.entryFacing === 'north' ? house.y - 26 : house.y + 202;
  drawPlanter(ctx, house.doorX - 52, y, house.trim);
  drawPlanter(ctx, house.doorX + 52, y, house.trim);
  drawSnowflakeMark(ctx, house.doorX, y + 24, 5, '#a7bdd6');
}

function drawFirewoodStack(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'rgba(83, 111, 145, 0.2)';
  ctx.beginPath(); ctx.ellipse(x + 22, y + 3, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
  px(ctx, x, y - 7, 42, 9, '#704633');
  px(ctx, x + 3, y - 17, 36, 9, '#87563a');
  px(ctx, x + 8, y - 27, 27, 9, '#704633');
  for (const [lx, ly, color] of [[4, -6, '#d1a16b'], [29, -6, '#bb8252'], [8, -16, '#d0a16b'], [32, -16, '#c18c59'], [12, -26, '#d6aa72']] as const) {
    px(ctx, x + lx, y + ly, 4, 7, color);
    px(ctx, x + lx, y + ly, 2, 2, '#f0d4a4');
  }
  px(ctx, x - 1, y - 30, 45, 4, '#f7fbff');
  px(ctx, x + 7, y - 32, 28, 3, '#ffffff');
}

function drawPathLantern(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Lanternes de bois et de verre qui balisent la place sans barrer les passages.
  ctx.fillStyle = '#ffd166';
  ctx.globalAlpha = 0.12;
  ctx.beginPath();
  ctx.ellipse(x, y + 23, 32, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  px(ctx, x - 8, y + 24, 16, 5, '#554338');
  px(ctx, x - 5, y + 20, 10, 7, '#795a40');
  px(ctx, x - 3, y - 1, 6, 24, '#68472f');
  px(ctx, x - 6, y + 4, 12, 3, '#bb8b52');
  px(ctx, x - 2, y + 18, 4, 3, '#d6ae72');
  px(ctx, x - 13, y - 12, 26, 4, '#49342c');
  px(ctx, x - 10, y - 9, 20, 18, '#3b2d32');
  px(ctx, x - 7, y - 7, 14, 14, '#ffc75e');
  px(ctx, x - 5, y - 5, 10, 10, '#fff0b4');
  px(ctx, x - 2, y - 8, 4, 16, '#7c5140');
  px(ctx, x - 11, y - 13, 22, 3, '#f7fbff');
  px(ctx, x - 8, y - 16, 16, 4, '#583a2b');
  px(ctx, x - 3, y - 21, 6, 5, '#ffd166');
  px(ctx, x - 1, y - 23, 2, 3, '#fff4c9');
}

function drawFestiveFence(ctx: CanvasRenderingContext2D, x: number, y: number, count: number, accent: string) {
  const spacing = 18;
  const width = (count - 1) * spacing + 6;
  // Deux traverses, rehaussées de neige et d'une guirlande de houx.
  px(ctx, x, y + 11, width, 6, '#8a613d');
  px(ctx, x, y + 25, width, 6, '#9b7046');
  px(ctx, x + 2, y + 11, width - 4, 2, '#d7b07d');
  px(ctx, x + 2, y + 25, width - 4, 2, '#d7b07d');
  px(ctx, x, y + 8, width, 3, '#f7fbff');
  for (let post = 0; post < count; post++) {
    const postX = x + post * spacing;
    px(ctx, postX, y + 2, 6, 34, '#775037');
    px(ctx, postX + 1, y + 5, 2, 25, '#b18452');
    px(ctx, postX - 2, y, 10, 4, '#f7fbff');
    px(ctx, postX - 1, y - 3, 8, 4, accent);
    if (post % 2 === 0) px(ctx, postX + 1, y + 15, 4, 3, '#ffd166');
  }
  for (let light = 0; light < count - 1; light++) {
    const lightX = x + 8 + light * spacing;
    const lightY = y + 18 + (light % 2) * 2;
    px(ctx, lightX, lightY, 5, 4, light % 2 ? '#4a9c6d' : '#287955');
    if (light % 2 === 0) px(ctx, lightX + 2, lightY + 4, 4, 4, ['#e27078', '#ffd166', '#6cc6ff'][light % 3]);
  }
  px(ctx, x + width / 2 - 8, y + 17, 16, 8, '#1e6548');
  px(ctx, x + width / 2 - 5, y + 15, 6, 4, '#e27078');
  px(ctx, x + width / 2 + 2, y + 22, 5, 4, '#ffd166');
}

function drawPlazaPaving(ctx: CanvasRenderingContext2D) {
  const centerX = CHALET.x + CHALET.w / 2;
  const centerY = CHALET.y + CHALET.h + 18;
  // Une bordure de pavés en anneau relie visuellement les quatre chemins.
  for (let stone = 0; stone < 48; stone++) {
    const angle = (stone / 48) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * 204;
    const y = centerY + Math.sin(angle) * 108;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    px(ctx, -9, -4, 18, 8, stone % 3 === 0 ? '#c6d6e8' : '#d5e0ed');
    px(ctx, -7, -3, 13, 2, '#f8fbff');
    px(ctx, -8, 2, 15, 2, '#adbed3');
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(centerX, centerY, 224, 126, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(161, 184, 210, 0.6)';
  ctx.beginPath(); ctx.ellipse(centerX, centerY, 187, 94, 0, 0, Math.PI * 2); ctx.stroke();
  drawSnowflakeMark(ctx, 430, 416, 9, '#a7bdd6');
  drawSnowflakeMark(ctx, 850, 416, 9, '#a7bdd6');
  drawSnowflakeMark(ctx, 640, 535, 8, '#b7c9dd');
}

/** Dessine tout le décor statique du village. */
export function paintVillage(ctx: CanvasRenderingContext2D): void {
  const random = rng(20261225);

  // neige de fond + reliefs
  px(ctx, 0, 0, VILLAGE_W, VILLAGE_H, '#e4edf8');
  for (let band = 0; band < 8; band++) {
    px(ctx, 0, band * 96, VILLAGE_W, 96, band % 2 ? '#e7eff9' : '#e2ebf6');
    px(ctx, 0, band * 96, VILLAGE_W, 3, 'rgba(255, 255, 255, 0.24)');
  }
  for (let i = 0; i < 2200; i++) {
    const x = random() * VILLAGE_W;
    const y = random() * VILLAGE_H;
    const fleck = random();
    const size = fleck > 0.985 ? 3 : fleck > 0.78 ? 2 : 1;
    px(ctx, x, y, size + 1, size, fleck > 0.55 ? '#f5f9ff' : '#d4e0ef');
  }
  for (let i = 0; i < 34; i++) {
    const cx = random() * VILLAGE_W;
    const cy = random() * VILLAGE_H;
    const r = 26 + random() * 70;
    const ry = r * (0.32 + random() * 0.2);
    ctx.fillStyle = '#bacbe0';
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy + 7, r * 1.06, ry * 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8fbff';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.08, cy - 2, r, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // sentiers vers les quatre maisons
  drawFrozenPond(ctx, 765, 155);
  drawPath(ctx, 0, MAIN_PATH_TOP, VILLAGE_W, MAIN_PATH_BOTTOM - MAIN_PATH_TOP);
  drawPath(ctx, 592, 0, 96, VILLAGE_H);
  HOUSES.forEach((house) => drawHouseApproach(ctx, house));
  px(ctx, 0, MAIN_PATH_TOP, VILLAGE_W, 4, '#cddbef');
  px(ctx, 0, MAIN_PATH_BOTTOM - 4, VILLAGE_W, 4, '#cddbef');
  px(ctx, 592, 0, 4, VILLAGE_H, '#cddbef');
  px(ctx, 684, 0, 4, VILLAGE_H, '#cddbef');

  // place centrale
  ctx.fillStyle = '#e2ebf7';
  ctx.beginPath();
  ctx.ellipse(CHALET.x + CHALET.w / 2, CHALET.y + CHALET.h + 18, 190, 118, 0, 0, Math.PI * 2);
  ctx.fill();
  px(ctx, CHALET.x + 50, CHALET.y + CHALET.h + 2, 300, 3, '#cddbef');
  px(ctx, CHALET.x + 30, CHALET.y + CHALET.h + 66, 340, 3, '#cddbef');
  drawPlazaPaving(ctx);

  // Sapins plus grands et bosquets bas encadrent la place et les chemins.
  VILLAGE_TREES.forEach(([x, y, s]) => drawTree(ctx, x, y, s));
  [[432, 210], [848, 210], [500, 640], [780, 640]].forEach(([x, y]) => drawBirdhouse(ctx, x + 6, y - 43));
  drawHollyBush(ctx, 462, 278, 0.9);
  drawHollyBush(ctx, 818, 278, 0.9);
  drawHollyBush(ctx, 432, 548, 1);
  drawHollyBush(ctx, 848, 548, 1);
  drawHollyBush(ctx, 536, 548, 0.8);
  drawHollyBush(ctx, 744, 548, 0.8);
  drawBench(ctx, 454, 326);
  drawBench(ctx, 826, 326);

  HOUSES.forEach((house) => paintHouse(ctx, house));
  HOUSES.forEach((house) => drawHouseThreshold(ctx, house));
  HOUSES.forEach((house) => drawHouseGarden(ctx, house));
  drawChalet(ctx);
  drawFirewoodStack(ctx, 490, 335);

  // Petites boîtes aux lettres en bois, placées hors des chemins de porte.
  HOUSES.forEach((house) => {
    const mx = house.x + 185;
    const my = house.y + 165;
    ctx.fillStyle = 'rgba(73, 86, 111, 0.18)';
    ctx.beginPath(); ctx.ellipse(mx + 8, my + 3, 16, 5, 0, 0, Math.PI * 2); ctx.fill();
    px(ctx, mx + 6, my - 1, 4, 22, '#6b4a36');
    px(ctx, mx, my - 17, 17, 13, house.trim);
    px(ctx, mx + 2, my - 15, 13, 7, house.glow);
    px(ctx, mx + 5, my - 11, 7, 2, '#78404c');
    px(ctx, mx - 2, my - 19, 21, 3, '#f5f8fc');
    px(ctx, mx + 2, my - 19, 15, 2, '#ffffff');
    px(ctx, mx + 18, my - 17, 3, 10, '#76503b');
    px(ctx, mx + 20, my - 18, 8, 5, '#c8384f');
    px(ctx, mx + 21, my - 17, 5, 2, '#fff1d2');
    // Ruban accroché au montant de la boîte aux lettres.
    px(ctx, mx + 1, my + 3, 5, 4, house.trim);
    px(ctx, mx + 11, my + 3, 5, 4, house.trim);
    px(ctx, mx + 6, my + 4, 5, 5, '#ffd166');
  });

  drawPathLantern(ctx, 536, 300);
  drawPathLantern(ctx, 744, 300);
  drawPathLantern(ctx, 520, 475);
  drawPathLantern(ctx, 760, 475);

  drawSnowman(ctx, 470, 470);
  drawSnowman(ctx, 820, 486, '#4d91a7');
  drawGiftPile(ctx, 492, 244);
  drawGiftPile(ctx, 748, 244);

  // guirlandes le long des sentiers (positions partagées avec les lumières animées)
  guirlandePositions().forEach(({ x, y }, i) => {
    px(ctx, x, y, 6, 6, ['#ff5d73', '#ffd166', '#7ae582', '#6cc6ff', '#c99bff'][i % 5]);
    ctx.fillStyle = '#ffd166';
    ctx.globalAlpha = 0.16;
    ctx.beginPath();
    ctx.arc(x + 3, y + 3, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Clôtures de jardin décorées de houx, de rubans et de neige fraîche.
  drawFestiveFence(ctx, 270, 132, 10, '#e2709a');
  drawFestiveFence(ctx, 876, 132, 7, '#6c9bd3');
  drawFestiveFence(ctx, 270, 578, 10, '#e8b83f');
  drawRobin(ctx, 322, 132);
  drawRobin(ctx, 900, 132);
  drawRobin(ctx, 388, 578);
  drawSmallSleigh(ctx, 390, 270);
  drawBirdFeeder(ctx, 792, 205);

  // Petits objets de fête placés dans la neige, à côté des sentiers.
  const gifts: [number, number, string][] = [
    [310, 250, '#d36a7f'], [954, 250, '#6c9bd3'],
    [310, 698, '#d0a340'], [918, 728, '#a682d0'],
    [370, 248, '#78ae8a'], [894, 248, '#d36a7f'],
    [458, 640, '#d0a340'], [870, 700, '#78a6cd'],
  ];
  gifts.forEach(([x, y, color]) => drawTinyGift(ctx, x, y, color));
  drawSnowRabbit(ctx, 330, 510);
  drawSnowRabbit(ctx, 960, 510);
  [[359, 284], [918, 284], [354, 536], [920, 536]].forEach(([x, y]) => drawCandyStake(ctx, x, y));
  [[336, 298], [946, 298], [336, 558], [946, 558], [395, 228], [876, 228], [404, 672], [875, 672], [305, 308], [975, 308], [470, 690], [800, 720]]
    .forEach(([x, y]) => drawSnowSparkle(ctx, x, y));
}

/** Positions des lumières de guirlande (décor peint + lumières animées superposées). */
export function guirlandePositions(): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < 32; i++) {
    const x = 40 + i * 39;
    if (x > 560 && x < 720) continue;
    points.push({ x, y: 340 + Math.sin(i * 0.9) * 8 });
  }
  return points;
}

/** Quelques ornements de sapin choisis pour les lueurs animées. */
export function treeLightPositions(): { x: number; y: number }[] {
  const selected = new Set([0, 2, 4, 6, 14, 15, 16, 17]);
  return VILLAGE_TREES.filter((_, index) => selected.has(index))
    .map(([x, y, scale]) => ({ x: x - 10 * scale, y: y - 35 * scale }));
}

/** Obstacles solides du décor (arbres, clôtures, bâtiments). */
export const VILLAGE_OBSTACLES: Rect[] = [
  ...HOUSES.flatMap(houseCollisionRects),
  // Murs du chalet avec une ouverture libre à la porte centrale.
  { x: CHALET.x + 20, y: CHALET.y + 52, w: 64, h: CHALET.h - 52 },
  { x: CHALET.x + 116, y: CHALET.y + 52, w: 64, h: CHALET.h - 52 },
  { x: CHALET.x + 84, y: CHALET.y + 52, w: 32, h: CHALET.h - 70 },
  ...VILLAGE_TREES.map(([x, y, scale]) => ({
    x: x - 16 * scale,
    y: y - 12 * scale,
    w: 32 * scale,
    h: 20 * scale,
  })),
  // Jardinières, bosquets et bancs autour des passages.
  ...HOUSES.flatMap((house) => {
    const y = house.entryFacing === 'north' ? house.y - 26 : house.y + 202;
    return [-52, 52].map((offset) => ({ x: house.doorX + offset - 12, y: y - 12, w: 24, h: 20 }));
  }),
  ...[
    [462, 278, 0.9], [818, 278, 0.9], [432, 548, 1],
    [848, 548, 1], [536, 548, 0.8], [744, 548, 0.8],
  ].map(([x, y, scale]) => ({ x: x - 20 * scale, y: y - 8 * scale, w: 40 * scale, h: 12 * scale })),
  { x: 454 - 30, y: 326 - 27, w: 60, h: 34 },
  { x: 826 - 30, y: 326 - 27, w: 60, h: 34 },
  // Les quatre lanternes de la place.
  { x: 536 - 13, y: 300 - 12, w: 26, h: 40 },
  { x: 744 - 13, y: 300 - 12, w: 26, h: 40 },
  { x: 520 - 13, y: 475 - 12, w: 26, h: 40 },
  { x: 760 - 13, y: 475 - 12, w: 26, h: 40 },
  { x: 489, y: 305, w: 45, h: 32 },
  { x: 390, y: 258, w: 50, h: 14 }, // petit traîneau hors du chemin
  { x: 270, y: 132, w: 168, h: 36 },
  { x: 876, y: 132, w: 114, h: 36 },
  { x: 270, y: 578, w: 168, h: 36 },
  // bonshommes de neige et tas de cadeaux
  { x: 454, y: 448, w: 34, h: 24 },
  { x: 804, y: 464, w: 34, h: 24 },
  { x: 482, y: 206, w: 54, h: 42 },
  { x: 738, y: 206, w: 54, h: 42 },
];

/** Mur collision rectangles leave a centered doorway on the path-facing wall. */
export function houseCollisionRects(house: HouseSpec): Rect[] {
  const northFacing = house.entryFacing === 'north';
  const sideY = house.y + (northFacing ? 0 : 62);
  const lintelY = house.y + (northFacing ? 61 : 62);
  return [
    { x: house.x + 20, y: sideY, w: 71, h: 88 },
    { x: house.x + 139, y: sideY, w: 61, h: 88 },
    { x: house.x + 91, y: lintelY, w: 48, h: 27 },
  ];
}

/** Coffre : serrures allumées selon le nombre de clés déposées. */
export function paintChest(ctx: CanvasRenderingContext2D, deposited: number, opened: boolean): void {
  const w = CHEST.w;
  const h = CHEST.h;
  const x = 0;
  const y = 0;
  // Ombre portée et piètement pour que le petit coffre soit lisible sur le tapis.
  ctx.fillStyle = 'rgba(34, 26, 31, 0.42)';
  ctx.beginPath(); ctx.ellipse(x + w / 2 + 4, y + h - 5, w * 0.55, 10, 0, 0, Math.PI * 2); ctx.fill();
  px(ctx, x + 6, y + h - 13, w - 2, 12, '#392a29');
  px(ctx, x + 12, y + h - 16, w - 18, 5, '#68402f');
  if (opened) {
    // Couvercle ouvert, intérieur doré et éclat doux.
    px(ctx, x + 6, y + 8, w - 12, h - 28, '#805031');
    px(ctx, x + 13, y + 13, w - 26, h - 42, '#ffe9a8');
    px(ctx, x + 20, y + 18, w - 40, h - 54, '#fff4c9');
    px(ctx, x - 2, y - 21, w + 4, 27, '#7f4a2f');
    px(ctx, x + 3, y - 17, w - 6, 16, '#bc7f3c');
    px(ctx, x + 9, y - 14, w - 18, 6, '#f2c14e');
    px(ctx, x + 14, y - 9, w - 28, 3, '#ffeab0');
  } else {
    // Couvercle bombé par paliers, puis caisse à lames de bois.
    px(ctx, x + 18, y + 1, w - 36, 5, '#d2a45b');
    px(ctx, x + 10, y + 6, w - 20, 5, '#bb8244');
    px(ctx, x + 5, y + 11, w - 10, 16, '#a96f39');
    px(ctx, x + 9, y + 12, w - 18, 4, '#d49a50');
    px(ctx, x + 12, y + 18, w - 24, 3, '#8a542f');
    px(ctx, x + 6, y + 28, w - 12, h - 47, '#a96f39');
    px(ctx, x + 10, y + 33, w - 20, 3, '#c78a47');
    px(ctx, x + 10, y + 47, w - 20, 3, '#88552f');
    px(ctx, x + 10, y + 61, w - 20, 3, '#c78a47');
    px(ctx, x + 10, y + 75, w - 20, 3, '#88552f');
    for (let nail = 0; nail < 6; nail++) {
      px(ctx, x + 13 + nail * 20, y + 39 + (nail % 2) * 18, 2, 2, '#f2d38b');
    }
  }
  px(ctx, x + 5, y + h - 21, w - 10, 8, '#6a4829');
  px(ctx, x + 6, y + h - 20, w - 12, 3, '#d4a344');
  // Ferrures verticales avec arêtes lumineuses.
  px(ctx, x + 13, y + 2, 8, h - 22, '#9b682e');
  px(ctx, x + 15, y + 2, 4, h - 22, '#ffd166');
  px(ctx, x + w - 21, y + 2, 8, h - 22, '#9b682e');
  px(ctx, x + w - 19, y + 2, 4, h - 22, '#ffd166');
  px(ctx, x + 7, y + 30, 7, 14, '#d6a64e');
  px(ctx, x + w - 14, y + 30, 7, 14, '#d6a64e');
  px(ctx, x + 9, y + 32, 2, 9, '#ffe5a0');
  px(ctx, x + w - 12, y + 32, 2, 9, '#ffe5a0');
  // Quatre serrures colorées qui s'illuminent progressivement.
  const lockColors: Record<string, string> = {
    off: '#4a4a58',
    rose: '#e2709a',
    bleue: '#5b8fe0',
    doree: '#e8b83f',
    violette: '#a97ce8',
  };
  const order = ['rose', 'bleue', 'doree', 'violette'];
  for (let i = 0; i < 4; i++) {
    const lx = x + 13 + i * 27;
    const ly = y + h - 34;
    const active = i < deposited && !opened;
    const color = active ? lockColors[order[i]] : lockColors.off;
    px(ctx, lx, ly - 2, 18, 18, '#563b2d');
    px(ctx, lx + 2, ly, 14, 13, active ? color : '#55535b');
    px(ctx, lx + 4, ly + 2, 10, 2, active ? '#fff4d0' : '#858491');
    px(ctx, lx + 7, ly + 6, 4, 5, '#fff6d8');
    px(ctx, lx + 8, ly + 7, 2, 3, '#604932');
    if (active) {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(lx + 9, ly + 7, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  if (opened) {
    // Rayons fins de lumière dans le coffre ouvert.
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = 'rgba(255,233,168,0.35)';
      ctx.beginPath();
      ctx.moveTo(w / 2, h / 2);
      ctx.lineTo(w / 2 + Math.cos(i * 0.9) * 66, h / 2 - 32 + Math.sin(i * 0.9) * 44);
      ctx.lineTo(w / 2 + Math.cos(i * 0.9 + 0.12) * 66, h / 2 - 32 + Math.sin(i * 0.9 + 0.12) * 44);
      ctx.closePath();
      ctx.fill();
    }
  }
}
