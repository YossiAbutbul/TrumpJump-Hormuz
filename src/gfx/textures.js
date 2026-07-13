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
  // Draw at SS× the logical size so the art carries enough detail to stay sharp
  // under the camera zoom. Sprites created from this texture display at natural
  // (SS×) size, so callers apply TEX_SCALE (1/SS) to render at logical size.
  const SS = window.SS || 1;
  const t = scene.textures.createCanvas(key, w * SS, h * SS);
  const ctx = t.getContext();
  ctx.scale(SS, SS);
  draw(ctx, w, h);
  t.refresh();
}

function buildTextures(scene) {
  // player skins are PNG art loaded in MenuScene.preload (assets/skins/<id>/).

  // ---- inflatable dinghy (breakable platform: bursts after one bounce). ----
  // A bright rubber air-tube boat. The tube fill + gloss is shared with the
  // burst debris so the flying pieces read as bits of the same boat.
  function inflatedTube(ctx, x, y, w, h, r) {
    rr(ctx, x, y, w, h, r); ctx.fillStyle = '#ef6a2b'; ctx.fill();
    // glossy rubber shading: hot highlight up top, deep shadow at the belly
    ctx.save(); rr(ctx, x, y, w, h, r); ctx.clip();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(255,198,150,0.9)');
    g.addColorStop(0.38, 'rgba(255,150,90,0)');
    g.addColorStop(1, 'rgba(120,45,15,0.5)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  tex(scene, 'barrels', 96, 32, (ctx) => {
    // soft shadow the boat casts on the water
    ctx.fillStyle = 'rgba(20,50,80,0.20)';
    ctx.beginPath(); ctx.ellipse(48, 29, 46, 3.2, 0, 0, Math.PI * 2); ctx.fill();
    // main pontoon tube, fully rounded ends (bow + stern)
    inflatedTube(ctx, 2, 5, 92, 22, 11);
    // pinched seams between the inflated air chambers
    [22, 40, 58, 76].forEach((sx) => {
      ctx.strokeStyle = 'rgba(150,60,25,0.75)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(sx, 6.5); ctx.lineTo(sx, 25.5); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,205,165,0.5)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(sx + 1.5, 6.5); ctx.lineTo(sx + 1.5, 25.5); ctx.stroke();
    });
    // glossy bulge on each chamber
    [12, 31, 49, 67, 86].forEach((cx) => {
      ctx.fillStyle = 'rgba(255,238,220,0.55)';
      ctx.beginPath(); ctx.ellipse(cx, 10, 5.5, 2.3, 0, 0, Math.PI * 2); ctx.fill();
    });
    // grab rope scalloped along the side on little D-ring tabs
    ctx.strokeStyle = '#e7e0cf'; ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let sx = 8; sx <= 80; sx += 18) {
      ctx.moveTo(sx, 18); ctx.quadraticCurveTo(sx + 9, 22.5, sx + 18, 18);
    }
    ctx.stroke();
    [8, 26, 44, 62, 80].forEach((dx) => {
      ctx.fillStyle = '#5b5b64';
      ctx.beginPath(); ctx.arc(dx, 18, 1.4, 0, Math.PI * 2); ctx.fill();
    });
    // inflation valve near the stern
    ctx.fillStyle = '#3a3a40';
    ctx.beginPath(); ctx.arc(84, 9, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.arc(83.2, 8.2, 0.9, 0, Math.PI * 2); ctx.fill();
    // wet waterline + foam edge along the bottom
    ctx.save(); rr(ctx, 2, 5, 92, 22, 11); ctx.clip();
    ctx.fillStyle = 'rgba(30,80,130,0.26)'; ctx.fillRect(2, 23, 92, 6);
    ctx.fillStyle = 'rgba(210,235,255,0.6)'; ctx.fillRect(2, 22.5, 92, 1);
    ctx.restore();
    // outline
    ctx.strokeStyle = '#a8461a'; ctx.lineWidth = 1.3;
    rr(ctx, 2, 5, 92, 22, 11); ctx.stroke();
  });

  // ---- dinghy debris: two rubber tube segments for the burst on bounce ----
  tex(scene, 'barrel-chunk', 28, 22, (ctx) => {
    inflatedTube(ctx, 2, 3, 24, 16, 8);
    ctx.strokeStyle = 'rgba(150,60,25,0.7)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(14, 4); ctx.lineTo(14, 18); ctx.stroke();
    ctx.fillStyle = 'rgba(255,238,220,0.55)';
    ctx.beginPath(); ctx.ellipse(8, 7, 4, 1.9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a8461a'; ctx.lineWidth = 1.2; rr(ctx, 2, 3, 24, 16, 8); ctx.stroke();
  });
  tex(scene, 'plank-chunk', 30, 12, (ctx) => {
    inflatedTube(ctx, 1, 1, 28, 10, 5);
    ctx.fillStyle = 'rgba(255,238,220,0.5)';
    ctx.beginPath(); ctx.ellipse(10, 4, 6, 1.7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#a8461a'; ctx.lineWidth = 1.1; rr(ctx, 1, 1, 28, 10, 5); ctx.stroke();
  });

  // ---- buoy: rubber duck floating on the water (narrow platform) ----
  tex(scene, 'buoy', 52, 46, (ctx) => {
    // body
    ctx.fillStyle = '#f7c930';
    ctx.beginPath();
    ctx.ellipse(26, 32, 20, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    // tail flick
    ctx.beginPath();
    ctx.moveTo(44, 30); ctx.quadraticCurveTo(52, 22, 45, 20);
    ctx.quadraticCurveTo(47, 26, 42, 28);
    ctx.closePath(); ctx.fill();
    // head
    ctx.beginPath(); ctx.arc(13, 16, 10, 0, Math.PI * 2); ctx.fill();
    // beak
    ctx.fillStyle = '#e8762c';
    ctx.beginPath();
    ctx.ellipse(3.5, 18, 5, 3, -0.15, 0, Math.PI * 2);
    ctx.fill();
    // eye
    ctx.fillStyle = '#222222';
    ctx.beginPath(); ctx.arc(11, 13, 1.8, 0, Math.PI * 2); ctx.fill();
    // wing
    ctx.strokeStyle = '#d8a516';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(28, 32, 9, 5, -0.2, 0.4, Math.PI * 1.1);
    ctx.stroke();
    // belly shade at the waterline
    ctx.fillStyle = 'rgba(160,110,10,0.25)';
    ctx.beginPath();
    ctx.ellipse(26, 38, 18, 4.5, 0, 0, Math.PI);
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

  // ---- Trump bill: rare premium currency ("Trump Bucks") ----
  tex(scene, 'bill', 40, 24, (ctx) => {
    // green paper + engraved frame
    ctx.fillStyle = '#4b8f5f'; rr(ctx, 1, 1, 38, 22, 3); ctx.fill();
    ctx.strokeStyle = '#dff3e4'; ctx.lineWidth = 1; rr(ctx, 3.5, 3.5, 33, 17, 2); ctx.stroke();
    ctx.strokeStyle = '#2f5f3d'; ctx.lineWidth = 1.4; rr(ctx, 1, 1, 38, 22, 3); ctx.stroke();
    // centre portrait oval
    ctx.fillStyle = '#dcefe1';
    ctx.beginPath(); ctx.ellipse(20, 12, 6.5, 8, 0, 0, Math.PI * 2); ctx.fill();
    // --- tiny Trump portrait, clipped to the oval ---
    ctx.save();
    ctx.beginPath(); ctx.ellipse(20, 12, 6.5, 8, 0, 0, Math.PI * 2); ctx.clip();
    // navy suit shoulders
    ctx.fillStyle = '#25344a';
    ctx.beginPath(); ctx.moveTo(12, 21); ctx.quadraticCurveTo(20, 14.5, 28, 21);
    ctx.lineTo(28, 22); ctx.lineTo(12, 22); ctx.closePath(); ctx.fill();
    // face
    ctx.fillStyle = '#e7b98f';
    ctx.beginPath(); ctx.ellipse(20, 12.5, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
    // red tie
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.moveTo(20, 16.5); ctx.lineTo(18.7, 22); ctx.lineTo(21.3, 22); ctx.closePath(); ctx.fill();
    // blond hair swoosh
    ctx.fillStyle = '#f2d873';
    ctx.beginPath();
    ctx.moveTo(15.5, 10); ctx.quadraticCurveTo(16, 6, 22, 6.6);
    ctx.quadraticCurveTo(25.5, 7, 24.6, 9.6);
    ctx.quadraticCurveTo(22, 8, 18.8, 8.9);
    ctx.quadraticCurveTo(16.8, 9.3, 15.5, 11); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#2f5f3d'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(20, 12, 6.5, 8, 0, 0, Math.PI * 2); ctx.stroke();
    // corner numerals
    ctx.fillStyle = '#eaf7ee';
    ctx.font = 'bold 7px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('47', 8, 7); ctx.fillText('47', 32, 17);
  });

  // ---- boost icon: little rocket, for the LAUNCH PAD purchase + in-game tap ----
  tex(scene, 'boost', 30, 36, (ctx) => {
    // exhaust flame
    ctx.fillStyle = '#ffb03a';
    ctx.beginPath(); ctx.moveTo(10, 27); ctx.quadraticCurveTo(15, 41, 20, 27); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff6a2a';
    ctx.beginPath(); ctx.moveTo(12.5, 27); ctx.quadraticCurveTo(15, 35, 17.5, 27); ctx.closePath(); ctx.fill();
    // fins
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.moveTo(9, 19); ctx.lineTo(3.5, 29); ctx.lineTo(11, 25); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(21, 19); ctx.lineTo(26.5, 29); ctx.lineTo(19, 25); ctx.closePath(); ctx.fill();
    // body
    ctx.fillStyle = '#e8ecf0';
    ctx.beginPath(); ctx.moveTo(15, 2);
    ctx.quadraticCurveTo(22, 10, 21, 25); ctx.lineTo(9, 25);
    ctx.quadraticCurveTo(8, 10, 15, 2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#9aa4b0'; ctx.lineWidth = 1; ctx.stroke();
    // red nose cone
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.moveTo(15, 2); ctx.quadraticCurveTo(19, 7, 19, 11);
    ctx.lineTo(11, 11); ctx.quadraticCurveTo(11, 7, 15, 2); ctx.closePath(); ctx.fill();
    // window
    ctx.fillStyle = '#4aa3e0';
    ctx.beginPath(); ctx.arc(15, 16, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2f6fb5'; ctx.lineWidth = 1; ctx.stroke();
  });

  // ---- all cap/hat jet powerups (see hats.js) ----
  registerAllHats(scene);

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

  // cyan variant for the brief flight-end grace shield, so it reads as part
  // of the jet landing rather than a GOLDEN DOME pickup
  tex(scene, 'aura-jet', 96, 96, (ctx) => {
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(102,214,255,${0.5 - i * 0.15})`;
      ctx.lineWidth = 3 - i;
      ctx.beginPath();
      ctx.arc(48, 48, 38 + i * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  });

  // ---- drone hazard (original look; the red light blinks via an overlay) ----
  tex(scene, 'drone', 60, 30, (ctx) => {
    ctx.fillStyle = '#3a424f';
    rr(ctx, 20, 12, 20, 12, 4); ctx.fill();
    ctx.strokeStyle = '#3a424f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(24, 14); ctx.lineTo(8, 6);
    ctx.moveTo(36, 14); ctx.lineTo(52, 6);
    ctx.stroke();
    // soft light-grey rotors — visible against dark skies without being stark
    ctx.fillStyle = '#c4cad4';
    ctx.beginPath();
    ctx.ellipse(8, 5, 9, 3.2, 0, 0, Math.PI * 2);
    ctx.ellipse(52, 5, 9, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9aa2b0';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(8, 5, 9, 3.2, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(52, 5, 9, 3.2, 0, 0, Math.PI * 2); ctx.stroke();
    // camera lens underneath (the top red light is drawn by the blink overlay)
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(30, 25, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // blinking red light that sits on the drone's top in game
  tex(scene, 'drone-eye', 16, 16, (ctx) => {
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,70,70,1)');
    g.addColorStop(0.5, 'rgba(230,40,40,0.55)');
    g.addColorStop(1, 'rgba(230,40,40,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#ff4040';
    ctx.beginPath(); ctx.arc(8, 8, 3, 0, Math.PI * 2); ctx.fill();
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

// ---- circular profile-picture avatar for a skin, pre-rendered once so the
// account chip and leaderboard can use it directly (no runtime masks) ----

function buildFaceTexture(scene, id) {
  const key = 'face-' + id;
  if (scene.textures.exists(key)) return;
  const srcKey = 'skin-' + id + '-idle';
  if (!scene.textures.exists(srcKey)) return;
  const src = scene.textures.get(srcKey).getSourceImage();
  const D = 160;
  const canvas = scene.textures.createCanvas(key, D, D);
  const ctx = canvas.getContext();
  ctx.save();
  ctx.beginPath();
  ctx.arc(D / 2, D / 2, D / 2, 0, Math.PI * 2);
  ctx.clip();
  const scale = (D * 1.15) / src.width;         // show the whole head
  const dw = src.width * scale, dh = src.height * scale;
  ctx.drawImage(src, (D - dw) / 2, D / 2 - dh * 0.30, dw, dh);
  ctx.restore();
  canvas.refresh();
}

function buildFaceTextures(scene) {
  Object.keys(CATALOG.SKINS).forEach((id) => buildFaceTexture(scene, id));
}