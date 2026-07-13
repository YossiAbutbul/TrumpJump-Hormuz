// hats.js — all hat/cap jet-powerup textures, drawn procedurally.
// Depends on tex() and rr() from textures.js — both live in the same global
// scope, so load order between hats.js and textures.js doesn't matter, as
// long as both are loaded before buildTextures() actually runs.

// ---------------------------------------------------------------------------------------------
// ---- MAGA cap powerup (jet flight) ----
// ---------------------------------------------------------------------------------------------

function drawMagaCap(ctx) {
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
}

// ---------------------------------------------------------------------------------------------
// ---- MAGA cowboy hat jet powerup (replaces the MAGA cap) ----
// ---------------------------------------------------------------------------------------------

function drawCowboyHat(ctx) {
  ctx.strokeStyle = '#3d2814';
  ctx.lineWidth = 0.9;

  ctx.fillStyle = '#8b5e3c';
  ctx.beginPath();
  ctx.ellipse(20, 22, 18, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(61,40,20,0.4)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(6, 22); ctx.quadraticCurveTo(5, 19.5, 7.5, 19.5); ctx.quadraticCurveTo(9.5, 20, 11, 22.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(34, 22); ctx.quadraticCurveTo(35, 19.5, 32.5, 19.5); ctx.quadraticCurveTo(30.5, 20, 29, 22.2);
  ctx.stroke();

  ctx.fillStyle = '#8b5e3c';
  ctx.strokeStyle = '#3d2814';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(11, 22);
  ctx.lineTo(13, 9);
  ctx.quadraticCurveTo(15, 6, 17.5, 6.8);
  ctx.quadraticCurveTo(18.5, 7.2, 20, 7.2);
  ctx.quadraticCurveTo(21.5, 7.2, 22.5, 6.8);
  ctx.quadraticCurveTo(25, 6, 27, 9);
  ctx.lineTo(29, 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#6e4a2c';
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(18.2, 6.8);
  ctx.quadraticCurveTo(18.5, 7.8, 19, 9);
  ctx.quadraticCurveTo(19.5, 10, 20, 10.5);
  ctx.quadraticCurveTo(20.5, 10, 21, 9);
  ctx.quadraticCurveTo(21.5, 7.8, 21.8, 6.8);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#5a3a20';
  ctx.beginPath();
  ctx.moveTo(11.2, 17); ctx.lineTo(28.8, 17);
  ctx.lineTo(29, 19.6); ctx.lineTo(11, 19.6);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#3d2814';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(20, 18.2, 0.9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(19.1, 18.2); ctx.lineTo(15, 17.8);
  ctx.moveTo(20.9, 18.2); ctx.lineTo(25, 17.8);
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 5px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('MAGA', 20, 15.5);
}

// ---------------------------------------------------------------------------------------------
// ---- VAMPIRE jet powerup: black top hat with maroon band (replaces the MAGA cap) ----
// ---------------------------------------------------------------------------------------------

function drawVampireHat(ctx) {
  // wide brim at the base
  ctx.fillStyle = '#0d0d0f';
  ctx.beginPath();
  ctx.ellipse(20, 23, 17, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // tall cylindrical crown
  ctx.fillStyle = '#161618';
  rr(ctx, 10, 2, 20, 20, 2);
  ctx.fill();

  // subtle top highlight
  ctx.fillStyle = '#232326';
  ctx.beginPath();
  ctx.ellipse(20, 3, 9, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // maroon band near the base of the crown
  ctx.fillStyle = '#5a1020';
  rr(ctx, 9, 15, 22, 5, 1);
  ctx.fill();

  // MAGA text on the band
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 5px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('MAGA', 20, 19);

  // outlines
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 0.8;
  rr(ctx, 10, 2, 20, 20, 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(20, 23, 17, 4, 0, 0, Math.PI * 2);
  ctx.stroke();
}


// ---------------------------------------------------------------------------------------------
// ---- SANTA jet powerup: red santa hat with white fur trim (replaces the MAGA cap) ----
// ---------------------------------------------------------------------------------------------

function drawSantaHat(ctx) {
  // main hat body: one continuous outline, bottom edge flush with the band
  ctx.fillStyle = '#c8302a';
  ctx.beginPath();
  ctx.moveTo(5.5, 17.5);
  ctx.bezierCurveTo(5.5, 10, 11, 3.5, 19.5, 2.5);
  ctx.bezierCurveTo(26, 1.7, 30, 3.5, 32, 6.5);
  ctx.bezierCurveTo(33, 8.2, 32, 10, 30, 9.8);
  ctx.bezierCurveTo(28.5, 9.6, 28.2, 7.8, 29.5, 7);
  ctx.bezierCurveTo(29, 8.5, 27, 9, 26.5, 7);
  ctx.bezierCurveTo(26.3, 5.8, 28.5, 5.2, 30.5, 7);
  ctx.lineTo(31.5, 16);
  ctx.lineTo(5.5, 17.5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8a1f1c';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // shading fold along the outer curve
  ctx.strokeStyle = 'rgba(140,20,18,0.5)';
  ctx.lineWidth = 0.9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(8, 16.5);
  ctx.bezierCurveTo(8, 11, 11.5, 6.5, 16.5, 4.2);
  ctx.stroke();

  // pom-pom: enlarged and pulled outside the curl
  ctx.fillStyle = '#f7f2ea';
  ctx.beginPath();
  ctx.arc(32, 5.2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d8d0c0';
  ctx.lineWidth = 0.3;
  ctx.stroke();

  // white fur band across the base
  ctx.fillStyle = '#f7f2ea';
  rr(ctx, 4, 16, 29, 5.5, 2.7);
  ctx.fill();
  ctx.strokeStyle = '#d8d0c0';
  ctx.lineWidth = 0.3;
  rr(ctx, 4, 16, 29, 5.5, 2.7);
  ctx.stroke();

  // fluffy texture bumps on the band
  ctx.fillStyle = '#fff';
  [[5.8, 18.7], [10.8, 19.5], [16.3, 18.7], [21.8, 19.5], [27.3, 18.7], [31, 19.5]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  });

  // MAGA text on the band
  ctx.fillStyle = '#c8302a';
  ctx.font = 'bold 4.5px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('MAGA', 18, 19.8);
}

// ---------------------------------------------------------------------------------------------
// ---- MUMMY jet powerup: pharaoh nemes headdress with gold band, cobra
// ---------------------------------------------------------------------------------------------

function drawMummyHat(ctx) {
  // full hood + side-wing silhouette, used as a clip so the stripes below
  // only paint inside it
  const hoodPath = () => {
    ctx.beginPath();
    ctx.moveTo(9, 7);
    ctx.bezierCurveTo(9, 3, 13, 1, 20, 1);
    ctx.bezierCurveTo(27, 1, 31, 3, 31, 7);
    ctx.lineTo(33, 23);
    ctx.bezierCurveTo(33, 26.5, 30, 27.5, 28, 25);
    ctx.lineTo(26, 10);
    ctx.lineTo(14, 10);
    ctx.lineTo(12, 25);
    ctx.bezierCurveTo(10, 27.5, 7, 26.5, 7, 23);
    ctx.closePath();
  };

  // alternating blue/gold stripes, clipped to the hood silhouette
  ctx.save();
  hoodPath();
  ctx.clip();
  const stripeH = 2.08;
  const colors = ['#2a4a7a', '#e0b84a'];
  for (let i = 0, y = 1; y < 27; i++, y += stripeH) {
    ctx.fillStyle = colors[i % 2];
    ctx.fillRect(5, y, 30, stripeH + 0.1);
  }
  ctx.restore();

  // hood outline
  ctx.strokeStyle = '#1a2a4a';
  ctx.lineWidth = 0.6;
  hoodPath();
  ctx.stroke();

  // gold forehead band across the stripes
  ctx.fillStyle = '#f0c85a';
  ctx.fillRect(8, 9.2, 24, 3.2);
  ctx.fillStyle = '#fbe08a';
  ctx.fillRect(8, 9.2, 24, 0.7);
  ctx.fillStyle = 'rgba(138,106,26,0.5)';
  ctx.fillRect(8, 11.7, 24, 0.7);
  ctx.strokeStyle = '#8a6a1a';
  ctx.lineWidth = 0.4;
  ctx.strokeRect(8, 9.2, 24, 3.2);

  // MAGA embroidered on the band
  ctx.fillStyle = '#8a5a10';
  ctx.font = 'bold 3.6px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText('MAGA', 20, 11.8);

  // small gold cobra (uraeus) rising above the band, centered
  ctx.fillStyle = '#e0b84a';
  ctx.beginPath();
  ctx.moveTo(18.7, 9.2);
  ctx.bezierCurveTo(18.7, 6.5, 17.8, 4.5, 19.3, 3.2);
  ctx.bezierCurveTo(20.8, 1.9, 22.3, 3.5, 22, 5.3);
  ctx.bezierCurveTo(21.7, 7, 20.8, 8, 19.7, 9.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8a6a1a';
  ctx.lineWidth = 0.35;
  ctx.stroke();
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.arc(20.2, 3.6, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------------------------------------------------------------------------------------
// ---- ZOMBIE jet powerup: exposed brain, wide flat oval mound sitting on
// ---------------------------------------------------------------------------------------------

function drawZombieBrain(ctx) {
  // outline: smooth two-lobe brain shape
  ctx.fillStyle = '#d99cae';
  ctx.beginPath();
  ctx.moveTo(4.2, 19.4);
  ctx.bezierCurveTo(1.6, 18.1, 1.0, 14.9, 3.6, 13.0);
  ctx.bezierCurveTo(2.3, 10.4, 4.8, 7.2, 8.7, 6.6);
  ctx.bezierCurveTo(10.0, 4.6, 13.8, 4.0, 17.0, 5.3);
  ctx.bezierCurveTo(18.3, 4.4, 20.8, 4.4, 22.1, 5.3);
  ctx.bezierCurveTo(25.3, 4.0, 29.2, 4.6, 30.4, 6.6);
  ctx.bezierCurveTo(34.3, 7.2, 36.8, 10.4, 35.6, 13.0);
  ctx.bezierCurveTo(38.1, 14.9, 37.5, 18.1, 34.9, 19.4);
  ctx.bezierCurveTo(35.6, 21.9, 33.0, 23.8, 29.8, 23.2);
  ctx.bezierCurveTo(28.5, 25.1, 23.4, 25.5, 21.5, 23.8);
  ctx.bezierCurveTo(20.8, 24.5, 18.3, 24.5, 17.6, 23.8);
  ctx.bezierCurveTo(15.7, 25.5, 10.6, 25.1, 9.3, 23.2);
  ctx.bezierCurveTo(6.1, 23.8, 3.6, 21.9, 4.2, 19.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7a2050';
  ctx.lineWidth = 0.55;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // central longitudinal fissure, dividing the two hemispheres
  ctx.beginPath();
  ctx.moveTo(19.6, 4.9);
  ctx.bezierCurveTo(19.2, 9.8, 19.9, 13.6, 19.4, 18.1);
  ctx.bezierCurveTo(19.1, 20.6, 19.9, 22.2, 19.6, 24.1);
  ctx.lineWidth = 0.64;
  ctx.lineCap = 'round';
  ctx.stroke();

  // small curl-shaped fold marks — a single-bump "C" and a double-bump "3"
  // shape, drawn via save/translate/rotate/scale so each instance can vary
  const curlS = () => {
    ctx.beginPath();
    ctx.moveTo(1.28, -1.41);
    ctx.bezierCurveTo(-1.15, -1.41, -1.15, 1.41, 1.28, 1.41);
    ctx.stroke();
  };
  const curlD = () => {
    ctx.beginPath();
    ctx.moveTo(1.02, -2.05);
    ctx.bezierCurveTo(-1.28, -2.05, -1.28, -0.19, 0.90, -0.19);
    ctx.bezierCurveTo(-1.28, -0.19, -1.28, 1.92, 1.02, 1.92);
    ctx.stroke();
  };
  const placeCurl = (draw, x, y, rotDeg, scale) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotDeg * Math.PI / 180);
    ctx.scale(scale, Math.abs(scale));
    draw();
    ctx.restore();
  };
  ctx.strokeStyle = '#7a2050';
  ctx.lineWidth = 0.5;
  ctx.lineCap = 'round';
  // left hemisphere
  placeCurl(curlS, 9.06, 9.63, -15, 1.3);
  placeCurl(curlD, 13.93, 9.38, 10, 1.1);
  placeCurl(curlS, 7.02, 13.73, -25, 1.2);
  placeCurl(curlD, 14.57, 14.24, 15, 1.2);
  placeCurl(curlS, 10.6, 15.78, 5, 1);
  placeCurl(curlD, 6.12, 18.34, -10, 1.05);
  placeCurl(curlS, 11.62, 19.62, -5, 1.2);
  placeCurl(curlD, 16.23, 18.85, 20, 1.1);
  placeCurl(curlS, 8.81, 22.18, 0, 0.95);
  // right hemisphere (mirrored via negative x-scale)
  placeCurl(curlS, 30.06, 9.63, 15, -1.3);
  placeCurl(curlD, 25.19, 9.38, -10, -1.1);
  placeCurl(curlS, 32.10, 13.73, 25, -1.2);
  placeCurl(curlD, 24.55, 14.24, -15, -1.2);
  placeCurl(curlS, 28.52, 15.78, -5, -1);
  placeCurl(curlD, 33.0, 18.34, 10, -1.05);
  placeCurl(curlS, 27.50, 19.62, 5, -1.2);
  placeCurl(curlD, 22.89, 18.85, -20, -1.1);
  placeCurl(curlS, 30.31, 22.18, 0, -0.95);

  // two purple squiggles flanking the central fissure
  ctx.strokeStyle = '#8a3aa0';
  ctx.lineWidth = 0.51;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(17.0, 9.12);
  ctx.bezierCurveTo(16.23, 10.4, 17.77, 11.42, 17.0, 12.70);
  ctx.bezierCurveTo(16.23, 13.98, 17.77, 15.01, 17.13, 16.29);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(22.12, 9.12);
  ctx.bezierCurveTo(22.89, 10.4, 21.35, 11.42, 22.12, 12.70);
  ctx.bezierCurveTo(22.89, 13.98, 21.35, 15.01, 21.99, 16.29);
  ctx.stroke();
}


// ---------------------------------------------------------------------------------------------
// ---- SUMO jet powerup: sumo topknot (chonmage) hairstyle with a MAGA
// ---------------------------------------------------------------------------------------------

function drawSumoHair(ctx) {
  // main hair mass, swept back on both sides
  ctx.fillStyle = '#1c1c26';
  ctx.beginPath();
  ctx.moveTo(6, 18);
  ctx.bezierCurveTo(3, 17, 1.5, 13, 4, 9.5);
  ctx.bezierCurveTo(2.5, 6.5, 5.5, 2.5, 11, 2);
  ctx.bezierCurveTo(13, 0, 23, 0, 25, 2);
  ctx.bezierCurveTo(30.5, 2.5, 33.5, 6.5, 32, 9.5);
  ctx.bezierCurveTo(34.5, 13, 33, 17, 30, 18);
  ctx.bezierCurveTo(29.5, 15.5, 27, 14, 18, 14);
  ctx.bezierCurveTo(9, 14, 6.5, 15.5, 6, 18);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0a0a10';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // topknot base disc
  ctx.fillStyle = '#262633';
  ctx.beginPath();
  ctx.ellipse(18, 3, 5.5, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // topknot bun (chonmage) folded forward on top
  ctx.fillStyle = '#2e2e3c';
  ctx.beginPath();
  ctx.moveTo(15, 1);
  ctx.bezierCurveTo(16, -1.5, 20, -1.5, 21, 1);
  ctx.bezierCurveTo(22, 2.5, 20.5, 3.5, 18, 3.5);
  ctx.bezierCurveTo(15.5, 3.5, 14, 2.5, 15, 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // subtle shading strokes on the swept-back sides
  ctx.strokeStyle = 'rgba(58,58,74,0.6)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.moveTo(6, 9); ctx.bezierCurveTo(5.5, 10.5, 6.5, 11.5, 6, 13);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(30, 9); ctx.bezierCurveTo(30.5, 10.5, 29.5, 11.5, 30, 13);
  ctx.stroke();

  // MAGA headband strip across the front
  ctx.fillStyle = '#262633';
  rr(ctx, 7.5, 7.2, 21, 3.4, 0.6);
  ctx.fill();
  ctx.strokeStyle = '#0a0a10';
  ctx.lineWidth = 0.5;
  rr(ctx, 7.5, 7.2, 21, 3.4, 0.6);
  ctx.stroke();
  ctx.fillStyle = '#f5e9d8';
  ctx.font = 'bold 3.2px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('MAGA', 18, 9.9);
}


// ---------------------------------------------------------------------------------------------
// ---- DISCO comb jet powerup: purple comb built upright (teeth
// ---------------------------------------------------------------------------------------------

function drawDiscoComb(ctx) {
  ctx.save();
  ctx.translate(20, 15);
  ctx.rotate(-50 * Math.PI / 180);
  ctx.translate(-10, -16);

  ctx.fillStyle = '#3d1a3a';
  ctx.strokeStyle = '#1f0d1e';
  ctx.lineWidth = 0.8;
  ctx.lineJoin = 'round';

  const toothW = 1.5, gap = 2, count = 5;
  const firstX = 1.4;
  const lastX = firstX + (count - 1) * (toothW + gap);
  const spineLeft = firstX;
  const spineRight = lastX + toothW;
  const spineTop = 11, spineBottom = 13.3;
  const tipY = 1;

  ctx.beginPath();
  ctx.moveTo(spineLeft, spineBottom);
  ctx.lineTo(spineLeft, spineTop);
  for (let i = 0; i < count; i++) {
    const x = firstX + i * (toothW + gap);
    if (i > 0) ctx.lineTo(x, spineTop);
    ctx.lineTo(x, tipY);
    ctx.lineTo(x + toothW, tipY);
    ctx.lineTo(x + toothW, spineTop);
  }
  ctx.lineTo(spineRight, spineTop);
  ctx.lineTo(spineRight, spineBottom);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(5.5, 13.3);
  ctx.bezierCurveTo(5, 13.3, 4.7, 14, 4.9, 14.9);
  ctx.lineTo(6.9, 31.5);
  ctx.bezierCurveTo(7.1, 33.1, 8.3, 34.3, 9.7, 34.3);
  ctx.bezierCurveTo(11.1, 34.3, 12.3, 33.1, 12.5, 31.5);
  ctx.lineTo(14.5, 14.9);
  ctx.bezierCurveTo(14.7, 14, 14.4, 13.3, 13.9, 13.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 2px Arial';
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(9.7, 26.5);
  ctx.rotate(Math.PI / 2);
  ctx.fillText('MAGA', 0, 0.7);
  ctx.restore();

  ctx.restore();
}



// ---------------------------------------------------------------------------------------------
// ---- CATWOMAN flag cape jet powerup: flowing cape styled like the US
// ---------------------------------------------------------------------------------------------

function drawFlagCape(ctx) {
  // cape silhouette: flares out from a narrow collar, flowing wider with a
  // scalloped, wind-blown bottom edge
  const capePath = () => {
    ctx.beginPath();
    ctx.moveTo(11, 2);
    ctx.bezierCurveTo(16, 0, 24, 0, 29, 2);
    ctx.lineTo(30.2, 26);
    ctx.bezierCurveTo(28, 24.5, 26, 25.5, 24, 27);
    ctx.bezierCurveTo(22, 25.5, 20, 26.8, 18, 27);
    ctx.bezierCurveTo(16, 26.8, 14, 25.5, 12, 27);
    ctx.bezierCurveTo(10, 25.5, 8, 24.5, 6, 26);
    ctx.lineTo(9.8, 2);
    ctx.closePath();
  };

  // stripes + star field, clipped to the cape's silhouette so nothing
  // spills past the flowing edges
  ctx.save();
  capePath();
  ctx.clip();

  ctx.fillStyle = '#c0392b';
  ctx.fillRect(4, 0, 32, 28);

  ctx.fillStyle = '#fff';
  const stripeH = 2.2;
  for (let i = 0, y = 2.2; y < 27; i++, y += stripeH * 2) {
    ctx.fillRect(4, y, 32, stripeH);
  }

  ctx.fillStyle = '#1a3a6e';
  ctx.fillRect(10, 0, 10, 7);
  ctx.fillStyle = '#fff';
  [[12, 1.8], [16, 1.8], [12, 4], [16, 4], [14, 2.9], [12, 6], [16, 6]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 0.45, 0, Math.PI * 2);
    ctx.fill();
});

  ctx.restore();

  // outline drawn last, on top, so it reads crisp over the clipped fill
  ctx.strokeStyle = '#7a1f18';
  ctx.lineWidth = 0.5;
  ctx.lineJoin = 'round';
  capePath();
  ctx.stroke();
}







// ----------------------------------------- Friends Edition -----------------------------------------
// ---- YOHAI67 jet powerup: blue bucket hat (replaces the MAGA cap) ----
function drawYohaiHat(ctx) {
  // wide drooping brim
  ctx.fillStyle = '#173a97';
  ctx.beginPath();
  ctx.ellipse(20, 23, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // rounded crown
  ctx.fillStyle = '#2557d6';
  ctx.beginPath();
  ctx.moveTo(8, 23);
  ctx.lineTo(11, 9);
  ctx.quadraticCurveTo(20, 3, 29, 9);
  ctx.lineTo(32, 23);
  ctx.closePath(); ctx.fill();
  // crown top highlight
  ctx.fillStyle = '#4278ef';
  ctx.beginPath();
  ctx.ellipse(20, 10, 9, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // scattered white "8" / infinity dots
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  [[14, 14], [24, 12], [18, 18], [27, 17], [11, 20]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
  // brim outline
  ctx.strokeStyle = '#0f2a72';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(20, 23, 18, 6, 0, 0, Math.PI * 2);
  ctx.stroke();
}

// ---- ELADINIO jet powerup: straw farmer/panama hat (replaces the MAGA cap) ----
function drawEladinioHat(ctx) {
  // wide straw brim
  ctx.fillStyle = '#d8b877';
  ctx.beginPath();
  ctx.ellipse(20, 22, 18, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // straw crown
  ctx.fillStyle = '#e0c074';
  ctx.beginPath();
  ctx.moveTo(11, 22);
  ctx.lineTo(13, 9);
  ctx.quadraticCurveTo(20, 5, 27, 9);
  ctx.lineTo(29, 22);
  ctx.closePath(); ctx.fill();
  // crown top highlight
  ctx.fillStyle = '#eed69a';
  ctx.beginPath();
  ctx.ellipse(20, 9.5, 7, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // woven straw texture lines on crown
  ctx.strokeStyle = 'rgba(150,110,40,0.35)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 3; i++) {
    const yy = 11 + i * 2.2;
    ctx.beginPath(); ctx.moveTo(13, yy); ctx.lineTo(27, yy); ctx.stroke();
  }
  // cream hat band around the crown base
  ctx.fillStyle = '#f3ecd6';
  ctx.beginPath();
  ctx.moveTo(12, 17); ctx.lineTo(28, 17);
  ctx.lineTo(28.5, 20.5); ctx.lineTo(11.5, 20.5);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#cfc3a0';
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(12, 17.4); ctx.lineTo(28, 17.4); ctx.stroke();
  // brim + crown outline
  ctx.strokeStyle = '#a67c34';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(20, 22, 18, 5.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(11, 22);
  ctx.lineTo(13, 9);
  ctx.quadraticCurveTo(20, 5, 27, 9);
  ctx.lineTo(29, 22);
  ctx.stroke();
}

// ---- YARIN NO APPENDIX jet powerup: a stray appendix he picks up
// (replaces the MAGA cap). Drawn as a fleshy tapering tube hanging off a
// little pouch of cecum. ----
function drawYarinAppendix(ctx) {
  // cecum: the pouch of large intestine the appendix dangles from
  ctx.fillStyle = '#e2938a';
  ctx.beginPath();
  ctx.ellipse(20, 8, 13, 6.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // cecum sheen
  ctx.fillStyle = '#f2b6ac';
  ctx.beginPath();
  ctx.ellipse(16.5, 6, 6, 2.6, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // appendix body: overlapping circles of shrinking radius trace a curved,
  // tapering worm. Overlap makes the fills merge into one smooth tube (no
  // internal seams), which per-segment strokes would ruin — so no outline here.
  const seg = [
    [22, 12.5, 4.3],
    [24, 16, 3.7],
    [21.5, 19.5, 3.1],
    [23.5, 23, 2.4],
    [22.5, 26.5, 1.6],
  ];
  ctx.fillStyle = '#dd8078';
  seg.forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); });
  // glossy highlight running down the near side
  ctx.fillStyle = 'rgba(245,184,174,0.85)';
  seg.forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x - 1.1, y - 0.7, r * 0.42, 0, Math.PI * 2); ctx.fill(); });

  // cecum outline for definition
  ctx.strokeStyle = '#b85c55';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(20, 8, 13, 6.4, 0, 0, Math.PI * 2);
  ctx.stroke();
}

// ---- LIHI jet powerup: chocolate bar with the wrapper half peeled
// (replaces the MAGA cap) ----
function drawLihiBar(ctx) {
  // exposed chocolate slab (top half)
  ctx.fillStyle = '#4a2a16';
  rr(ctx, 6, 2, 28, 16, 2); ctx.fill();
  ctx.strokeStyle = '#2e1a0c';
  ctx.lineWidth = 1;
  rr(ctx, 6, 2, 28, 16, 2); ctx.stroke();
  // molded squares sit proud of the slab
  ctx.fillStyle = '#6b3d1e';
  [[8, 4], [17, 4], [26, 4], [8, 10.5], [17, 10.5], [26, 10.5]].forEach(([x, y]) => {
    rr(ctx, x, y, 6.5, 4.8, 1); ctx.fill();
  });
  // sheen on the top row of squares
  ctx.fillStyle = 'rgba(255, 226, 189, 0.3)';
  [[8, 4], [17, 4], [26, 4]].forEach(([x, y]) => {
    rr(ctx, x + 0.8, y + 0.8, 2.6, 1.6, 0.8); ctx.fill();
  });

  // torn foil edge poking out above the wrapper
  ctx.fillStyle = '#d9dde2';
  ctx.beginPath();
  ctx.moveTo(5, 21);
  for (let x = 5; x < 35; x += 5) {
    ctx.lineTo(x + 2.5, 16.5);
    ctx.lineTo(x + 5, 21);
  }
  ctx.closePath(); ctx.fill();

  // wrapper hugging the bottom third
  ctx.fillStyle = '#8a2f7a';
  rr(ctx, 5, 20, 30, 9, 2); ctx.fill();
  ctx.fillStyle = '#a94b97';
  rr(ctx, 5, 20, 30, 3, 2); ctx.fill();
  // wrapper label
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 7px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('LIHI', 20, 27.5);
}

// ---- registry: adding a new hat = one draw function + one line here ----
const HAT_REGISTRY = {
  'cap':          drawMagaCap,
  'cap-cowboy':   drawCowboyHat,
  'cap-vampire':  drawVampireHat,
  'cap-santa':    drawSantaHat,
  'cap-mummy':    drawMummyHat,
  'cap-zombie':   drawZombieBrain,
  'cap-sumo':     drawSumoHair,
  'cap-disco':    drawDiscoComb,
  'cap-catwoman': drawFlagCape,
  'cap-yohai':    drawYohaiHat,
  'cap-eladinio': drawEladinioHat,
  'cap-yarin':    drawYarinAppendix,
  'cap-lihi':     drawLihiBar,
};

function registerAllHats(scene) {
  Object.entries(HAT_REGISTRY).forEach(([key, draw]) => {
    tex(scene, key, 40, 30, draw);
  });
}