/** Décor procédural de la pièce du chalet, en pixels nets. */
const px = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};

function drawWindow(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Encadrement massif en bois et vitre qui montre la forêt de nuit.
  px(ctx, x - 10, y - 10, 200, 162, '#57382f');
  px(ctx, x - 5, y - 5, 190, 152, '#a96745');
  px(ctx, x, y, 180, 142, '#3b3549');
  px(ctx, x + 5, y + 5, 170, 132, '#28435b');
  px(ctx, x + 8, y + 8, 164, 52, '#244c71');
  px(ctx, x + 8, y + 11, 164, 15, '#376a91');
  px(ctx, x + 18, y + 19, 4, 4, '#f7dfae');
  px(ctx, x + 116, y + 14, 3, 3, '#fff3d1');
  px(ctx, x + 143, y + 30, 4, 4, '#dce9f5');
  // Collines enneigées et sapins en silhouettes étagées.
  px(ctx, x + 8, y + 56, 164, 20, '#527492');
  px(ctx, x + 8, y + 64, 164, 22, '#6e91ad');
  px(ctx, x + 8, y + 77, 164, 10, '#edf6ff');
  for (let i = 0; i < 5; i++) {
    const treeX = x + 18 + i * 34;
    const base = y + 92 + (i % 2) * 8;
    px(ctx, treeX + 8, base - 10, 5, 20, '#604334');
    for (let tier = 0; tier < 3; tier++) {
      const tw = 13 + tier * 9;
      px(ctx, treeX + 10 - tw / 2, base - 24 + tier * 10, tw, 12, tier % 2 ? '#1b5847' : '#24674d');
      px(ctx, treeX + 10 - tw / 2 + 2, base - 24 + tier * 10, tw - 4, 2, '#e9f5ff');
    }
  }
  px(ctx, x + 8, y + 112, 164, 25, '#f2f7fb');
  px(ctx, x + 8, y + 112, 164, 3, '#ffffff');
  // Quelques flocons immobiles donnent de la profondeur dehors.
  for (let i = 0; i < 9; i++) {
    const flakeX = x + 15 + (i * 37) % 150;
    const flakeY = y + 31 + (i * 23) % 73;
    px(ctx, flakeX, flakeY, 3, 3, i % 2 ? '#f9fcff' : '#cfe4f4');
  }
  // Flocons en papier accrochés à la vitre.
  for (const [dx, dy] of [[29, 29], [137, 35]] as const) {
    px(ctx, x + dx, y + dy - 6, 3, 15, '#f6fcff');
    px(ctx, x + dx - 6, y + dy, 15, 3, '#f6fcff');
    px(ctx, x + dx - 4, y + dy - 4, 3, 3, '#cbe8f4');
    px(ctx, x + dx + 4, y + dy + 4, 3, 3, '#cbe8f4');
    px(ctx, x + dx + 4, y + dy - 4, 3, 3, '#cbe8f4');
    px(ctx, x + dx - 4, y + dy + 4, 3, 3, '#cbe8f4');
  }
  // Meneaux, rideaux et rebord lumineux.
  px(ctx, x + 5, y + 67, 170, 7, '#523b37');
  px(ctx, x + 85, y + 5, 9, 132, '#523b37');
  px(ctx, x - 13, y - 8, 15, 156, '#a84a54');
  px(ctx, x + 178, y - 8, 15, 156, '#a84a54');
  px(ctx, x - 10, y - 9, 200, 8, '#f5e1bd');
  px(ctx, x - 22, y - 16, 216, 14, '#f2d9ac');
  px(ctx, x - 18, y + 142, 208, 9, '#8a533a');
  px(ctx, x - 16, y + 142, 204, 4, '#fff1d2');
  px(ctx, x + 16, y + 36, 3, 32, '#ca6d70');
  px(ctx, x + 162, y + 36, 3, 32, '#ca6d70');
  // Bougies et petites branches de houx sur le rebord de la fenêtre.
  for (const candleX of [x + 25, x + 144]) {
    px(ctx, candleX - 4, y + 138, 16, 4, '#825038');
    px(ctx, candleX, y + 120, 8, 18, '#fff0cb');
    px(ctx, candleX + 2, y + 123, 2, 12, '#dcbf92');
    px(ctx, candleX + 3, y + 114, 3, 6, '#ffca60');
    px(ctx, candleX + 4, y + 115, 2, 3, '#fff6c6');
  }
  px(ctx, x + 72, y + 136, 36, 5, '#347b52');
  px(ctx, x + 80, y + 132, 8, 5, '#c94a55');
  px(ctx, x + 93, y + 133, 7, 5, '#d85b5d');
  // Petits festons de houx sous le rebord, avec rubans et baies.
  for (let i = 0; i < 13; i++) {
    const dx = 5 + i * 13;
    const dip = Math.round(Math.sin((i % 6) / 6 * Math.PI) * 5);
    px(ctx, x + dx, y + 149 + dip, 14, 5, i % 2 ? '#27694a' : '#3d8153');
    if (i % 3 === 0) px(ctx, x + dx + 4, y + 151 + dip, 4, 4, '#db5a61');
  }
  for (const bowX of [x + 34, x + 145]) {
    px(ctx, bowX - 7, y + 150, 6, 6, '#bb4854');
    px(ctx, bowX + 1, y + 150, 6, 6, '#bb4854');
    px(ctx, bowX - 1, y + 151, 3, 5, '#f6d49b');
  }
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, baseY: number) {
  ctx.fillStyle = 'rgba(33, 28, 39, 0.34)';
  ctx.beginPath(); ctx.ellipse(x, baseY + 3, 112, 18, 0, 0, Math.PI * 2); ctx.fill();
  // Un pied et une jupe de sapin donnent de la profondeur sous les cadeaux.
  px(ctx, x - 11, baseY - 25, 22, 29, '#75502f');
  px(ctx, x - 5, baseY - 24, 5, 23, '#b17a49');
  px(ctx, x - 49, baseY - 4, 98, 13, '#863b46');
  px(ctx, x - 40, baseY - 1, 80, 5, '#d3a15f');
  const tiers = [
    { y: baseY - 225, width: 42 },
    { y: baseY - 196, width: 67 },
    { y: baseY - 164, width: 92 },
    { y: baseY - 132, width: 118 },
    { y: baseY - 100, width: 144 },
    { y: baseY - 68, width: 170 },
  ];
  for (const [index, tier] of tiers.entries()) {
    const steps = 8;
    for (let step = 0; step <= steps; step++) {
      const width = Math.max(8, tier.width * (step / steps));
      const rowY = tier.y + step * 5;
      px(ctx, x - width / 2 - 2, rowY + 3, width + 4, 6, '#123f36');
      px(ctx, x - width / 2, rowY, width, 6, index % 2 ? '#1d6047' : '#246b4c');
      if (step > 2) {
        px(ctx, x - width / 2 + 3, rowY + 1, Math.max(4, width * 0.30), 2, '#39865b');
        px(ctx, x + width / 4, rowY + 2, Math.max(3, width * 0.18), 2, '#317b53');
      }
    }
    // Quelques petits amas de neige, sans masquer les branches.
    px(ctx, x - tier.width * 0.39, tier.y + 33, tier.width * 0.24, 3, '#d7e9e5');
    px(ctx, x + tier.width * 0.16, tier.y + 38, tier.width * 0.22, 3, '#f2f7ed');
  }
  // Étoile dorée en pixels et halo discret.
  ctx.fillStyle = 'rgba(255, 209, 102, 0.22)';
  ctx.beginPath(); ctx.arc(x, baseY - 232, 25, 0, Math.PI * 2); ctx.fill();
  px(ctx, x - 3, baseY - 245, 6, 25, '#ffc857');
  px(ctx, x - 12, baseY - 238, 24, 7, '#ffc857');
  px(ctx, x - 8, baseY - 242, 16, 15, '#ffdc75');
  px(ctx, x - 4, baseY - 239, 8, 9, '#fff4bf');

  const ornaments: [number, number, string][] = [
    [-9, -196, '#e67a89'], [-22, -164, '#ffd166'], [18, -158, '#80cbf4'],
    [-35, -128, '#d66e8b'], [4, -132, '#f5cf78'], [32, -120, '#c7a2e6'],
    [-45, -94, '#8ac4eb'], [-12, -98, '#dc7784'], [25, -88, '#f6c76c'],
    [-58, -57, '#d9758a'], [-26, -61, '#f3d181'], [14, -54, '#90d5bc'], [48, -51, '#b9a0e3'],
    [-65, -25, '#f3d181'], [-38, -28, '#91cbea'], [2, -24, '#e57d8f'], [39, -22, '#f5ce7c'], [65, -26, '#80cfb1'],
  ];
  for (const [dx, dy, color] of ornaments) {
    px(ctx, x + dx + 3, baseY + dy - 3, 3, 4, '#e0bd79');
    px(ctx, x + dx + 1, baseY + dy, 7, 9, color);
    px(ctx, x + dx, baseY + dy + 2, 9, 5, color);
    px(ctx, x + dx + 2, baseY + dy + 2, 3, 3, '#fff9e6');
  }
  // Cannes en sucre accrochées à différentes branches.
  for (const [dx, dy] of [[-25, -151], [25, -111], [-43, -67]] as const) {
    px(ctx, x + dx + 2, baseY + dy, 4, 15, '#fff2db');
    px(ctx, x + dx - 3, baseY + dy, 6, 4, '#fff2db');
    px(ctx, x + dx - 4, baseY + dy + 3, 4, 4, '#fff2db');
    px(ctx, x + dx + 2, baseY + dy + 4, 4, 3, '#d75e62');
    px(ctx, x + dx + 2, baseY + dy + 10, 4, 3, '#d75e62');
  }
  // Les guirlandes suivent la forme des branches en petites courbes dorées.
  for (const [dy, halfWidth] of [[-174, 22], [-140, 35], [-106, 48], [-72, 61], [-39, 73]] as const) {
    for (let dx = -halfWidth; dx <= halfWidth; dx += 6) {
      const drape = Math.round((1 - Math.abs(dx) / halfWidth) * 8);
      px(ctx, x + dx, baseY + dy + drape, 7, 2, '#e5bf6e');
      if ((dx + halfWidth) % 18 === 0) px(ctx, x + dx + 2, baseY + dy + drape - 1, 3, 4, '#fff0b1');
    }
  }
}

function drawGift(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  px(ctx, x - 3, y + 38, 52, 7, '#342730');
  px(ctx, x, y, 46, 38, color);
  px(ctx, x + 2, y + 2, 42, 3, 'rgba(255, 255, 255, 0.25)');
  px(ctx, x + 3, y + 6, 3, 27, 'rgba(255, 255, 255, 0.16)');
  px(ctx, x + 20, y, 6, 38, '#f7e2a4');
  px(ctx, x, y + 16, 46, 6, '#f7e2a4');
  px(ctx, x + 11, y - 8, 10, 8, '#f7e2a4');
  px(ctx, x + 25, y - 8, 10, 8, '#f7e2a4');
  px(ctx, x + 17, y - 3, 12, 5, '#ffe9ad');
  px(ctx, x - 3, y + 38, 52, 5, '#412b31');
}

function drawSmallGift(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  px(ctx, x - 2, y + 21, 31, 4, '#4c3030');
  px(ctx, x, y, 27, 21, color);
  px(ctx, x + 2, y + 2, 23, 2, '#f7dbab');
  px(ctx, x + 11, y, 5, 21, '#f6dc9d');
  px(ctx, x, y + 8, 27, 4, '#f6dc9d');
  px(ctx, x + 5, y - 4, 7, 4, '#ffe9b6');
  px(ctx, x + 15, y - 4, 7, 4, '#ffe9b6');
}

function drawHangingBells(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x - 1, y - 13, 2, 15, '#dbb977');
  px(ctx, x - 9, y, 7, 6, '#b9484f');
  px(ctx, x + 2, y, 7, 6, '#b9484f');
  px(ctx, x - 2, y + 1, 4, 5, '#f1d294');
  for (const offset of [-9, 2]) {
    px(ctx, x + offset + 2, y + 7, 6, 5, '#f4d17a');
    px(ctx, x + offset, y + 12, 10, 7, '#e6b65d');
    px(ctx, x + offset - 1, y + 18, 12, 3, '#ffe5a2');
    px(ctx, x + offset + 4, y + 21, 3, 3, '#c77c44');
  }
}

function drawHangingStar(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x - 1, y - 20, 2, 17, '#e2c48a');
  px(ctx, x - 3, y - 10, 6, 20, '#e7b857');
  px(ctx, x - 10, y - 3, 20, 6, '#e7b857');
  px(ctx, x - 6, y - 6, 12, 12, '#f4d886');
  px(ctx, x - 3, y - 3, 6, 6, '#fff2bf');
}

function drawNutcracker(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Petit casse-noisette de Noël posé contre le mur.
  px(ctx, x + 4, y + 58, 31, 7, '#59392f');
  px(ctx, x + 8, y + 45, 9, 14, '#33364b');
  px(ctx, x + 23, y + 45, 9, 14, '#33364b');
  px(ctx, x + 8, y + 28, 24, 19, '#b94c51');
  px(ctx, x + 5, y + 29, 5, 18, '#e8bd79');
  px(ctx, x + 32, y + 29, 5, 18, '#e8bd79');
  px(ctx, x + 10, y + 32, 20, 3, '#f3d68d');
  px(ctx, x + 10, y + 38, 20, 3, '#f3d68d');
  px(ctx, x + 13, y + 14, 14, 14, '#e4ba91');
  px(ctx, x + 10, y + 17, 4, 12, '#f1e2ca');
  px(ctx, x + 26, y + 17, 4, 12, '#f1e2ca');
  px(ctx, x + 15, y + 19, 2, 2, '#40343a');
  px(ctx, x + 23, y + 19, 2, 2, '#40343a');
  px(ctx, x + 13, y + 8, 14, 7, '#35465a');
  px(ctx, x + 10, y + 13, 20, 3, '#e8be78');
  px(ctx, x + 17, y + 8, 5, 4, '#e8be78');
}

function drawLantern(ctx: CanvasRenderingContext2D, x: number, y: number) {
  px(ctx, x + 6, y - 4, 10, 4, '#855c3e');
  px(ctx, x + 2, y, 18, 4, '#b78b5b');
  px(ctx, x, y + 4, 22, 28, '#6d4936');
  px(ctx, x + 4, y + 8, 14, 20, '#f4c66d');
  px(ctx, x + 9, y + 10, 5, 15, '#fff1b1');
  px(ctx, x - 2, y + 31, 26, 5, '#9d7047');
  px(ctx, x + 5, y + 35, 12, 3, '#583a30');
}

function drawToyTrain(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Petit train de bois placé devant les cadeaux.
  px(ctx, x, y + 23, 125, 3, '#604033');
  px(ctx, x + 5, y + 9, 29, 13, '#b54b50');
  px(ctx, x + 17, y + 2, 15, 10, '#c96858');
  px(ctx, x + 21, y + 5, 7, 5, '#f4d99f');
  px(ctx, x + 6, y + 4, 5, 7, '#6c4a3b');
  px(ctx, x + 38, y + 12, 24, 10, '#477a66');
  px(ctx, x + 66, y + 12, 24, 10, '#ca9760');
  px(ctx, x + 94, y + 12, 24, 10, '#4b7291');
  px(ctx, x + 42, y + 6, 8, 7, '#f0ce8d');
  px(ctx, x + 72, y + 6, 8, 7, '#d56d72');
  px(ctx, x + 100, y + 6, 8, 7, '#efdbab');
  for (const wheelX of [10, 27, 43, 56, 71, 84, 99, 112]) {
    px(ctx, x + wheelX, y + 20, 6, 6, '#493b39');
    px(ctx, x + wheelX + 2, y + 22, 2, 2, '#e8c895');
  }
}

function drawArmchair(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Fauteuil à carreaux, près du sapin, avec accoudoirs et coussin brodé.
  px(ctx, x - 4, y + 96, 108, 12, '#3e2b2e');
  px(ctx, x + 9, y + 87, 15, 20, '#604033');
  px(ctx, x + 77, y + 87, 15, 20, '#604033');
  px(ctx, x + 9, y, 82, 78, '#633244');
  px(ctx, x + 15, y + 6, 70, 67, '#a44d50');
  px(ctx, x + 20, y + 11, 60, 47, '#bb6260');
  for (const stripeX of [x + 27, x + 48, x + 69]) px(ctx, stripeX, y + 11, 3, 47, '#d99976');
  for (const stripeY of [y + 23, y + 40]) px(ctx, x + 20, stripeY, 60, 3, '#d99976');
  px(ctx, x + 7, y + 60, 86, 32, '#783943');
  px(ctx, x + 13, y + 62, 74, 21, '#bc6a5c');
  px(ctx, x + 2, y + 46, 18, 47, '#713744');
  px(ctx, x + 5, y + 47, 12, 6, '#d48a71');
  px(ctx, x + 80, y + 46, 18, 47, '#713744');
  px(ctx, x + 83, y + 47, 12, 6, '#d48a71');
  px(ctx, x + 34, y + 34, 31, 24, '#e7c995');
  px(ctx, x + 38, y + 37, 23, 18, '#f5dfb5');
  px(ctx, x + 47, y + 39, 5, 14, '#b74f58');
  px(ctx, x + 42, y + 44, 15, 5, '#b74f58');
  // Plaid de Noël plié sur l'accoudoir.
  px(ctx, x + 72, y + 52, 20, 34, '#356b55');
  px(ctx, x + 75, y + 55, 14, 27, '#5a8d6a');
  px(ctx, x + 80, y + 55, 3, 27, '#e5cf9c');
  px(ctx, x + 75, y + 66, 14, 3, '#e5cf9c');
  for (let fringe = 0; fringe < 3; fringe++) px(ctx, x + 75 + fringe * 6, y + 82, 3, 5, '#e5cf9c');
}

function drawFirewoodBasket(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Panier à bûches tressé au pied de la cheminée.
  px(ctx, x + 3, y + 13, 21, 33, '#76503b');
  px(ctx, x + 6, y + 8, 13, 33, '#a8794c');
  px(ctx, x + 22, y + 4, 19, 38, '#694431');
  px(ctx, x + 25, y, 12, 33, '#bc8c5b');
  px(ctx, x + 40, y + 14, 19, 30, '#704934');
  px(ctx, x + 43, y + 10, 13, 27, '#b18350');
  px(ctx, x, y + 30, 64, 31, '#6d4532');
  px(ctx, x + 4, y + 34, 56, 22, '#ae7650');
  for (let offset = 0; offset < 4; offset++) {
    px(ctx, x + 7, y + 37 + offset * 5, 50, 2, '#d4a36b');
  }
  for (let offset = 0; offset < 6; offset++) {
    px(ctx, x + 9 + offset * 8, y + 34, 2, 21, '#86583a');
  }
  px(ctx, x - 2, y + 28, 68, 5, '#d2a273');
  px(ctx, x + 5, y + 59, 54, 4, '#54392f');
}

function drawWinterPicture(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Petit paysage hivernal encadré, entre le foyer et la fenêtre.
  px(ctx, x - 4, y - 4, 92, 74, '#704936');
  px(ctx, x, y, 84, 66, '#e8c697');
  px(ctx, x + 4, y + 4, 76, 58, '#456782');
  px(ctx, x + 8, y + 8, 68, 22, '#7399b1');
  px(ctx, x + 56, y + 11, 8, 8, '#fff1c8');
  px(ctx, x + 8, y + 30, 68, 27, '#e9f2ed');
  for (const [dx, h] of [[13, 26], [31, 34], [51, 23], [65, 29]] as const) {
    px(ctx, x + dx, y + 51 - h, 5, h, '#335f50');
    px(ctx, x + dx - 5, y + 43 - h / 2, 15, 8, '#387b5b');
    px(ctx, x + dx - 8, y + 50 - h / 2, 21, 8, '#286c50');
    px(ctx, x + dx - 5, y + 43 - h / 2, 15, 2, '#dceee7');
  }
  px(ctx, x + 4, y + 56, 76, 6, '#f9f7e8');
  px(ctx, x - 4, y - 4, 92, 3, '#f2d9ad');
}

function drawTreatShelf(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Chocolat chaud, biscuit en pain d'épices et petit bocal sur une étagère.
  px(ctx, x - 3, y, 110, 9, '#694331');
  px(ctx, x, y, 104, 3, '#c38b58');
  px(ctx, x + 8, y - 19, 20, 17, '#e8d4b3');
  px(ctx, x + 10, y - 15, 16, 11, '#b95252');
  px(ctx, x + 26, y - 15, 6, 9, '#f4dfba');
  px(ctx, x + 28, y - 13, 3, 5, '#8d5b40');
  px(ctx, x + 15, y - 18, 7, 2, '#f6e2b5');
  // Biscuit souriant et glaçage.
  px(ctx, x + 47, y - 29, 13, 11, '#b67846');
  px(ctx, x + 44, y - 19, 19, 12, '#c78a52');
  px(ctx, x + 40, y - 16, 6, 5, '#c78a52');
  px(ctx, x + 62, y - 16, 6, 5, '#c78a52');
  px(ctx, x + 45, y - 8, 6, 7, '#c78a52');
  px(ctx, x + 56, y - 8, 6, 7, '#c78a52');
  px(ctx, x + 50, y - 25, 2, 2, '#fff3d5');
  px(ctx, x + 56, y - 25, 2, 2, '#fff3d5');
  px(ctx, x + 50, y - 15, 7, 2, '#fff3d5');
  px(ctx, x + 79, y - 23, 17, 21, '#c8e2dd');
  px(ctx, x + 81, y - 18, 13, 14, '#ebd8a9');
  px(ctx, x + 78, y - 26, 19, 4, '#9c6442');
  px(ctx, x + 83, y - 15, 4, 3, '#b97b51');
  px(ctx, x + 89, y - 10, 3, 3, '#b97b51');
}

function drawSnowGlobe(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Boule à neige sur le manteau, avec son petit sapin à l'intérieur.
  px(ctx, x + 8, y, 20, 3, '#eaf6f1');
  px(ctx, x + 4, y + 3, 28, 6, '#a9d8db');
  px(ctx, x + 1, y + 9, 34, 15, '#b8e1df');
  px(ctx, x + 4, y + 24, 28, 5, '#d9efdf');
  px(ctx, x + 8, y + 22, 20, 5, '#f7fbec');
  px(ctx, x + 16, y + 8, 4, 16, '#2c7650');
  px(ctx, x + 12, y + 15, 12, 7, '#398a58');
  px(ctx, x + 14, y + 11, 8, 5, '#398a58');
  px(ctx, x + 7, y + 7, 3, 3, '#fffcef');
  px(ctx, x + 27, y + 12, 3, 3, '#fffcef');
  px(ctx, x + 8, y + 28, 20, 4, '#6b4839');
  px(ctx, x + 4, y + 31, 28, 5, '#ba8a54');
  px(ctx, x + 7, y + 32, 22, 2, '#f0cb83');
}

function drawFireplaceTools(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Pelle et tisonnier en laiton, rangés sur un socle près du foyer.
  px(ctx, x + 7, y, 4, 66, '#886143');
  px(ctx, x + 5, y + 3, 8, 5, '#dfb76d');
  px(ctx, x + 1, y + 62, 28, 5, '#704d39');
  px(ctx, x + 15, y + 14, 3, 39, '#e1bd78');
  px(ctx, x + 13, y + 53, 8, 9, '#b88a51');
  px(ctx, x + 23, y + 14, 3, 47, '#e1bd78');
  px(ctx, x + 21, y + 57, 7, 4, '#b88a51');
}

/** Dessine murs, parquet, fenêtres, cheminée, guirlandes, cadeaux et sapin. */
export function paintChaletInterior(ctx: CanvasRenderingContext2D): void {
  px(ctx, 0, 0, 1280, 720, '#302638');
  // Plafond sombre en retrait; le lambris clair donne à la pièce son halo chaud.
  px(ctx, 46, 34, 1188, 432, '#593b36');
  px(ctx, 56, 44, 1168, 416, '#e7c997');
  px(ctx, 56, 44, 1168, 18, '#f5dfb4');
  px(ctx, 56, 62, 1168, 266, '#f0d7a9');
  for (let x = 80; x < 1210; x += 72) {
    px(ctx, x, 62, 8, 382, '#b87c50');
    px(ctx, x + 2, 62, 2, 382, '#d99f68');
    px(ctx, x + 10, 62, 2, 382, '#f5dfb4');
  }
  // Lignes de bois horizontales, alternance de lumière et de grain.
  for (let row = 0; row < 6; row++) {
    const lineY = 91 + row * 38;
    px(ctx, 66, lineY, 1148, 2, row % 2 ? '#d4ad7d' : '#fae6bd');
    for (let knot = 0; knot < 7; knot++) {
      const knotX = 90 + ((row * 127 + knot * 163) % 1080);
      px(ctx, knotX, lineY + 8, 18 + ((knot + row) % 3) * 7, 2, 'rgba(131, 85, 54, 0.14)');
    }
  }
  // Lambris bas et moulure sculptée tout autour de la salle.
  px(ctx, 56, 328, 1168, 104, '#aa704a');
  for (let x = 66; x < 1215; x += 42) {
    px(ctx, x, 342, 3, 79, '#d49460');
    px(ctx, x + 5, 342, 2, 79, '#87523e');
  }
  px(ctx, 56, 324, 1168, 10, '#f6dfb5');
  px(ctx, 56, 331, 1168, 3, '#80513f');
  px(ctx, 56, 432, 1168, 28, '#653e37');
  px(ctx, 56, 432, 1168, 7, '#f8e6c2');
  px(ctx, 56, 452, 1168, 8, '#3f2a30');

  // Parquet en larges lames avec reflets doux, nœuds et joints alternés.
  px(ctx, 0, 460, 1280, 260, '#895239');
  for (let row = 0; row < 9; row++) {
    const plankY = 462 + row * 30;
    px(ctx, 0, plankY, 1280, 2, '#c17d4e');
    px(ctx, 0, plankY + 3, 1280, 1, '#704535');
    const offset = row % 2 ? 70 : 0;
    for (let x = offset; x < 1280; x += 140) {
      px(ctx, x, plankY, 2, 30, '#5b3931');
      px(ctx, x + 3, plankY + 4, 1, 20, 'rgba(255, 220, 163, 0.18)');
    }
    for (let plank = 0; plank < 6; plank++) {
      const grainX = offset + 12 + plank * 140;
      px(ctx, grainX, plankY + 11 + (plank % 3) * 4, 32 + (plank % 2) * 15, 2, 'rgba(244, 190, 131, 0.22)');
    }
  }

  drawWindow(ctx, 118, 132);
  drawWindow(ctx, 982, 132);
  drawWinterPicture(ctx, 846, 148);

  // Cheminée en blocs de pierre, avec foyer plus lumineux et manteau en bois.
  px(ctx, 464, 156, 352, 278, '#775a4d');
  px(ctx, 474, 164, 332, 264, '#c4a17c');
  const stonePalette = ['#d3b48c', '#b89069', '#c8a47b', '#a98262'];
  for (let row = 0; row < 7; row++) {
    const stoneY = 173 + row * 34;
    px(ctx, 479, stoneY, 322, 3, '#927158');
    const offset = row % 2 ? 24 : 0;
    for (let col = 0; col < 9; col++) {
      const stoneX = 480 + offset + col * 36;
      if (stoneX > 794) continue;
      const stoneW = Math.min(33, 800 - stoneX);
      px(ctx, stoneX, stoneY + 5, stoneW, 22, stonePalette[(row * 3 + col) % stonePalette.length]);
      px(ctx, stoneX + 2, stoneY + 6, Math.max(1, stoneW - 5), 3, 'rgba(255, 245, 220, 0.22)');
      px(ctx, stoneX + stoneW - 3, stoneY + 9, 2, 13, 'rgba(89, 62, 50, 0.22)');
    }
  }
  // Foyer encastré; les bords de pierre forment une ouverture en arche.
  px(ctx, 496, 254, 288, 160, '#493637');
  px(ctx, 506, 262, 268, 146, '#291f2b');
  px(ctx, 522, 274, 236, 126, '#201c2b');
  px(ctx, 510, 386, 260, 22, '#6c4537');
  px(ctx, 532, 373, 216, 18, '#754730');
  px(ctx, 548, 368, 178, 7, '#a86a3b');
  // Reflet chaud sur les braises et les flammes en trois couleurs.
  const fireGlow = ctx.createRadialGradient(640, 362, 8, 640, 362, 138);
  fireGlow.addColorStop(0, 'rgba(255, 170, 70, 0.42)');
  fireGlow.addColorStop(1, 'rgba(255, 105, 43, 0)');
  ctx.fillStyle = fireGlow; ctx.fillRect(520, 282, 240, 118);
  // Flammes étagées, dessinées par blocs irréguliers comme le reste du décor.
  px(ctx, 546, 370, 188, 28, '#b84532');
  px(ctx, 555, 356, 54, 40, '#dc5d32');
  px(ctx, 565, 341, 28, 50, '#e87331');
  px(ctx, 580, 332, 17, 28, '#f28d38');
  px(ctx, 597, 349, 38, 45, '#f18a32');
  px(ctx, 605, 330, 34, 59, '#f5a63c');
  px(ctx, 614, 315, 22, 39, '#ffc250');
  px(ctx, 620, 302, 10, 25, '#ffd66b');
  px(ctx, 640, 352, 44, 43, '#e96b31');
  px(ctx, 653, 337, 25, 54, '#f59136');
  px(ctx, 662, 328, 10, 25, '#ffc34e');
  px(ctx, 680, 365, 39, 29, '#e97b33');
  px(ctx, 690, 350, 15, 29, '#f8a541');
  px(ctx, 564, 375, 30, 19, '#ffc958');
  px(ctx, 571, 363, 17, 20, '#ffdb75');
  px(ctx, 607, 366, 42, 26, '#ffd66a');
  px(ctx, 615, 349, 24, 34, '#ffe797');
  px(ctx, 623, 341, 8, 24, '#fff2b8');
  px(ctx, 659, 373, 30, 19, '#ffd05d');
  px(ctx, 667, 361, 15, 21, '#ffdf80');
  px(ctx, 578, 322, 4, 6, '#ffd074');
  px(ctx, 673, 315, 4, 5, '#ffb85d');
  px(ctx, 704, 338, 4, 5, '#ffd074');
  // Bûches visibles au premier plan.
  px(ctx, 552, 397, 77, 10, '#49312f');
  px(ctx, 650, 395, 68, 10, '#503331');
  px(ctx, 571, 400, 18, 5, '#a96b40');
  px(ctx, 678, 398, 16, 5, '#a96b40');
  // Manteau épais, moulure claire et guirlande de sapin.
  px(ctx, 450, 242, 380, 22, '#634137');
  px(ctx, 455, 244, 370, 5, '#986143');
  px(ctx, 438, 232, 404, 12, '#f2d4a7');
  px(ctx, 452, 222, 376, 8, '#fff0cd');
  px(ctx, 500, 225, 276, 5, '#28664a');
  for (let i = 0; i < 11; i++) {
    const lx = 507 + i * 25;
    px(ctx, lx, 227 + (i % 2) * 3, 8, 6, ['#e27078', '#ffd166', '#7fc98b'][i % 3]);
  }
  // Branches de sapin et baies rouges sur le rebord de la cheminée.
  for (let i = 0; i < 17; i++) {
    const leafX = 474 + i * 20;
    px(ctx, leafX, 243 + (i % 2) * 3, 18, 6, i % 2 ? '#276447' : '#367c50');
    px(ctx, leafX + 5, 239 + (i % 2) * 3, 8, 5, '#4f925e');
    if (i % 3 === 0) px(ctx, leafX + 9, 244, 5, 5, '#d65861');
  }
  // Horloge et couronne au-dessus du manteau.
  px(ctx, 618, 175, 44, 38, '#774933');
  px(ctx, 623, 179, 34, 29, '#f4dfb5');
  px(ctx, 630, 186, 20, 16, '#fff4d6');
  px(ctx, 639, 188, 2, 8, '#653c31');
  px(ctx, 639, 194, 7, 2, '#653c31');
  px(ctx, 610, 174, 60, 5, '#8e5b3b');
  drawSnowGlobe(ctx, 724, 186);

  // chaussettes et petits cadeaux sur le manteau
  for (const [x, color] of [[520, '#e2709a'], [586, '#6cc6ff'], [718, '#8e6ad6']] as const) {
    px(ctx, x, 264, 22, 48, color);
    px(ctx, x - 3, 260, 28, 10, '#fff5df');
    px(ctx, x + 9, 302, 18, 10, color);
    px(ctx, x + 3, 274, 16, 3, '#fff0d4');
    px(ctx, x + 4, 282, 3, 3, '#ffe6ba');
    px(ctx, x + 12, 290, 3, 3, '#ffe6ba');
    px(ctx, x + 12, 305, 12, 3, '#fff0d4');
  }

  // étagère, livres, couronne
  px(ctx, 858, 302, 86, 8, '#75502f');
  px(ctx, 858, 300, 86, 3, '#bd8351');
  for (const [x, color, height] of [[864, '#c8384f', 28], [880, '#3f6bb5', 34], [898, '#e8b83f', 24], [914, '#4a9c6d', 32]] as const) {
    px(ctx, x, 302 - height, 12, height, color);
    px(ctx, x + 2, 306 - height, 3, height - 8, '#f7e3bd');
    px(ctx, x + 8, 306 - height, 2, height - 9, 'rgba(43, 38, 46, 0.24)');
  }
  // Appliques en laiton de part et d'autre du foyer.
  for (const lampX of [388, 896]) {
    px(ctx, lampX + 7, 255, 4, 34, '#77503b');
    px(ctx, lampX, 253, 18, 5, '#5d3f38');
    px(ctx, lampX + 2, 260, 14, 23, '#8b503e');
    px(ctx, lampX + 5, 263, 8, 16, '#ffd166');
    px(ctx, lampX + 7, 265, 3, 11, '#fff0b6');
    ctx.fillStyle = 'rgba(255, 209, 102, 0.14)';
    ctx.fillRect(lampX - 10, 250, 38, 42);
  }
  // Couronne de bienvenue en feuillage, placée entre la fenêtre et le foyer.
  const wreathX = 384;
  const wreathY = 175;
  for (let i = 0; i < 16; i++) {
    const angle = i * Math.PI / 8;
    const leafX = wreathX + Math.round(Math.cos(angle) * 25);
    const leafY = wreathY + Math.round(Math.sin(angle) * 25);
    px(ctx, leafX - 6, leafY - 6, 12, 12, i % 2 ? '#1c6247' : '#2f8054');
    px(ctx, leafX - 3, leafY - 4, 4, 4, '#6ca569');
  }
  for (const [dx, dy] of [[-21, -8], [18, -13], [-17, 19], [21, 15]] as const) {
    px(ctx, wreathX + dx, wreathY + dy, 5, 5, '#d95361');
    px(ctx, wreathX + dx + 1, wreathY + dy + 1, 2, 2, '#ffd4b6');
  }
  px(ctx, wreathX - 10, wreathY + 19, 8, 8, '#ba4252');
  px(ctx, wreathX + 2, wreathY + 19, 8, 8, '#ba4252');
  px(ctx, wreathX - 3, wreathY + 20, 6, 7, '#f0c377');
  drawTreatShelf(ctx, 326, 319);
  drawFireplaceTools(ctx, 425, 363);
  drawNutcracker(ctx, 75, 365);
  drawLantern(ctx, 821, 395);
  // Guirlande de branches en festons sous les lumières du plafond.
  for (let span = 0; span < 8; span++) {
    for (let step = 0; step <= 10; step++) {
      const branchX = 140 + span * 125 + step * 12;
      const branchY = 70 + Math.round(Math.sin((step / 10) * Math.PI) * 12);
      px(ctx, branchX, branchY, 15, 6, step % 2 ? '#245d45' : '#327650');
      px(ctx, branchX + 4, branchY - 2, 7, 4, '#4a8b59');
      if (step === 3 || step === 8) px(ctx, branchX + 8, branchY + 3, 4, 4, '#d45a60');
    }
  }
  // Grande guirlande lumineuse qui traverse le haut de la pièce.
  px(ctx, 140, 74, 1000, 5, '#1f7250');
  for (let i = 0; i < 20; i++) {
    const x = 158 + i * 50;
    const y = 78 + (i % 2) * 7;
    ctx.fillStyle = 'rgba(255, 209, 102, 0.12)';
    ctx.beginPath(); ctx.arc(x + 4, y + 6, 15, 0, Math.PI * 2); ctx.fill();
    px(ctx, x + 1, y, 8, 12, ['#ff7184', '#ffd166', '#7ae582', '#6cc6ff', '#c99bff'][i % 5]);
    px(ctx, x + 3, y + 2, 3, 3, '#fff5df');
  }
  for (const bowX of [350, 835]) {
    px(ctx, bowX - 11, 73, 9, 9, '#b94c50');
    px(ctx, bowX + 2, 73, 9, 9, '#b94c50');
    px(ctx, bowX - 3, 75, 6, 8, '#f2d18b');
    px(ctx, bowX - 7, 83, 4, 11, '#d05c5f');
    px(ctx, bowX + 3, 83, 4, 11, '#d05c5f');
  }
  for (const bellX of [430, 780, 951]) drawHangingBells(ctx, bellX, 105);
  for (const starX of [530, 664, 1081]) drawHangingStar(ctx, starX, 113);

  drawFirewoodBasket(ctx, 850, 391);

  // Commode contre le mur : les portraits de famille reposent sur son plateau.
  px(ctx, 956, 409, 242, 54, '#59382f');
  px(ctx, 963, 415, 228, 42, '#9b5d3d');
  px(ctx, 957, 405, 240, 9, '#d49a66');
  px(ctx, 960, 405, 234, 3, '#f3d4a6');
  for (let i = 0; i < 3; i++) {
    const x = 970 + i * 72;
    px(ctx, x, 421, 63, 29, '#714533');
    px(ctx, x + 3, 424, 57, 23, '#b3754d');
    px(ctx, x + 26, 430, 11, 5, '#efcd89');
  }
  px(ctx, 968, 459, 18, 8, '#54362f');
  px(ctx, 1170, 459, 18, 8, '#54362f');

  // tapis central et le sapin familial couvert de cadeaux
  px(ctx, 376, 494, 520, 166, '#783749');
  px(ctx, 384, 502, 504, 150, '#c16b4e');
  px(ctx, 392, 510, 488, 134, '#e9bc84');
  px(ctx, 400, 518, 472, 118, '#a84b53');
  px(ctx, 408, 526, 456, 102, '#edc78f');
  px(ctx, 416, 534, 440, 86, '#a84b53');
  px(ctx, 430, 544, 412, 66, '#ba5b59');
  for (let i = 0; i < 9; i++) {
    const motifX = 436 + i * 50;
    px(ctx, motifX, 550 + (i % 2) * 24, 8, 8, '#f5dbad');
    px(ctx, motifX + 2, 552 + (i % 2) * 24, 4, 4, '#fff3d2');
  }
  // Bordure tissée du tapis, dans les tons chauds du bois.
  for (let x = 420; x <= 850; x += 20) {
    px(ctx, x, 530, 7, 3, '#f4d8aa');
    px(ctx, x, 626, 7, 3, '#f4d8aa');
  }
  // Petit tapis moelleux pour le coin lecture.
  px(ctx, 77, 567, 98, 43, '#70434b');
  px(ctx, 83, 571, 86, 35, '#d7b98e');
  px(ctx, 89, 576, 74, 25, '#eed7ad');
  for (let x = 92; x < 160; x += 12) {
    px(ctx, x, 580, 5, 3, '#c78373');
    px(ctx, x, 594, 5, 3, '#c78373');
  }
  drawArmchair(ctx, 73, 456);
  drawTree(ctx, 280, 636);
  drawGift(ctx, 180, 596, '#c8384f');
  drawGift(ctx, 326, 610, '#3f6bb5');
  drawGift(ctx, 198, 548, '#e8b83f');
  drawSmallGift(ctx, 239, 612, '#cf6d78');
  drawSmallGift(ctx, 294, 614, '#6da78a');
  drawToyTrain(ctx, 205, 651);

  // Porte de sortie en chêne avec fenêtre givrée, poignée et cadre doré.
  px(ctx, 586, 574, 108, 146, '#51342f');
  px(ctx, 594, 580, 92, 140, '#b27648');
  px(ctx, 600, 586, 80, 134, '#8c5137');
  px(ctx, 607, 595, 66, 42, '#29445e');
  px(ctx, 611, 599, 58, 33, '#779bb4');
  px(ctx, 611, 623, 58, 9, '#eef5f6');
  px(ctx, 632, 595, 8, 42, '#644133');
  px(ctx, 607, 614, 66, 5, '#644133');
  px(ctx, 636, 646, 8, 74, '#644133');
  px(ctx, 663, 650, 8, 8, '#ffe1a0');
  px(ctx, 572, 570, 136, 10, '#f3d8ad');
  px(ctx, 578, 575, 124, 3, '#fff3d5');
  px(ctx, 572, 708, 136, 8, '#643d35');
  // Tapis de bienvenue côté intérieur.
  px(ctx, 582, 676, 116, 34, '#8e3849');
  px(ctx, 589, 682, 102, 22, '#c56a50');
  px(ctx, 599, 688, 82, 3, '#f2c88f');
  px(ctx, 578, 546, 124, 8, '#1f7250');
  for (let i = 0; i < 6; i++) {
    const lightX = 590 + i * 20;
    const lightY = 550 + (i % 2) * 4;
    px(ctx, lightX, lightY, 7, 7, ['#ff7184', '#ffd166', '#6cc6ff'][i % 3]);
    px(ctx, lightX + 2, lightY + 1, 3, 2, '#fff5d8');
  }
}
