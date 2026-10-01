// Chapter 5: pressure sets the boiling point (1 scene unit ≈ 5 cm).
// Up a mountain: air pressure from the International Standard Atmosphere,
//   P = 101.325 (1 − 2.25577e-5 h)^5.25588 kPa, and the boiling point from the steam tables
//   (IAPWS-IF97, boil.js). Heights: Mumbai 14 m, Bengaluru 920 m, Shimla 2,276 m, Leh 3,524 m,
//   Everest's summit 8,849 m (2020 China–Nepal survey). That gives 99.9, 96.9, 92.4, 88.2 and
//   about 70 °C. Real weather moves the pressure by a per cent or two, and the real air over
//   Everest is a little denser than the standard atmosphere, so quoted figures run 68–72 °C.
// Pressure cooker: 1.5 kg of dal and water, a 2 kW flame at 60% (pot.js), losing 12 W/m²K from
//   0.2 m² of hot metal. The first steam pushes the air out, so the pressure inside follows the
//   vapour-pressure curve. The weight sits on a vent pipe: it lifts when (pressure inside −
//   outside) × bore area = weight × g. We assume a 3 mm bore (7.07 mm²); then a 70 g weight holds
//   97 kPa above the outside air, close to the 1 kg/cm² (98 kPa, "15 psi") that Indian cookers
//   are built for (IS 2347), and the water boils at about 120 °C. Steam leaves an open vent at
//   the speed of sound: ṁ = 0.667 A P ÷ √(R_v T) (choked flow of steam, discharge taken as 1),
//   about 2 g/s, which carries off more heat than the flame supplies. So the pressure drops, the
//   weight falls back (we let it reseat 15 kPa lower, because a real weight sticks a little), and
//   the cycle repeats: the whistles. The cooker's own gauge pressure is fixed by the weight, so in
//   Leh the same cooker reaches only about 114 °C.
// Cooking speed: the kitchen rule that reactions roughly double in speed for every 10 °C,
//   starting from 45 minutes for unsoaked toor dal in an open pot at sea level. A rule of thumb.
// Vacuum jar: 200 g of water at 25 °C. When the jar's pressure falls below the water's vapour
//   pressure (3.17 kPa at 25 °C) it boils, and the latent heat comes out of the water itself, so
//   it cools along the curve: dm = m c dT ÷ L. Below 0.61 kPa (the triple point) it boils and
//   freezes at once. The cooling rate is illustrative; the temperatures and masses are computed.
import { THREE, M } from '../kit.js';
import {
  ATM, C_WATER, R_V, K0, STOVE_ETA, COL, hex, psat, tsat, pAlt, latent, makePot, boilSound, dots, flowArrow, rng, board, panelBg, axes, title, line, dot, dashH,
  fitNarrow, inReel, reelBoards, clamp, fmtT, link,
} from '../boil.js';

export const PLACES = [
  { n: 'Mumbai', h: 14 }, { n: 'Bengaluru', h: 920 }, { n: 'Shimla', h: 2276 }, { n: 'Leh', h: 3524 }, { n: 'Everest', h: 8849 },
];
const BORE = Math.PI * 0.0015 ** 2, CK = { kg: 1.5, flame: 2000, hA: 12 * 0.2, amb: 30, hyst: 15, lidA: Math.PI * 0.11 ** 2, fast: 20 };
const VIEW = { pos: [2.2, 4.55, 11.0], target: [2.2, 3.3, 0] };
export const gaugeOf = (grams) => ((grams / 1000) * 9.81) / BORE / 1000;         // kPa the weight holds back
export const dalMin = (Tb) => 45 * Math.pow(2, (100 - Tb) / 10);
const nearest = (h) => PLACES.find((p) => Math.abs(p.h - h) < 40);

export default {
  id: 'pressure',
  short: 'Pressure',
  title: 'Pressure changes everything',
  subtitle: 'Water boils at 88 °C in Leh, 120 °C in a pressure cooker and at room temperature in a vacuum.',
  view: VIEW,
  learn: `<p>If boiling starts when vapour pressure equals the pressure outside, then the boiling point is not fixed. <b>Change the pressure and you move it.</b></p>
    <p><b>Up a mountain</b> there is less air above you. In Mumbai, at sea level, water boils at 100 °C. In Bengaluru (920 m) it boils at about 97 °C, in Shimla at about 92 °C and in <b>Leh</b>, at 3,524 m, at about <b>88 °C</b>. The water bubbles happily, but it is 12 degrees cooler, so rice and dal take far longer in an open pot. On the summit of Everest it would boil at about 70 °C, too cool to cook an egg properly.</p>
    <p>A <b>pressure cooker</b> does the opposite. The lid seals with a rubber gasket, so steam cannot leave and the pressure climbs. At about <b>2 atmospheres</b> water does not boil until about <b>120 °C</b>, and food cooks three to four times faster. That is why the cooker is in nearly every Indian kitchen, and why it is essential in Ladakh. The <b>weight</b> on the vent is the control: when the steam pushes hard enough to lift it, steam escapes with a <b>whistle</b> and the pressure drops back. If the vent ever gets blocked, the <b>safety valve</b> gives way first, and the gasket is made to push out through a slot in the lid as a last resort.</p>
    <p>Go the other way and pump the air <b>out</b> of a jar. At 3 kPa, about one thirtieth of normal, water boils at <b>25 °C</b>. It is not hot. Boiling steals heat from the water itself, so it gets colder as it boils, and at 0.6 kPa it can boil and freeze at the same time (FreezeClear picks up the story there). How gas pressure, volume and temperature are tied together is in ${link('gaslawclear', 'GasLawClear')} and ${link('pressureclear', 'PressureClear')}.</p>
    <p class="tip"><b>Try it:</b> jump between Mumbai and Leh. Then switch to the cooker and count the whistles. Every whistle is steam, and heat, thrown away, which is why cooks turn the flame down after the first one. Then turn the flame off and watch how long the pressure takes to fall.</p>`,
  terms: [
    { t: 'Atmospheric pressure', d: 'The weight of the air above you pressing on everything. About 101 kPa at sea level and 66 kPa in Leh.' },
    { t: 'Gauge pressure', d: 'Pressure above the surrounding air. A cooker at 1 kg/cm² gauge has about 2 atmospheres inside.' },
    { t: 'Weight valve (whistle)', d: 'A small weight on the cooker\'s vent pipe. It lifts and lets steam out when the pressure inside reaches its set value.' },
    { t: 'Triple point', d: 'The one pressure and temperature (0.61 kPa, 0.01 °C) at which ice, water and vapour all exist together.' },
  ],
  defaults: { focus: 'alt', alt: 14, weight: 70, cflame: true, vac: 101.3 },
  controls: [
    { key: 'focus', type: 'seg', label: 'Look at', options: [{ v: 'alt', label: 'Up a mountain' }, { v: 'cooker', label: 'Pressure cooker' }, { v: 'vac', label: 'Vacuum jar' }] },
    { key: 'alt', type: 'range', label: 'Height above the sea', min: 0, max: 8849, step: 1, ends: ['sea level', 'Everest, 8,849 m'], fmt: (v) => `${Math.round(v).toLocaleString('en-IN')} m${nearest(v) ? ' · ' + nearest(v).n : ''}` },
    { key: 'place', type: 'buttons', label: 'Go to', items: PLACES.map((p) => ({ label: p.n, act: (s) => { s.alt = p.h; if (s.focus === 'vac') s.focus = 'alt'; s._alt = true; } })) },
    { key: 'weight', type: 'range', label: 'Cooker: weight on the vent', min: 30, max: 110, step: 1, ends: ['30 g', '110 g'], fmt: (v) => `${v} g · holds ${gaugeOf(v).toFixed(0)} kPa`, hint: 'A typical cooker weight is designed to hold about 1 kg/cm² (98 kPa).' },
    { key: 'cflame', type: 'toggle', label: 'Cooker: flame on' },
    { key: 'vac', type: 'log', label: 'Vacuum jar: pressure left inside', min: 0.3, max: 101.3, ends: ['0.3 kPa', 'normal air'], fmt: (v) => (v < 10 ? v.toFixed(2) : v.toFixed(1)) + ' kPa' },
    { key: 'go', type: 'buttons', label: 'Start again', items: [{ label: 'Cooker: fresh and cold', act: (s, inst) => { s.focus = 'cooker'; s.cflame = true; inst.resetCooker(); } }, { label: 'Jar: fresh water at 25 °C', act: (s, inst) => { s.focus = 'vac'; inst.resetVac(); } }] },
  ],
  onChange(s, key) {
    if (key === 'alt') { if (s.focus === 'vac') s.focus = 'alt'; s._alt = true; }
    if (key === 'weight' || key === 'cflame') s.focus = 'cooker';
    if (key === 'vac') s.focus = 'vac';
  },
  quiz: [
    { q: 'Why does dal take so long to cook in an open pot in Leh?', options: ['The stoves are weaker', 'Thin air means lower pressure, so water boils at only about 88 °C', 'The water is harder', 'Cold air cools the pot'], answer: 1, why: 'At 3,524 m the air pressure is about 66 kPa. Water\'s vapour pressure reaches that at about 88 °C, and it cannot get hotter in an open pot.' },
    { q: 'How does a pressure cooker cook faster?', options: ['It traps steam, raising the pressure, so water stays liquid up to about 120 °C', 'It makes the flame hotter', 'It stirs the food', 'The whistle adds heat'], answer: 0, why: 'About 2 atmospheres inside moves the boiling point to about 120 °C. Hotter water cooks food three to four times faster.' },
    { q: 'You have just turned off the flame under a cooker. Why must you not force the lid open?', options: ['The food will be undercooked', 'The gasket will tear', 'The whistle will break', 'The inside is still at about 2 atmospheres, and the 120 °C water would flash into steam'], answer: 3, why: 'The steam pushes on the lid with the weight of hundreds of kilograms, and water above 100 °C boils violently the moment the pressure is released.' },
    { q: 'In a jar pumped down to 3 kPa, water at 25 °C…', options: ['Freezes instantly', 'Stays still', 'Boils, and gets colder as it does', 'Heats up'], answer: 2, why: 'Its vapour pressure (3.17 kPa) now exceeds the pressure around it, so it boils. The latent heat comes from the water, which cools.' },
  ],
  reel: [
    { ms: 5200, caption: 'In Leh, 3,524 metres up, the air is thinner, so water boils at only 88 °C. Food in an open pot takes far longer.', set: { focus: 'alt', alt: 14 }, anim: { alt: [14, 3524] }, view: { pos: [-0.6, 5.4, 9.6], target: [-0.6, 4.8, 0] }, spin: 0.05 },
    { ms: 5400, caption: 'A pressure cooker does the opposite. About 2 atmospheres inside pushes the boiling point to 120 °C, until the whistle lets steam out.', set: { focus: 'cooker', alt: 14, weight: 70, cflame: true }, act: (s, inst) => { inst.resetCooker(); inst.preRun(s, 560); }, view: { pos: [-0.6, 5.4, 9.6], target: [-0.6, 4.8, 0] }, spin: 0.05 },
  ],

  build({ stage, s: s0 }) {
    const root = new THREE.Group(); stage.root.add(root);
    const X0 = -0.9, rnd = rng(41);
    const pot = makePot(root, { x: X0, seed: 23 });
    const snd = boilSound();
    // air pressing down on an open pot
    const airA = Array.from({ length: 5 }, (_, i) => { const a = flowArrow(hex(COL.cold), 0.04, 0.2); a.userData.x = X0 - 1.3 + i * 0.65; root.add(a); return a; });
    // the cooker's lid: gasket, long handle, vent pipe and weight, safety valve
    const gC = new THREE.Group(); gC.position.set(X0, pot.by + pot.H - 0.04, 0); root.add(gC);
    const lidM = new THREE.Mesh(new THREE.CylinderGeometry(pot.R + 0.1, pot.R + 0.1, 0.16, 64), M.clear(0xc9d0db, 0.5, { metalness: 0.6, roughness: 0.3 })); lidM.position.y = 0.08; gC.add(lidM);
    const gasket = new THREE.Mesh(new THREE.TorusGeometry(pot.R - 0.02, 0.06, 10, 64), M.matte(0x15171b)); gasket.rotation.x = Math.PI / 2; gasket.position.y = 0.0; gC.add(gasket);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.2, 0.34), M.matte(0x15171b)); handle.position.set(pot.R + 1.0, 0.1, 0); gC.add(handle);
    const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.26, 16), M.metal(0xd9dde4)); vent.position.y = 0.28; gC.add(vent);
    const wt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.36, 24), M.metal(0xb7bdc8, { roughness: 0.35 })); gC.add(wt);
    const sv = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 20), M.plastic(0xd94a3a)); sv.position.set(-pot.R * 0.55, 0.2, 0.3); gC.add(sv);
    // the vacuum jar
    const gV = new THREE.Group(); gV.position.set(X0, 0, 0); root.add(gV);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.6, 0.2, 64), M.matte(0x2b3039)); plate.position.y = 0.1; gV.add(plate);
    const cup = makePot(gV, { x: 0, y0: 0.1, R: 0.95, H: 1.5, stove: false, glass: true, seed: 5, nB: 90, nT: 40 });
    const jarMat = M.clear(0xcfe8ff, 0.1);
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 2.6, 64, 1, true), jarMat); jar.position.y = 1.5; gV.add(jar);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.1, 48, 20, 0, Math.PI * 2, 0, Math.PI / 2), jarMat); dome.position.y = 2.8; gV.add(dome);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.03, 8, 64), new THREE.MeshBasicMaterial({ color: 0x9fb4c8 })); edge.rotation.x = Math.PI / 2; edge.position.y = 0.2; gV.add(edge);
    const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.6, 12), M.matte(0x15171b)); hose.rotation.z = Math.PI / 2; hose.position.set(2.9, 0.3, 0); gV.add(hose);
    const NA = 150, air = dots(NA, 0.035, hex(COL.cold)); gV.add(air);
    const ap = Array.from({ length: NA }, () => { const a = rnd() * 6.283, r = 1.9 * Math.sqrt(rnd()), y = 0.4 + rnd() * 3.6; return { x: r * Math.cos(a), y, z: r * Math.sin(a), ok: r < Math.sqrt(Math.max(0, 4.0 - Math.max(0, y - 2.8) ** 2)) && !(r < 1.05 && y < 1.75), j: rnd() }; });
    const ice = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.08, 40), new THREE.MeshStandardMaterial({ color: 0xf2fbff, roughness: 0.5, transparent: true, opacity: 0.9 })); gV.add(ice);

    const lMain = stage.label('', [X0, 4.6, 0], root, 'hot'), lT = stage.label('', [1.5, 2.3, 0.9], root, 'hot'), lSv = stage.label('safety valve', [X0 - 2.2, 4.0, 0.3], root), lWt = stage.label('weight (whistle)', [X0 + 1.4, 4.35, 0], root);
    lT.element.style.setProperty('--c', COL.hot);

    // ---------------------------------------------------------------- state
    let S = s0, focus = '', key = '', tt = 0;
    const ck = { T: 30, m: CK.kg, t: 0, open: false, whistles: 0, lost: 0, rows: [], marks: [], Pin: ATM, flow: 0 };
    const vk = { T: 25, m: 0.2, t: 0, lost: 0, ice: false, rows: [], boiling: false };
    const resetCooker = () => Object.assign(ck, { T: 30, m: CK.kg, t: 0, open: false, whistles: 0, lost: 0, rows: [], marks: [], flow: 0 });
    const resetVac = () => Object.assign(vk, { T: 25, m: 0.2, t: 0, lost: 0, ice: false, rows: [], boiling: false });
    function stepCooker(dt) {
      const Pa = pAlt(S.alt), set = gaugeOf(S.weight);
      ck.Pin = Math.max(Pa, psat(ck.T));
      const g = ck.Pin - Pa;
      if (!ck.open && g >= set) { ck.open = true; ck.whistles++; ck.marks.push(ck.t); }
      else if (ck.open && g <= Math.max(0.5, set - CK.hyst)) ck.open = false;
      ck.flow = ck.open ? (0.667 * BORE * ck.Pin * 1000) / Math.sqrt(R_V * (ck.T + K0)) : 0;
      const heat = S.cflame && ck.m > 0.3 ? CK.flame * STOVE_ETA : 0, loss = CK.hA * (ck.T - CK.amb);
      ck.T += ((heat - loss - ck.flow * latent(ck.T)) * dt) / (ck.m * C_WATER);
      ck.m -= ck.flow * dt; ck.lost += ck.flow * dt; ck.t += dt;
    }
    function stepVac(dt) {
      const P = S.vac, Ts = P <= 0.6117 ? 0.01 : tsat(P);
      vk.boiling = vk.T > Ts + 0.03 && !vk.ice;
      if (vk.boiling) { const dT = -(vk.T - Ts) * (1 - Math.exp(-0.3 * dt)); const dm = (vk.m * C_WATER * -dT) / latent(vk.T); vk.T += dT; vk.m -= dm; vk.lost += dm; }
      else if (!vk.ice) vk.T = Math.min(Ts, vk.T + (25 - vk.T) * 0.004 * dt);
      if (P <= 0.6117 && vk.T <= 0.06) vk.ice = true;
      if (vk.ice && P > 0.7) { vk.ice = false; vk.T = 0.5; }
      vk.t += dt;
    }
    const preRun = (s, secs) => { S = s; for (let t = 0; t < secs; t += 0.25) { stepCooker(0.25); if (!ck.rows.length || ck.t - ck.rows[ck.rows.length - 1][0] >= 3) ck.rows.push([ck.t, ck.T]); } };

    const bA = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h);
      if (focus === 'cooker') {
        title(g, 'Inside the cooker', 'time-lapse ×20');
        const t1 = Math.max(600, ck.t * 1.05), stp = t1 > 1500 ? 600 : 300, xt = []; for (let v = 0; v <= t1; v += stp) xt.push(v);
        const { X, Y } = axes(g, w, h, { x0: 70, y1: 62, y0: h - 44, xMax: t1, yMin: 20, yMax: 135, xTicks: xt, yTicks: [25, 50, 75, 100, 125], xFmt: (v) => (v / 60).toFixed(0) + ' min', yFmt: (v) => v + '°' });
        dashH(g, X(0), X(t1), Y(tsat(pAlt(S.alt))), 'open-pot boiling point here', 'rgba(111,182,255,.7)');
        dashH(g, X(0), X(t1), Y(tsat(pAlt(S.alt) + gaugeOf(S.weight))), 'the weight lifts', 'rgba(255,181,71,.8)');
        g.fillStyle = COL.heat; ck.marks.slice(-40).forEach((t) => g.fillRect(X(t) - 1, Y(20) - 12, 2, 12));
        line(g, ck.rows, X, Y, COL.hot, 4);
      } else if (focus === 'vac') {
        title(g, 'Water in the jar', 'it cools as it boils');
        const t1 = Math.max(40, vk.t);
        const { X, Y } = axes(g, w, h, { x0: 70, y1: 62, y0: h - 44, xMin: Math.max(0, t1 - 120), xMax: t1, yMin: -2, yMax: 30, xTicks: [], yTicks: [0, 10, 20, 30], yFmt: (v) => v + '°' });
        const Ts = S.vac <= 0.6117 ? 0.01 : tsat(S.vac);
        if (Ts < 30) dashH(g, X(Math.max(0, t1 - 120)), X(t1), Y(Ts), `boiling point at ${S.vac < 10 ? S.vac.toFixed(2) : S.vac.toFixed(0)} kPa`, 'rgba(142,240,255,.8)');
        line(g, vk.rows.filter((r) => r[0] >= t1 - 120), X, Y, COL.hot, 5);
      } else {
        title(g, 'Boiling point against height', 'open pot');
        const { X, Y } = axes(g, w, h, { x0: 70, y1: 62, y0: h - 44, xMax: 9000, yMin: 65, yMax: 102, xTicks: [0, 2000, 4000, 6000, 8000], yTicks: [70, 80, 90, 100], xFmt: (v) => (v / 1000).toFixed(0) + ' km', yFmt: (v) => v + '°' });
        line(g, Array.from({ length: 46 }, (_, i) => [i * 200, tsat(pAlt(i * 200))]), X, Y, COL.hot, 5);
        g.font = '16px sans-serif';
        PLACES.forEach((p, i) => { const T = tsat(pAlt(p.h)); dot(g, X(p.h), Y(T), COL.cold, 5); g.fillStyle = COL.text; g.fillText(`${p.n} ${T.toFixed(0)}°`, Math.min(X(p.h) + 10, w - 130), Y(T) + (i % 2 ? 22 : -10) + (i === 0 ? 30 : 0)); });
        dot(g, X(S.alt), Y(tsat(pAlt(S.alt))), '#fff', 9);
      }
    }, [5.3, 3.4, 0]);
    const bB = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Boiling point against pressure', 'one curve for all three');
      const { X, Y } = axes(g, w, h, { x0: 70, y1: 62, y0: h - 44, xMin: -0.52, xMax: 2.4, yMin: -5, yMax: 130, xTicks: [0, 1, 2].concat([Math.log10(0.6117)]), yTicks: [0, 25, 50, 75, 100, 125], xFmt: (v) => (v < 0 ? '0.6' : String(10 ** v)) + (v === 2 ? ' kPa' : ''), yFmt: (v) => v + '°' });
      line(g, Array.from({ length: 60 }, (_, i) => { const lp = Math.log10(0.6117) + (i / 59) * (2.4 - Math.log10(0.6117)); return [lp, tsat(10 ** lp)]; }), X, Y, COL.hot, 5);
      const mark = (P, name, col, dy = -12) => { const T = tsat(P); dot(g, X(Math.log10(P)), Y(T), col, 5); g.fillStyle = COL.text; g.font = '15px sans-serif'; g.fillText(name, X(Math.log10(P)) - g.measureText(name).width - 8, Y(T) + dy); };
      mark(pAlt(8849), 'Everest', COL.cold); mark(pAlt(3524), 'Leh', COL.cold); mark(ATM, 'Mumbai', COL.cold); mark(ATM + 98, 'cooker', COL.heat, 4); mark(3.17, 'room temperature', COL.steam);
      const P = focus === 'cooker' ? ck.Pin : focus === 'vac' ? Math.max(0.6117, S.vac) : pAlt(S.alt);
      dot(g, X(Math.log10(P)), Y(tsat(P)), '#fff', 9);
    }, [5.3, 1.05, 0]);

    return {
      resetCooker, resetVac, preRun,
      dispose() { snd.dispose(); },
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s; tt += dt;
        fitNarrow(stage, [lSv, lWt]); reelBoards([bA, bB], -0.6, stage, VIEW);
        if (s.focus !== focus) { focus = s.focus; key = ''; }
        const isC = focus === 'cooker', isV = focus === 'vac', Pa = pAlt(s.alt), Tb = tsat(Pa);
        pot.g.visible = !isV; gC.visible = isC; gV.visible = isV; lSv.visible = lSv.visible && isC; lWt.visible = lWt.visible && isC;
        airA.forEach((a, i) => { const L = 0.25 + 0.75 * (Pa / ATM); a.aim([a.userData.x, pot.by + pot.H + 0.35 + L + 0.08 * Math.sin(tt * 2 + i), 0.2], [0, -1, 0], L); a.visible = focus === 'alt'; });
        let hiss = 0;
        if (isC) {
          for (let i = 0; i < CK.fast; i++) stepCooker(dt);
          if (!ck.rows.length || ck.t - ck.rows[ck.rows.length - 1][0] >= 3) { ck.rows.push([ck.t, ck.T]); if (ck.rows.length > 700) ck.rows.splice(0, 2); }
          const boilIn = ck.T >= Tb - 0.5;
          pot.set({ level: clamp(ck.m / 2.6, 0, 1), T: ck.T, lo: 20, hi: 125, flame: s.cflame ? 0.67 : 0, heat: s.cflame ? 0.67 : 0, air: 0, sing: !boilIn && ck.T > 75 ? 0.5 : 0, boil: boilIn && s.cflame ? (ck.open ? 0.8 : 0.2) : 0, steam: 0, flow: 0.5, lid: false, jet: ck.open ? 1 : 0 });
          wt.position.y = 0.5 + (ck.open ? 0.16 + 0.03 * Math.sin(tt * 60) : 0); wt.rotation.z = ck.open ? 0.08 * Math.sin(tt * 47) : 0;
          hiss = ck.open ? 0.3 : 0;
          const gP = ck.Pin - Pa;
          lMain.element.style.setProperty('--c', gP > 5 ? COL.hot : COL.ok);
          lMain.element.innerHTML = gP > 5 ? `inside: <b>${ck.Pin.toFixed(0)} kPa</b> · ${(ck.Pin / ATM).toFixed(2)} atm${ck.open ? ' · <b>whistle!</b>' : ''}` : 'no pressure inside';
          lT.element.innerHTML = `inside <b>${ck.T.toFixed(1)} °C</b>`;
        } else if (isV) {
          for (let i = 0; i < 4; i++) stepVac(dt);
          if (!vk.rows.length || vk.t - vk.rows[vk.rows.length - 1][0] >= 0.5) { vk.rows.push([vk.t, vk.T]); if (vk.rows.length > 600) vk.rows.shift(); }
          const Ts = s.vac <= 0.6117 ? 0.01 : tsat(s.vac), vig = vk.boiling ? clamp((vk.T - Ts) / 6, 0.12, 1) : 0;
          cup.set({ level: clamp(vk.m / 0.2, 0, 1) * 0.7, T: vk.T, lo: -5, hi: 60, boil: vig, steam: vig * 0.4, flow: 0.1, air: 0, sing: 0 }); cup.step(dt);
          ice.visible = vk.ice; ice.position.y = cup.surfaceY() + 0.1;
          const shown = Math.round(NA * clamp(Math.log(s.vac / 0.3) / Math.log(101.3 / 0.3), 0.03, 1));
          ap.forEach((p, i) => air.place(i, p.x + 0.05 * Math.sin(tt * 3 + i), p.y + 0.05 * Math.sin(tt * 2.3 + i * 2), p.z, p.ok && i < shown ? 1 : 0.0001)); air.done();
          lMain.element.style.setProperty('--c', vk.ice ? COL.steam : vk.boiling ? COL.hot : COL.cold);
          lMain.element.innerHTML = vk.ice ? '<b>boiling and freezing at once</b>' : vk.boiling ? `<b>boiling at ${vk.T.toFixed(1)} °C</b>` : `jar: ${s.vac < 10 ? s.vac.toFixed(2) : s.vac.toFixed(0)} kPa · still`;
          lT.element.innerHTML = `water <b>${vk.T.toFixed(1)} °C</b>`;
        } else {
          pot.set({ level: 0.6, T: Tb, lo: 20, hi: 105, flame: 0.67, heat: 0.67, air: 0, sing: 0, boil: 0.7, steam: 0.6, flow: 0.6, lid: false, jet: 0 });
          const pl = nearest(s.alt);
          lMain.element.style.setProperty('--c', COL.cold); lMain.element.innerHTML = `${pl ? pl.n + ': ' : ''}air pressure <b>${Pa.toFixed(1)} kPa</b>`;
          lT.element.innerHTML = `boiling at <b>${Tb.toFixed(1)} °C</b>`;
        }
        if (!isV) pot.step(dt);
        snd.set(hiss, 3200, 2.5);
        const k = `${focus}|${Math.round(s.alt / 5)}|${ck.rows.length}|${vk.rows.length}|${s.weight}|${s.vac.toFixed(2)}`;
        if (k !== key) { key = k; bA.redraw(); bB.redraw(); }
      },
      readout: (s) => {
        const Pa = pAlt(s.alt), Tb = tsat(Pa), pl = nearest(s.alt);
        if (focus === 'cooker') {
          const set = gaugeOf(s.weight), Tset = tsat(Pa + set), gP = Math.max(0, ck.Pin - Pa), F = gP * 1000 * CK.lidA;
          return `<div class="big" style="color:${gP > 5 ? COL.hot : COL.ok}">${gP > 5 ? 'Under pressure: do not open' : ck.t > 60 && !s.cflame ? 'Pressure gone: safe to open' : 'Heating up'}</div>
            <div class="row"><span>Inside (outside air${pl ? ' in ' + pl.n : ''}: ${Pa.toFixed(0)} kPa)</span><b style="color:${COL.hot}">${ck.T.toFixed(1)} °C · ${ck.Pin.toFixed(0)} kPa</b></div>
            <div class="row"><span>The ${s.weight} g weight lifts at</span><b style="color:${COL.heat}">+${set.toFixed(0)} kPa, so ${Tset.toFixed(1)} °C</b></div>
            <div class="row"><span>Whistles · steam lost</span><b>${ck.whistles} · ${(ck.lost * 1000).toFixed(0)} g</b></div>
            <div class="row"><span>Steam's push on the lid now</span><b>${F >= 100 ? `${Math.round(F).toLocaleString('en-IN')} N, like ${Math.round(F / 9.81)} kg` : 'almost none'}</b></div>
            <div class="row"><span>Dal: open pot here · in this cooker</span><b>${Math.round(dalMin(Tb))} min · ${Math.round(dalMin(Tset))} min</b></div>
            <small>${fmtT(ck.t)} on the clock. ${!s.cflame && gP > 5 ? 'The pressure only falls as the cooker cools. Wait, or cool the lid under a running tap; never force it.' : 'Dal times are a rough rule: speed doubles for every 10 °C.'}</small>`;
        }
        if (focus === 'vac') {
          const Ts = s.vac <= 0.6117 ? 0.01 : tsat(s.vac);
          return `<div class="big" style="color:${vk.ice ? COL.steam : vk.boiling ? COL.hot : COL.cold}">${vk.ice ? 'Boiling and freezing at once' : vk.boiling ? 'Boiling, with no heat at all' : vk.T < 24.5 ? 'Chilled to its new boiling point' : 'Still: not enough vacuum yet'}</div>
            <div class="row"><span>Pressure left in the jar</span><b style="color:${COL.cold}">${s.vac < 10 ? s.vac.toFixed(2) : s.vac.toFixed(1)} kPa · ${((s.vac / ATM) * 100).toFixed(s.vac < 10 ? 1 : 0)}% of normal</b></div>
            <div class="row"><span>Boiling point at that pressure</span><b>${Ts.toFixed(1)} °C</b></div>
            <div class="row"><span>Water temperature</span><b style="color:${COL.hot}">${vk.T.toFixed(1)} °C</b></div>
            <div class="row"><span>Its vapour pressure</span><b>${psat(vk.T).toFixed(2)} kPa</b></div>
            <div class="row"><span>Boiled away so far</span><b>${(vk.lost * 1000).toFixed(1)} g of 200 g</b></div>
            <small>${vk.ice ? 'Below 0.61 kPa liquid water cannot exist. This is the triple point: ice, water and vapour together.' : 'Each gram that boils off takes about 2,450 J from the water left behind, so the water chills itself. Boiling is about pressure, not about being hot.'}</small>`;
        }
        return `<div class="big">${pl ? pl.n : Math.round(s.alt).toLocaleString('en-IN') + ' m up'}: boils at ${Tb.toFixed(1)} °C</div>
          <div class="row"><span>Air pressure</span><b style="color:${COL.cold}">${Pa.toFixed(1)} kPa · ${((Pa / ATM) * 100).toFixed(0)}% of sea level</b></div>
          <div class="row"><span>Water boils at</span><b style="color:${COL.hot}">${Tb.toFixed(1)} °C</b></div>
          <div class="row"><span>Dal in an open pot, roughly</span><b>${Math.round(dalMin(Tb))} min</b></div>
          <div class="row"><span>The same dal in a pressure cooker here</span><b style="color:${COL.ok}">${Math.round(dalMin(tsat(Pa + 98)))} min at ${tsat(Pa + 98).toFixed(0)} °C</b></div>
          <small>About 1 °C lower for every 300 m climbed. Cooking times use the rough rule that cooking speed doubles for every 10 °C.</small>`;
      },
    };
  },
};
