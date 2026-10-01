// Shared parts for BoilClear: the physics of boiling water (steam-table formulas, air pressure
// with height, surface tension, heat losses from a pot), colours, chart boards, glowing dots, and
// a see-through pot on an Indian gas stove that every chapter reuses.
// Scenes are built in "scene units" (1 unit ≈ 5 cm): +x to the right, +y up.
import { THREE, M, box, beam, sphere, arrow, clamp } from './kit.js';
import { audio } from './ui.js';

// ---------------------------------------------------------------- constants
export const K0 = 273.15;              // 0 °C in kelvin
export const ATM = 101.325;            // kPa, one standard atmosphere
export const C_WATER = 4186;           // J/(kg·K), liquid water
export const C_STEAM = 2010;           // J/(kg·K), steam near 100 °C at 1 atm
export const L_VAP = 2.257e6;          // J/kg, boiling water at 100 °C
export const R_GAS = 8.314462618;      // J/(mol·K)
export const M_WATER = 0.018015;       // kg/mol
export const R_V = R_GAS / M_WATER;    // 461.5 J/(kg·K), gas constant of water vapour
export const L_MOL = 40660;            // J/mol, latent heat of vaporisation at 100 °C
export const KB_EBU = 0.512;           // K·kg/mol, water's boiling-point (ebullioscopic) constant
export const M_NACL = 0.05844;         // kg/mol, table salt
export const LPG_J = 46e6;             // J/kg, heat from burning LPG (net calorific value, about 46 MJ/kg)
export const STOVE_ETA = 0.6;          // share of a gas flame's heat that reaches the pot (see pot.js)
export const TAU = Math.PI * 2;

// Saturation line of water: IAPWS-IF97, region 4 (the industrial steam-table formulation). Good
// from 0 °C (0.611 kPa) to the critical point (374 °C, 22,064 kPa) to better than 0.03%.
const N = [0, 0.11670521452767e4, -0.72421316703206e6, -0.17073846940092e2, 0.12020824702470e5, -0.32325550322333e7,
  0.14915108613530e2, -0.48232657361591e4, 0.40511340542057e6, -0.23855557567849, 0.65017534844798e3];
// Vapour pressure (kPa) of water at T °C.
export function psat(T) {
  const K = T + K0, th = K + N[9] / (K - N[10]);
  const A = th * th + N[1] * th + N[2], B = N[3] * th * th + N[4] * th + N[5], C = N[6] * th * th + N[7] * th + N[8];
  return 1000 * Math.pow((2 * C) / (-B + Math.sqrt(B * B - 4 * A * C)), 4);
}
// Boiling point (°C) of pure water under a pressure of P kPa.
export function tsat(P) {
  const b = Math.pow(Math.max(P, 0.05) / 1000, 0.25);
  const E = b * b + N[3] * b + N[6], F = N[1] * b * b + N[4] * b + N[7], G = N[2] * b * b + N[5] * b + N[8];
  const D = (2 * G) / (-F - Math.sqrt(F * F - 4 * E * G));
  return (N[10] + D - Math.sqrt((N[10] + D) ** 2 - 4 * (N[9] + N[10] * D))) / 2 - K0;
}
// The Clausius–Clapeyron estimate of the same curve, anchored at 100 °C and 1 atm and assuming the
// latent heat stays at 40.66 kJ/mol: P = P₀ exp[−(L/R)(1/T − 1/T₀)]. Drawn dashed next to the real one.
export const psatCC = (T) => ATM * Math.exp((-L_MOL / R_GAS) * (1 / (T + K0) - 1 / 373.15));
// Latent heat of vaporisation (J/kg) at T °C: a fit to the steam tables (2,501 kJ/kg at 0 °C,
// 2,442 at 25 °C, 2,257 at 100 °C, 2,202 at 120 °C), good to 0.2% from 0 to 150 °C.
export const latent = (T) => 1000 * (2500.9 - 2.2 * T - 0.0024 * T * T);
// Density of saturated steam (kg/m³) treated as an ideal gas: 0.59 at 100 °C (tables: 0.598).
export const steamRho = (T, P = psat(T)) => (P * 1000) / (R_V * (T + K0));
// Air pressure (kPa) at height h metres: the International Standard Atmosphere, valid to 11 km.
export const pAlt = (h) => ATM * Math.pow(1 - 2.25577e-5 * h, 5.25588);
// Surface tension of water (N/m) at T °C: the IAPWS 1994 formula. 0.0728 at 20 °C, 0.0589 at 100 °C.
export function sigmaW(T) { const t = 1 - (T + K0) / 647.096; return 0.2358 * Math.pow(Math.max(t, 0), 1.256) * (1 - 0.625 * t); }
// How much dissolved salt raises the boiling point: ΔT = i · K_b · molality, with i = 2 because
// each NaCl splits into two ions (real salt water behaves as about 1.8–1.9, so this is the top end).
export const saltRise = (gramsPerKg) => 2 * KB_EBU * (gramsPerKg / 1000 / M_NACL);
// Heat (W) a pot of water at T °C loses to a kitchen at `amb` °C. Two routes:
//  · evaporation from the open surface: mass leaves at h_m (ρ_v,surface − ρ_v,room) kg/m²s and each
//    kilogram takes its latent heat along. h_m = 0.007 m/s is the heat–mass analogy (Lewis relation,
//    h_m ≈ h ÷ ρc_p of air) for a natural-convection h of about 8 W/m²K. A lid keeps about 90% of
//    the vapour in (it condenses and drips back).
//  · convection and radiation from the wet part of the wall, and from the lid when it is on:
//    about 10 W/m²K in total.
// It is an estimate: draughts, the flame's own hot gas and the pot's shape all move it.
export function potLoss(T, { amb = 30, R = 0.1, wet = 0.07, lid = false, rh = 0.6 } = {}) {
  const A = Math.PI * R * R;
  const evap = Math.max(0, 0.007 * (steamRho(T) - rh * steamRho(amb)) * A * latent(T)) * (lid ? 0.1 : 1);
  const walls = 10 * (2 * Math.PI * R * wet + (lid ? A : 0)) * Math.max(0, T - amb);
  return { evap, walls, total: evap + walls };
}

// Colours used everywhere.
export const COL = {
  hot: '#ff7a59',
  cold: '#6fb6ff',
  heat: '#ffb547',     // heat flowing in
  water: '#6fb6ff',
  steam: '#8ef0ff',    // vapour and steam
  latent: '#c49bff',   // latent heat
  ok: '#5ce1a9',
  text: '#e8eef8',
};
export const hex = (c) => new THREE.Color(c).getHex();

// Numbers people can read.
export const fmt = (v, d = 1) => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString('en-IN') : v.toFixed(d));
export function fmtW(W, d = 1) {
  const a = Math.abs(W);
  if (a >= 1e6) return (W / 1e6).toFixed(d) + ' MW';
  if (a >= 1e3) return (W / 1e3).toFixed(d) + ' kW';
  if (a >= 10) return Math.round(W) + ' W';
  if (a >= 0.1) return W.toFixed(a >= 1 ? 1 : 2) + ' W';
  if (a >= 0.001) return (W * 1000).toFixed(W * 1000 >= 10 ? 0 : 1) + ' mW';
  return '0 W';
}
export function fmtJ(J, d = 1) {
  const a = Math.abs(J);
  if (a >= 1e6) return (J / 1e6).toFixed(d) + ' MJ';
  if (a >= 1e4) return (J / 1e3).toFixed(a >= 1e5 ? 0 : d) + ' kJ';
  return Math.round(J).toLocaleString('en-IN') + ' J';
}
export const fmtT = (t) => (t >= 3600 ? `${Math.floor(t / 3600)} h ${String(Math.floor((t % 3600) / 60)).padStart(2, '0')} min` : t >= 60 ? `${Math.floor(t / 60)} min ${String(Math.floor(t % 60)).padStart(2, '0')} s` : `${Math.round(t)} s`);

// ---------------------------------------------------------------- boards (live charts in 3D)
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.9)'; g.fillRect(0, 0, w, h); }
export function board(root, w, h, pxW, pxH, draw, pos) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = () => { draw(g, pxW, pxH); tex.needsUpdate = true; };
  redraw();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  m.position.set(...pos); root.add(m);
  return { tex, redraw, canvas: c, mesh: m };
}
export function axes(g, w, h, { x0 = 84, x1 = w - 28, y0 = h - 64, y1 = 70, xMax, yMax, xMin = 0, yMin = 0, xTicks, yTicks, xFmt = String, yFmt = String, xLabel = '', yLabel = '', logY = false }) {
  const X = (x) => x0 + ((x - xMin) / (xMax - xMin)) * (x1 - x0);
  const Y = logY
    ? (y) => y0 - ((Math.log10(Math.max(y, 1e-30)) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin))) * (y0 - y1)
    : (y) => y0 - ((y - yMin) / (yMax - yMin)) * (y0 - y1);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '19px sans-serif';
  for (const t of xTicks) { g.beginPath(); g.moveTo(X(t), y1); g.lineTo(X(t), y0); g.stroke(); const s = xFmt(t); g.fillText(s, X(t) - g.measureText(s).width / 2, y0 + 26); }
  for (const t of yTicks) { g.beginPath(); g.moveTo(x0, Y(t)); g.lineTo(x1, Y(t)); g.stroke(); const s = yFmt(t); g.fillText(s, x0 - 10 - g.measureText(s).width, Y(t) + 6); }
  g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y1); g.lineTo(x0, y0); g.lineTo(x1, y0); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = '18px sans-serif';
  if (xLabel) g.fillText(xLabel, x1 - g.measureText(xLabel).width, y0 + 52);
  if (yLabel) g.fillText(yLabel, x0 + 8, y1 - 10);
  return { X, Y, x0, x1, y0, y1 };
}
export function title(g, text, sub = '') {
  g.fillStyle = COL.text; g.font = 'bold 24px sans-serif'; g.fillText(text, 20, 34);
  if (sub) { const x = 34 + g.measureText(text).width; g.font = '17px sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText(sub, x, 34); }
}
export function line(g, pts, X, Y, col, wdt = 5, dash = null) {
  if (pts.length < 2) return;
  g.strokeStyle = col; g.lineWidth = wdt; g.setLineDash(dash || []); g.lineJoin = 'round'; g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))));
  g.stroke(); g.setLineDash([]);
}
export function dot(g, x, y, col, r = 10) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
export function legend(g, items, x = 24, y = 50, font = 18) {
  g.font = `bold ${font}px sans-serif`;
  for (const [n, c] of items) { g.fillStyle = c; g.fillRect(x, y, 16, 16); g.fillStyle = COL.text; g.fillText(n, x + 22, y + 15); x += 36 + g.measureText(n).width; }
}
export function dashH(g, X0, X1, y, text = '', col = 'rgba(255,255,255,.5)') {
  g.strokeStyle = col; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(X0, y); g.lineTo(X1, y); g.stroke(); g.setLineDash([]);
  if (text) { g.font = '17px sans-serif'; g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText(text, X1 - g.measureText(text).width - 4, y - 8); }
}
// Horizontal bars with labels: rows [{ label, value, color }], values in one unit.
export function bars(g, rows, { x = 20, y = 64, w = 600, rowH = 52, labelW = 230, unit = (v) => v, max = null } = {}) {
  const mx = max ?? Math.max(1e-9, ...rows.map((r) => Math.abs(r.value))) * 1.15, span = w - labelW - 20;
  rows.forEach((r, i) => {
    const yy = y + i * rowH, L = (Math.abs(r.value) / mx) * span;
    g.font = 'bold 19px sans-serif'; g.fillStyle = r.color; g.fillText(r.label, x, yy + 24);
    g.globalAlpha = 0.85; g.fillRect(x + labelW, yy + 6, Math.max(2, L), rowH - 18); g.globalAlpha = 1;
    g.font = '18px sans-serif'; g.fillStyle = '#fff'; const t = r.text ?? unit(r.value), tw = g.measureText(t).width;
    g.fillText(t, x + labelW + L + 8 + tw > w ? x + labelW + L - tw - 8 : x + labelW + L + 8, yy + 25);
  });
}

// ---------------------------------------------------------------- statistics
export function rng(seed = 1) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ---------------------------------------------------------------- 3D pieces
// Glowing dots, one instanced mesh, each with its own colour.
export function dots(n, r, color = 0xffffff, seg = 8) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const o = new THREE.Object3D(), col = new THREE.Color(color);
  for (let i = 0; i < n; i++) mesh.setColorAt(i, col);
  mesh.place = (i, x, y, z, s = 1) => { o.position.set(x, y, z); o.scale.setScalar(Math.max(0.0001, s)); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); };
  mesh.tint = (i, c) => mesh.setColorAt(i, c);
  mesh.done = () => { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; };
  return mesh;
}
// Little heat "sparks" that drift from a source: step(dt, rate, at, vel, life).
export function puffs(parent, n, r, color, rnd) {
  const d = dots(n, r, color); parent.add(d);
  const P = Array.from({ length: n }, () => ({ life: 0, max: 1, p: [0, -99, 0], v: [0, 0, 0] }));
  let acc = 0;
  return {
    mesh: d,
    step(dt, rate, at, vel, life = 1.2, shrink = true) {
      acc += rate * dt;
      for (let i = 0; i < n; i++) {
        const q = P[i];
        if (q.life <= 0 && acc >= 1) { acc -= 1; q.life = q.max = life * (0.75 + 0.5 * rnd()); q.p = at(); q.v = vel(q.p); }
        if (q.life > 0) { q.life -= dt; q.p[0] += q.v[0] * dt; q.p[1] += q.v[1] * dt; q.p[2] += q.v[2] * dt; }
        const k = q.life / q.max;
        d.place(i, q.p[0], q.p[1], q.p[2], q.life > 0 ? (shrink ? 0.35 + 0.65 * k : 1) : 0.0001);
      }
      if (acc > 20) acc = 20;
      d.done();
    },
    clear() { P.forEach((q) => { q.life = 0; }); acc = 0; },
  };
}
// A see-through glass box from (x0,y0) to (x1,y1), depth d, with bright edges.
export function chamber(parent, x0, x1, y0, y1, d, { color = 0xcfe8ff, opacity = 0.08, edge = 0x9fb4c8 } = {}) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, d), M.clear(color, opacity)); glass.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); g.add(glass);
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(glass.geometry), new THREE.LineBasicMaterial({ color: edge, transparent: true, opacity: 0.7 }));
  e.position.copy(glass.position); g.add(e);
  parent.add(g); g.glass = glass; g.edges = e;
  return g;
}
// An arrow that ignores depth, aimed from a point along a direction with a length.
const UP = new THREE.Vector3(0, 1, 0), tmpV = new THREE.Vector3();
export function flowArrow(color, r = 0.05, head = 0.28) {
  const a = arrow(color, 1, head, r);
  a.traverse((o) => { if (o.material) { o.material.depthTest = false; o.renderOrder = 10; } });
  a.aim = (from, dir, len) => {
    a.position.set(...from);
    tmpV.set(...dir); if (tmpV.lengthSq() < 1e-9) tmpV.set(1, 0, 0);
    a.quaternion.setFromUnitVectors(UP, tmpV.normalize());
    a.set(Math.max(0.001, len));
    if (len < 0.05) a.visible = false;
  };
  return a;
}
// Temperature to colour: deep blue (cold) through white to red-orange (hot), T in °C between lo and hi.
const C_COLD = new THREE.Color(0x3b7bff), C_MID = new THREE.Color(0xe8eef8), C_HOT = new THREE.Color(0xff5a2a);
export function tempColor(T, lo = 0, hi = 100, out = new THREE.Color()) {
  const k = clamp((T - lo) / (hi - lo), 0, 1);
  return k < 0.5 ? out.copy(C_COLD).lerp(C_MID, k * 2) : out.copy(C_MID).lerp(C_HOT, (k - 0.5) * 2);
}
export const tempCss = (T, lo, hi) => '#' + tempColor(T, lo, hi).getHexString();
// On a phone-width stage: hide minor labels and nudge the picture down, clear of the readout.
export function fitNarrow(stage, minor = []) {
  const narrow = stage.host.clientWidth < 560;
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const y = narrow && !inReel() ? -0.12 : 0;
  if (!stage.shift || stage.shift[1] !== y) stage.setShift(0, y);
  return narrow;
}
// True while the Glassbox studio records the reel: scenes then choose their own camera views.
export const inReel = () => document.body.classList.contains('gb-reel');
// Chart boards sit to the right of the model on screen. In the tall reel video they stack above the
// model instead, so everything fits the portrait frame.
export function reelBoards(boards, x = 0, stage = null, view = null) {
  const r = inReel(), wide = r && stage && stage.camera.aspect > 1.3;
  boards.forEach((b, i) => {
    if (!b.home) b.home = b.mesh.position.clone();
    if (r && !wide) { b.mesh.position.set(x, 8.6 - i * 3.0, 0); b.mesh.scale.setScalar(1.2); }
    else { b.mesh.position.copy(b.home); b.mesh.scale.setScalar(1); }
  });
  // The wide (16:9) video has room for the boards beside the model, so it keeps the chapter's own view.
  if (wide && view) { stage.controls.autoRotate = false; if (stage.home?.pos !== view.pos) stage.setView(view.pos, view.target, 0.01); }
}

// ---------------------------------------------------------------- the pot
// A steel pot cut open towards the viewer, standing on one burner of a gas stove. Each chapter
// tells it what the water is doing (set) and it animates the flame, the convection loop, the
// bubbles and the steam (step).
export function makePot(parent, { x = 0, y0 = 0, R = 2, H = 2.4, stove = true, seed = 7, nB = 120, nT = 110, glass = false } = {}) {
  const g = new THREE.Group(); g.position.set(x, y0, 0); parent.add(g);
  const rnd = rng(seed), col = new THREE.Color(), by = stove ? 0.98 : 0.1;
  const flames = [], arrows = [];
  const flameMat = new THREE.MeshBasicMaterial({ color: 0x4f9dff, transparent: true, opacity: 0.85, toneMapped: false, depthWrite: false });
  if (stove) {
    const body = box(R * 2.3, 0.2, R * 2.3, M.metal(0x7d8591, { roughness: 0.45 })); body.position.y = 0.1; g.add(body);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.3, 32), M.metal(0xc9a45a, { roughness: 0.4 })); cup.position.y = 0.35; g.add(cup);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.08, 32), M.matte(0x22252b)); cap.position.y = 0.54; g.add(cap);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.785, c = Math.cos(a), s = Math.sin(a);
      g.add(beam([c * R * 1.05, 0.2, s * R * 1.05], [c * R * 0.95, by - 0.08, s * R * 0.95], 0.05, M.matte(0x1c1f25)));
      g.add(beam([c * R * 0.95, by - 0.08, s * R * 0.95], [c * 0.8, by - 0.08, s * 0.8], 0.05, M.matte(0x1c1f25)));
    }
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * TAU, f = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.42, 8), flameMat);
      f.geometry.translate(0, 0.21, 0); f.position.set(Math.cos(a) * 0.66, 0.5, Math.sin(a) * 0.66); f.rotation.set(Math.sin(a) * 0.55, 0, -Math.cos(a) * 0.55);
      g.add(f); flames.push(f);
    }
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.3, ar = flowArrow(hex(COL.heat), 0.035, 0.18);
      ar.userData.at = [Math.cos(a) * R * 0.55, by - 0.32, Math.sin(a) * R * 0.55]; g.add(ar); arrows.push(ar);
    }
  }
  const wallMat = glass ? M.clear(0xdff2ff, 0.16) : M.metal(0xc3c9d3, { side: THREE.DoubleSide, roughness: 0.32 });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 64, 1, true, Math.PI * (glass ? 0 : 0.32), Math.PI * (glass ? 2 : 1.36)), wallMat); wall.position.y = by + H / 2 - 0.04; g.add(wall);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.08, 64), glass ? M.clear(0xdff2ff, 0.3) : M.metal(0xaab1bd, { roughness: 0.4 })); base.position.y = by - 0.04; g.add(base);
  const baseGlow = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.8, R * 0.8, 0.02, 48), new THREE.MeshBasicMaterial({ color: 0xff7a3a, transparent: true, opacity: 0, toneMapped: false, depthWrite: false })); baseGlow.position.y = by + 0.012; g.add(baseGlow);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x4aa3ff, roughness: 0.08, transparent: true, opacity: 0.3, depthWrite: false });
  const wgeo = new THREE.CylinderGeometry(R - 0.05, R - 0.05, 1, 56); wgeo.translate(0, 0.5, 0);
  const water = new THREE.Mesh(wgeo, waterMat); water.position.y = by; g.add(water);
  const skin = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.05, R - 0.05, 0.015, 56), new THREE.MeshBasicMaterial({ color: 0xbfe2ff, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false })); g.add(skin);
  const lid = new THREE.Group(); g.add(lid);
  const lidDisc = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.07, R + 0.07, 0.07, 64), M.clear(0xe6edf7, 0.42)); lid.add(lidDisc);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.22, 20), M.matte(0x1c1f25)); knob.position.y = 0.14; lid.add(knob);
  lid.position.y = by + H; lid.visible = false;
  const tracers = dots(nT, 0.034, 0xffffff); g.add(tracers);
  const tr = Array.from({ length: nT }, () => ({ u: rnd(), phi: rnd() * TAU, j: rnd() }));
  const bub = dots(nB, 0.06, 0xe6f8ff); g.add(bub);
  const B = Array.from({ length: nB }, (_, i) => ({ k: 0, r: R * 0.86 * Math.sqrt(rnd()), phi: rnd() * TAU, y: 0, v: 0, life: 0, max: 1, wall: i < 40 && rnd() < 0.3, j: rnd() }));
  const steam = puffs(g, 70, 0.075, 0xdfe8f5, rnd);
  const st = { level: 0.75, T: 25, flame: 0, air: 0, sing: 0, boil: 0, steam: 0, flow: 0, lid: false, heat: 0, lo: 20, hi: 105, jet: 0 };
  const HW = H - 0.12;
  let acc = 0, tt = 0;
  const api = {
    g, by, R, H, st, lid, water, wall,
    surfaceY: () => by + Math.max(0.001, st.level) * HW,
    set(o) { Object.assign(st, o); return api; },
    step(dt) {
      tt += dt;
      const wy = api.surfaceY(), wet = st.level > 0.02;
      // flame
      flames.forEach((f, i) => { f.visible = st.flame > 0.02; f.scale.set(1, (0.35 + 1.25 * st.flame) * (0.85 + 0.3 * Math.sin(tt * 23 + i * 1.7)), 1); });
      arrows.forEach((a, i) => { const L = st.heat * (0.5 + 0.12 * Math.sin(tt * 5 + i)); a.aim(a.userData.at, [0, 1, 0], L); a.visible = st.heat > 0.03; });
      baseGlow.material.opacity = 0.35 * st.heat;
      // water
      water.visible = skin.visible = wet;
      water.scale.y = Math.max(0.001, st.level * HW + st.boil * 0.02 * Math.sin(tt * 17));
      skin.position.y = by + water.scale.y;
      tempColor(st.T, st.lo, st.hi, col); waterMat.color.set(0x4aa3ff).lerp(col, 0.35);
      lid.visible = st.lid;
      // convection loop: up the middle, out along the top, down the wall, in along the base
      const y0 = by + 0.1, y1 = wy - 0.1, rw = R * 0.86, hgt = Math.max(0.01, y1 - y0);
      const sp = 0.03 + 0.42 * st.flow;
      tr.forEach((p, i) => {
        p.u = (p.u + dt * sp * (0.6 + 0.8 * p.j)) % 1;
        const r0 = R * (0.08 + 0.3 * p.j), seg = [hgt, rw - r0, hgt, rw - r0], tot = seg[0] + seg[1] + seg[2] + seg[3];
        let d = p.u * tot, r, y, warm;
        if (d < seg[0]) { r = r0; y = y0 + d; warm = 1; } else if ((d -= seg[0]) < seg[1]) { r = r0 + d; y = y1; warm = 0.6; } else if ((d -= seg[1]) < seg[2]) { r = rw; y = y1 - d; warm = 0.1; } else { d -= seg[2]; r = rw - d; y = y0; warm = 0.5 + 0.5 * (d / seg[3]); }
        const jit = st.boil * 0.12;
        tracers.place(i, r * Math.cos(p.phi) + jit * Math.sin(tt * 9 + i), y + jit * Math.sin(tt * 11 + i * 2), r * Math.sin(p.phi), wet && hgt > 0.15 ? 0.6 + 0.6 * st.flow : 0.0001);
        tracers.tint(i, tempColor(st.T + (warm - 0.4) * 14 * Math.min(1, st.flow * 2), st.lo, st.hi, col));
      });
      tracers.done();
      // bubbles: 1 = dissolved air clinging to the metal, 2 = vapour that collapses in cooler water
      // (the "singing"), 3 = vapour that makes it to the top (boiling)
      acc += dt * (st.sing * 45 + st.boil * 95) * (wet ? 1 : 0);
      const nAir = Math.round(clamp(st.air, 0, 1) * 40);
      B.forEach((b, i) => {
        if (i < 40) {
          const on = i < nAir && wet && st.boil < 0.5, s = on ? (0.35 + 0.5 * st.air) * (0.7 + 0.5 * b.j) : 0.0001;
          if (b.wall) bub.place(i, (R - 0.09) * Math.cos(b.phi), y0 + (wy - y0) * 0.7 * b.j, (R - 0.09) * Math.sin(b.phi), s);
          else bub.place(i, b.r * Math.cos(b.phi), by + 0.05 + 0.01 * Math.sin(tt * 3 + i), b.r * Math.sin(b.phi), s);
          return;
        }
        if (b.k === 0 && acc >= 1) {
          acc -= 1; b.r = R * 0.84 * Math.sqrt(rnd()); b.phi = rnd() * TAU; b.y = by + 0.06; b.j = rnd();
          b.k = rnd() * (st.sing + st.boil) < st.boil ? 3 : 2; b.life = b.max = 0.35 + 0.3 * rnd(); b.v = 1.3 + 1.5 * rnd();
        }
        let s = 0.0001;
        if (b.k === 2) { b.life -= dt; b.y += dt * 0.5; s = 1.25 * Math.sin(Math.PI * clamp(1 - b.life / b.max, 0, 1)); if (b.life <= 0) b.k = 0; }
        if (b.k === 3) { b.y += dt * b.v; b.r = Math.max(0, b.r + dt * 0.3 * Math.sin(tt * 8 + i)); s = 0.8 + 1.5 * clamp((b.y - by) / Math.max(0.2, wy - by), 0, 1) * (0.6 + 0.8 * b.j); if (b.y > wy) b.k = 0; }
        if (!wet) b.k = 0;
        bub.place(i, Math.min(b.r, R * 0.9) * Math.cos(b.phi), b.y, Math.min(b.r, R * 0.9) * Math.sin(b.phi), b.k ? s : 0.0001);
      });
      if (acc > 30) acc = 30;
      bub.done();
      // the white wisps above the pot (tiny droplets: real steam is invisible)
      const top = by + H + (st.lid ? 0.1 : -0.2);
      if (st.jet > 0) steam.step(dt, 60 * st.jet, () => [(rnd() - 0.5) * 0.1, by + H + 0.6, (rnd() - 0.5) * 0.1], () => [(rnd() - 0.5) * 1.6, 2.2 + rnd(), (rnd() - 0.5) * 0.8], 0.8);
      else steam.step(dt, st.steam * (st.lid ? 5 : 42), () => { const a = rnd() * TAU, r = st.lid ? R + 0.1 : R * 0.8 * Math.sqrt(rnd()); return [r * Math.cos(a), st.lid ? top : Math.max(wy, top - 0.6), r * Math.sin(a)]; }, () => [(rnd() - 0.5) * 0.25, 0.55 + rnd() * 0.5, (rnd() - 0.5) * 0.25], 1.7);
    },
  };
  return api;
}

// ---------------------------------------------------------------- sound
// Filtered noise for the rumble of a pot coming to the boil and the hiss of a cooker's whistle. The
// browser only lets a page make sound after you touch it, so it starts on the first tap or key.
export function boilSound() {
  let ac = null, src = null, bp = null, gain = null;
  const start = () => {
    if (ac || inReel()) return;
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    bp = ac.createBiquadFilter(); bp.type = 'bandpass';
    gain = ac.createGain(); gain.gain.value = 0;
    src.connect(bp).connect(gain).connect(ac.destination); src.start();
  };
  window.addEventListener('pointerdown', start); window.addEventListener('keydown', start);
  return {
    set(level, freq = 700, q = 0.8) {
      if (!ac) return;
      const t = ac.currentTime;
      gain.gain.setTargetAtTime(audio.muted ? 0 : clamp(level, 0, 0.5), t, 0.12);
      bp.frequency.setTargetAtTime(freq, t, 0.12); bp.Q.setTargetAtTime(q, t, 0.12);
    },
    dispose() {
      window.removeEventListener('pointerdown', start); window.removeEventListener('keydown', start);
      try { src?.stop(); ac?.close(); } catch { /* already closed */ }
      ac = null;
    },
  };
}
export const link = (slug, name, hash = '') => `<a href="https://glassbox.how/${slug}/${hash ? '#' + hash : ''}">${name}</a>`;
export { clamp, beam, box, sphere };
