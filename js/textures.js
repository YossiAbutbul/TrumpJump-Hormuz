// All graphics drawn procedurally into canvas textures — zero asset files.

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function tex(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const t = scene.textures.createCanvas(key, w, h);
  draw(t.getContext(), w, h);
  t.refresh();
}

function drawTrump(ctx, pose) {
  // chibi cartoon — big head, chubby body, grumpy face. Canvas 72x88.
  const flying = pose === 'fly';
  const ell = (x, y, rx, ry) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  const dot = (x, y, r) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  // short legs + shoes
  ctx.fillStyle = '#232b3e';
  ctx.fillRect(25, 74, 9, 8);
  ctx.fillRect(38, 74, 9, 8);
  ctx.fillStyle = '#14181f';
  rr(ctx, 20, 81, 15, 6, 3); ctx.fill();
  rr(ctx, 37, 81, 15, 6, 3); ctx.fill();

  // chubby suit body
  ctx.fillStyle = '#2b3a5e';
  rr(ctx, 12, 44, 48, 34, 15); ctx.fill();

  // lapels
  ctx.fillStyle = '#22304f';
  ctx.beginPath();
  ctx.moveTo(30, 46); ctx.lineTo(23, 61); ctx.lineTo(30, 58);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(42, 46); ctx.lineTo(49, 61); ctx.lineTo(42, 58);
  ctx.closePath(); ctx.fill();

  // shirt
  ctx.fillStyle = '#f4f4f4';
  ctx.beginPath();
  ctx.moveTo(30, 45); ctx.lineTo(42, 45); ctx.lineTo(36, 60);
  ctx.closePath(); ctx.fill();

  // long red tie
  ctx.fillStyle = '#c92f28';
  ctx.beginPath();
  ctx.moveTo(33, 47); ctx.lineTo(39, 47);
  ctx.lineTo(41, 66); ctx.lineTo(36, 72); ctx.lineTo(31, 66);
  ctx.closePath(); ctx.fill();

  // stubby arms + fists
  ctx.fillStyle = '#2b3a5e';
  if (flying) {
    rr(ctx, 3, 26, 11, 24, 5); ctx.fill();
    rr(ctx, 58, 26, 11, 24, 5); ctx.fill();
    ctx.fillStyle = '#f2a45c';
    dot(8.5, 24, 5.5); dot(63.5, 24, 5.5);
  } else {
    rr(ctx, 4, 50, 11, 24, 5); ctx.fill();
    rr(ctx, 57, 50, 11, 24, 5); ctx.fill();
    ctx.fillStyle = '#f2a45c';
    dot(9.5, 73, 5.5); dot(62.5, 73, 5.5);
  }

  // big jowly head
  ctx.fillStyle = '#f2a45c';
  rr(ctx, 15, 12, 42, 38, 16); ctx.fill();
  // jowl / blush shading
  ctx.fillStyle = 'rgba(216,118,60,0.35)';
  ell(24, 42, 6, 4);
  ell(48, 42, 6, 4);

  // hair — big golden mane with front swoosh
  ctx.fillStyle = '#e2ae32';
  ell(36, 14, 23, 10);
  ctx.fillStyle = '#f7c843';
  ell(36, 9, 21, 8);
  ell(17, 20, 6, 11);
  ell(55, 17, 6, 9);
  ctx.beginPath();
  ctx.moveTo(46, 3);
  ctx.quadraticCurveTo(66, 3, 59, 21);
  ctx.quadraticCurveTo(55, 12, 45, 11);
  ctx.quadraticCurveTo(41, 6, 46, 3);
  ctx.closePath(); ctx.fill();

  // MAGA cap while flying
  if (flying) {
    ctx.fillStyle = '#c92f28';
    ctx.beginPath();
    ctx.moveTo(17, 16);
    ctx.quadraticCurveTo(19, 0, 36, 0);
    ctx.quadraticCurveTo(54, 0, 56, 16);
    ctx.closePath(); ctx.fill();
    rr(ctx, 50, 12, 18, 6, 3); ctx.fill();
    ctx.fillStyle = '#a52420';
    ctx.fillRect(17, 14, 39, 3);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MAGA', 36, 11);
    ctx.textAlign = 'left';
  }

  // angry brows
  ctx.strokeStyle = '#d99e2b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(25, 25); ctx.lineTo(33, 28);
  ctx.moveTo(47, 25); ctx.lineTo(39, 28);
  ctx.stroke();

  // squinty eyes
  ctx.fillStyle = '#fff';
  ctx.fillRect(26, 29, 7, 5);
  ctx.fillRect(39, 29, 7, 5);
  ctx.fillStyle = '#2c3547';
  ctx.fillRect(29, 30, 3, 3);
  ctx.fillRect(40, 30, 3, 3);

  // nose
  ctx.fillStyle = 'rgba(216,118,60,0.65)';
  ell(36, 36, 4.5, 3);

  // mouth — grumpy frown (open shout while flying)
  if (flying) {
    ctx.fillStyle = '#7e2f24';
    ell(36, 45, 5, 4);
  } else {
    ctx.strokeStyle = '#7e2f24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(29, 46);
    ctx.quadraticCurveTo(36, 41, 43, 46);
    ctx.stroke();
  }
}

function buildTextures(scene) {
  // ---- player ----
  tex(scene, 'trump', 72, 88, (ctx) => drawTrump(ctx, 'idle'));
  tex(scene, 'trump-fly', 72, 88, (ctx) => drawTrump(ctx, 'fly'));

  // ---- oil barrels (breakable platform) ----
  tex(scene, 'barrels', 96, 32, (ctx) => {
    for (let i = 0; i < 3; i++) {
      const x = 2 + i * 31;
      ctx.fillStyle = '#c96a2a';
      rr(ctx, x, 6, 28, 25, 3); ctx.fill();
      ctx.fillStyle = '#a4531e';
      ctx.fillRect(x, 12, 28, 3);
      ctx.fillRect(x, 21, 28, 3);
      ctx.fillStyle = '#e08a44';
      ctx.beginPath();
      ctx.ellipse(x + 14, 6, 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // ---- buoy (narrow platform) ----
  tex(scene, 'buoy', 48, 46, (ctx) => {
    ctx.fillStyle = '#e2682c';
    ctx.beginPath();
    ctx.moveTo(24, 4); ctx.lineTo(40, 34); ctx.lineTo(8, 34);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f5f2ea';
    ctx.fillRect(12, 22, 24, 6);
    ctx.fillStyle = '#3a424f';
    rr(ctx, 4, 34, 40, 10, 4); ctx.fill();
    // light
    ctx.fillStyle = '#ffe95e';
    ctx.beginPath();
    ctx.arc(24, 4, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // ---- spring ----
  tex(scene, 'spring', 36, 26, (ctx) => {
    ctx.strokeStyle = '#d8a516';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(8, 24);
    ctx.lineTo(28, 20);
    ctx.lineTo(8, 16);
    ctx.lineTo(28, 12);
    ctx.lineTo(8, 8);
    ctx.stroke();
    ctx.fillStyle = '#c93a35';
    rr(ctx, 2, 0, 32, 7, 3); ctx.fill();
    ctx.fillStyle = '#7c828e';
    rr(ctx, 4, 22, 28, 4, 2); ctx.fill();
  });

  // ---- coin ----
  tex(scene, 'coin', 26, 26, (ctx) => {
    ctx.fillStyle = '#f5c542';
    ctx.beginPath();
    ctx.arc(13, 13, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#946c07';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 13, 14);
  });

  // ---- MAGA cap powerup (jet flight) ----
  tex(scene, 'cap', 40, 30, (ctx) => {
    ctx.fillStyle = '#c92f28';
    ctx.beginPath();
    ctx.moveTo(4, 20);
    ctx.quadraticCurveTo(6, 2, 22, 2);
    ctx.quadraticCurveTo(36, 2, 36, 20);
    ctx.closePath(); ctx.fill();
    // brim
    ctx.fillStyle = '#a52420';
    rr(ctx, 2, 19, 37, 7, 3); ctx.fill();
    // white MAGA text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('MAGA', 21, 15);
  });

  // ---- shield pickup (golden dome) ----
  tex(scene, 'shield', 34, 34, (ctx) => {
    ctx.fillStyle = 'rgba(245,197,66,0.35)';
    ctx.beginPath();
    ctx.arc(17, 17, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f5c542';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(17, 17, 13, 0, Math.PI * 2);
    ctx.stroke();
    // star
    ctx.fillStyle = '#f5c542';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const a2 = a + Math.PI / 5;
      ctx.lineTo(17 + Math.cos(a) * 8, 17 + Math.sin(a) * 8);
      ctx.lineTo(17 + Math.cos(a2) * 3.5, 17 + Math.sin(a2) * 3.5);
    }
    ctx.closePath(); ctx.fill();
  });

  // ---- shield aura around player ----
  tex(scene, 'aura', 96, 96, (ctx) => {
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(245,197,66,${0.5 - i * 0.15})`;
      ctx.lineWidth = 3 - i;
      ctx.beginPath();
      ctx.arc(48, 48, 38 + i * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // ---- drone hazard ----
  tex(scene, 'drone', 60, 30, (ctx) => {
    ctx.fillStyle = '#3a424f';
    rr(ctx, 20, 12, 20, 12, 4); ctx.fill();
    ctx.strokeStyle = '#3a424f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(24, 14); ctx.lineTo(8, 6);
    ctx.moveTo(36, 14); ctx.lineTo(52, 6);
    ctx.stroke();
    ctx.fillStyle = '#7c828e';
    ctx.beginPath();
    ctx.ellipse(8, 5, 8, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(52, 5, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // red light + camera
    ctx.fillStyle = '#e33';
    ctx.beginPath();
    ctx.arc(30, 12, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(30, 25, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // ---- clouds ----
  tex(scene, 'cloud', 110, 50, (ctx) => {
    ctx.fillStyle = 'rgba(255,240,230,0.85)';
    [[25, 32, 18], [50, 25, 22], [78, 32, 17], [60, 36, 16]].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // ---- sun ----
  tex(scene, 'sun', 140, 140, (ctx) => {
    const g = ctx.createRadialGradient(70, 70, 10, 70, 70, 70);
    g.addColorStop(0, 'rgba(255,238,170,1)');
    g.addColorStop(0.4, 'rgba(255,190,90,0.9)');
    g.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 140, 140);
  });

  // ---- moon (night map) ----
  tex(scene, 'moon', 120, 120, (ctx) => {
    const g = ctx.createRadialGradient(60, 60, 20, 60, 60, 60);
    g.addColorStop(0, 'rgba(230,238,255,0.9)');
    g.addColorStop(0.45, 'rgba(190,205,235,0.55)');
    g.addColorStop(1, 'rgba(160,180,220,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 120, 120);
    ctx.fillStyle = '#dfe8f8';
    ctx.beginPath();
    ctx.arc(60, 60, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(170,185,215,0.7)';
    [[50, 52, 5], [70, 66, 4], [62, 46, 3]].forEach(([x, y, r]) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  // ---- money magnet powerup ----
  tex(scene, 'magnet', 34, 32, (ctx) => {
    ctx.strokeStyle = '#c9312b';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(17, 14, 10, Math.PI, 0);
    ctx.stroke();
    ctx.strokeStyle = '#c9312b';
    ctx.beginPath();
    ctx.moveTo(7, 14); ctx.lineTo(7, 24);
    ctx.moveTo(27, 14); ctx.lineTo(27, 24);
    ctx.stroke();
    ctx.fillStyle = '#d8dee9';
    ctx.fillRect(3, 22, 8, 8);
    ctx.fillRect(23, 22, 8, 8);
    ctx.fillStyle = '#f5c542';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('$', 17, 12);
  });

  // ---- missile hazard ----
  tex(scene, 'missile', 22, 54, (ctx) => {
    // nose
    ctx.fillStyle = '#c9312b';
    ctx.beginPath();
    ctx.moveTo(11, 0); ctx.lineTo(19, 14); ctx.lineTo(3, 14);
    ctx.closePath(); ctx.fill();
    // body
    ctx.fillStyle = '#9aa1ad';
    ctx.fillRect(3, 13, 16, 26);
    ctx.fillStyle = '#7c828e';
    ctx.fillRect(3, 22, 16, 3);
    // fins
    ctx.fillStyle = '#c9312b';
    ctx.beginPath();
    ctx.moveTo(3, 38); ctx.lineTo(-1 + 4, 48); ctx.lineTo(3, 44); ctx.closePath();
    ctx.moveTo(19, 38); ctx.lineTo(19, 44); ctx.lineTo(22 - 3 + 3, 48);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(1, 36, 4, 10);
    ctx.fillRect(17, 36, 4, 10);
    // exhaust
    const g = ctx.createRadialGradient(11, 47, 1, 11, 47, 8);
    g.addColorStop(0, '#fff3b0');
    g.addColorStop(0.5, '#ff9f43');
    g.addColorStop(1, 'rgba(255,80,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(3, 39, 16, 15);
  });

  // ---- missile warning sign ----
  tex(scene, 'warn', 40, 36, (ctx) => {
    ctx.fillStyle = '#f5c542';
    ctx.beginPath();
    ctx.moveTo(20, 2); ctx.lineTo(38, 33); ctx.lineTo(2, 33);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a5382a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#3a0d0d';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('!', 20, 28);
  });

  // ---- coastline silhouettes (both shores of the strait) ----
  tex(scene, 'coast', 480, 180, (ctx) => {
    ctx.fillStyle = 'rgba(48,38,74,0.9)';
    ctx.beginPath();
    ctx.moveTo(0, 180);
    ctx.lineTo(0, 90);
    ctx.quadraticCurveTo(60, 40, 120, 100);
    ctx.quadraticCurveTo(160, 140, 200, 160);
    ctx.lineTo(200, 180);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(480, 180);
    ctx.lineTo(480, 80);
    ctx.quadraticCurveTo(430, 30, 380, 90);
    ctx.quadraticCurveTo(340, 140, 300, 165);
    ctx.lineTo(300, 180);
    ctx.closePath(); ctx.fill();
  });

  // ---- particles ----
  tex(scene, 'spark', 8, 8, (ctx) => {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(4, 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });
  tex(scene, 'flame', 12, 12, (ctx) => {
    const g = ctx.createRadialGradient(6, 6, 1, 6, 6, 6);
    g.addColorStop(0, '#fff3b0');
    g.addColorStop(0.5, '#ff9f43');
    g.addColorStop(1, 'rgba(255,80,30,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 12, 12);
  });
}

// ---- fleet skins: tanker + speedboat recolored per shop selection ----

function drawTanker(ctx, s) {
  ctx.fillStyle = s.hull;
  ctx.beginPath();
  ctx.moveTo(2, 16); ctx.lineTo(148, 16);
  ctx.lineTo(134, 40); ctx.lineTo(16, 40);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = s.hullDark;
  ctx.fillRect(2, 16, 146, 4);
  // deck pipes
  ctx.fillStyle = '#9aa1ad';
  ctx.fillRect(14, 11, 70, 5);
  ctx.fillStyle = '#7c828e';
  ctx.fillRect(20, 7, 8, 6);
  ctx.fillRect(44, 7, 8, 6);
  ctx.fillRect(68, 7, 8, 6);
  // bridge tower
  ctx.fillStyle = '#e8e6df';
  ctx.fillRect(104, 2, 30, 14);
  ctx.fillStyle = '#4a7fa8';
  ctx.fillRect(107, 5, 6, 4);
  ctx.fillRect(116, 5, 6, 4);
  ctx.fillRect(125, 5, 6, 4);
  ctx.fillStyle = '#f2d9b0';
  ctx.font = 'bold 10px Arial';
  ctx.fillText('OIL', 30, 32);
}

function drawBoat(ctx, s) {
  ctx.fillStyle = s.boat;
  ctx.beginPath();
  ctx.moveTo(4, 16); ctx.lineTo(78, 12); ctx.lineTo(107, 19);
  ctx.lineTo(94, 30); ctx.lineTo(12, 30);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = s.stripe;
  ctx.beginPath();
  ctx.moveTo(8, 22); ctx.lineTo(100, 22); ctx.lineTo(96, 27); ctx.lineTo(11, 27);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3d5a75';
  ctx.beginPath();
  ctx.moveTo(48, 12); ctx.lineTo(66, 5); ctx.lineTo(70, 12);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#333a45';
  ctx.fillRect(2, 14, 6, 10);
}

function buildShipTextures(scene, key) {
  const s = CATALOG.SHIPS[key];
  tex(scene, 'tanker-' + key, 150, 42, (ctx) => drawTanker(ctx, s));
  tex(scene, 'boat-' + key, 110, 32, (ctx) => drawBoat(ctx, s));
}

// ---- map themes: sky + sea recolored per shop selection ----

function buildMapTextures(scene, key) {
  const m = CATALOG.MAPS[key];
  tex(scene, 'sky-' + key, 480, 800, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 800);
    g.addColorStop(0, m.sky[0]);
    g.addColorStop(0.45, m.sky[1]);
    g.addColorStop(0.75, m.sky[2]);
    g.addColorStop(1, m.sky[3]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 480, 800);
    if (m.stars) {
      for (let i = 0; i < 90; i++) {
        const x = (i * 971) % 480, y = ((i * 613) % 560);
        ctx.fillStyle = `rgba(255,255,255,${0.25 + ((i * 7) % 10) / 14})`;
        ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
      }
    }
  });
  tex(scene, 'sea-' + key, 480, 220, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 220);
    g.addColorStop(0, m.sea[0]);
    g.addColorStop(1, m.sea[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 480, 220);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const y = 10 + Math.pow(i, 1.4) * 6;
      const x = (i * 137) % 400;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 20, y - 4, x + 40, y);
      ctx.stroke();
    }
  });
}
