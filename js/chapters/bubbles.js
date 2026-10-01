// Chapter 3: why a bubble can survive (1 scene unit ≈ 2.5 cm; the cup holds 250 mL).
// A bubble inside water is squeezed by everything outside it: the air pressing on the surface, the
//   weight of the water above it (ρ g h: 0.78 kPa at 8 cm deep) and its own skin, whose surface
//   tension adds 2σ/r (the Young–Laplace equation). The only thing holding it open is the pressure
//   of the water vapour inside, which depends only on temperature: the vapour-pressure curve.
// Vapour pressure: IAPWS-IF97 steam-table formula (boil.js). The dashed curve is the
//   Clausius–Clapeyron estimate with a fixed latent heat of 40.66 kJ/mol, anchored at 100 °C.
// Surface tension: IAPWS formula, 0.0589 N/m at 100 °C. A bubble starting from a trapped air
//   pocket of radius r needs the water hot enough that p_vap(T) = p_outside + ρgh + 2σ(T)/r. For
//   r = 1 mm that is 100.2 °C at sea level, for 10 µm about 103 °C, for 2 µm about 113 °C. This is
//   the standard nucleation picture (Carey, Liquid-Vapor Phase-Change Phenomena, ch. 5–6); real
//   pockets also hold a little air, which helps them a bit, so treat the numbers as upper limits.
// Superheating: water in a smooth, clean cup has only tiny pockets, so it can pass its boiling
//   point without a single bubble. Microwave ovens make this likelier because they heat the water
//   itself, not a hot base. Disturb it and the stored heat, m c (T − T_boil), turns water to steam
//   all at once: mass = m c ΔT ÷ L, and each gram of steam fills about 1.7 litres at 1 atm.
import { THREE, M } from '../kit.js';
import {
  ATM, C_WATER, COL, hex, psat, psatCC, tsat, sigmaW, latent, steamRho, makePot, flowArrow, sphere, board, panelBg, axes, title, line, legend, dot, bars,
  fitNarrow, inReel, reelBoards, clamp, link,
} from '../boil.js';

const DEPTH = 0.78, CUP_KG = 0.25;
const VIEW = { pos: [2.2, 4.55, 11.0], target: [2.2, 3.3, 0] };
// Pressure (kPa) a bubble grown from a pocket of radius r (µm) must hold at T °C under P kPa of air.
export const pNeed = (T, P, um) => P + DEPTH + (2 * sigmaW(T)) / (um * 1e-6) / 1000;
// The temperature at which that pocket can start to grow.
export function tNeed(P, um) { let T = tsat(P + DEPTH); for (let i = 0; i < 40; i++) T = tsat(pNeed(T, P, um)); return T; }
const fmtSeed = (v) => (v >= 1000 ? '1 mm' : v >= 10 ? v.toFixed(0) + ' µm' : v.toFixed(1) + ' µm');

export default {
  id: 'bubbles',
  short: 'Bubbles',
  title: 'Why bubbles can survive',
  subtitle: 'Boiling starts when the water\'s vapour pressure matches the pressure outside. And a bubble needs a seed.',
  view: VIEW,
  learn: `<p>Evaporation happens only at the surface. <b>Boiling</b> is different: vapour forms <b>inside</b> the liquid, as bubbles. So why not at 50 °C?</p>
    <p>Because a bubble is a hole in the water, and everything around it tries to crush it: the <b>air pressing on the surface</b> (about 101 kPa at sea level) plus the water above. The only thing holding it open is the push of the vapour inside, the <b>vapour pressure</b>. It depends only on temperature, and it climbs steeply: 3 kPa at 25 °C, 20 kPa at 60 °C, 101 kPa at 100 °C. The curve on the chart is called the <b>Clausius–Clapeyron</b> curve after the two people who explained its shape.</p>
    <p>Where the curve crosses the outside pressure, bubbles stop being crushed. <b>That crossing is the boiling point.</b> It is not a magic number: change the outside pressure and it moves (chapter 5).</p>
    <p>There is one more catch. A bubble's skin pulls inward too (surface tension), and the smaller the bubble, the harder it squeezes. A brand-new bubble a few molecules wide could never survive. Real bubbles start from <b>seeds</b>: tiny air pockets trapped in scratches on the pot. These are <b>nucleation sites</b>, and you can see them: streams of bubbles always rise from the same spots.</p>
    <p>A very smooth, clean cup has almost no seeds. Heat water in one in a <b>microwave</b> and it can go past 100 °C without a single bubble: it is <b>superheated</b>. Drop in a spoon, sugar or a tea bag, and all that stored heat makes steam at once, throwing scalding water out of the cup. The same trick in reverse, water that stays liquid below 0 °C until something seeds it, is in FreezeClear. More on pressure itself in ${link('pressureclear', 'PressureClear')}.</p>
    <p class="tip"><b>Try it:</b> raise the temperature until the curve meets the outside pressure. Then press "Smooth cup in a microwave" and, once it is superheated and perfectly still, drop in the sugar.</p>`,
  terms: [
    { t: 'Vapour pressure', d: 'The pressure of the vapour that a liquid makes at a given temperature. For water: 3.2 kPa at 25 °C, 101.3 kPa at 100 °C.' },
    { t: 'Boiling point', d: 'The temperature at which a liquid\'s vapour pressure equals the pressure around it.' },
    { t: 'Nucleation site', d: 'A scratch, speck or trapped air pocket where a bubble can start.' },
    { t: 'Superheated water', d: 'Liquid water hotter than its boiling point that has not boiled because no bubble could start.' },
  ],
  defaults: { temp: 60, pout: ATM, seed: 100 },
  controls: [
    { key: 'temp', type: 'range', label: 'Heat the water to', min: 20, max: 125, step: 0.5, ends: ['20 °C', '125 °C'], fmt: (v) => v.toFixed(1) + ' °C' },
    { key: 'pout', type: 'range', label: 'Pressure outside', min: 30, max: 200, step: 0.1, ends: ['30 kPa (Everest)', '200 kPa (cooker)'], fmt: (v) => v.toFixed(1) + ' kPa' },
    { key: 'seed', type: 'log', label: 'Largest air pocket in the cup', min: 0.5, max: 1000, ends: ['0.5 µm: polished', '1 mm: rough'], fmt: fmtSeed, hint: 'A scratched steel pot has pockets of tens of micrometres. A new glass cup may have only tiny ones.' },
    { key: 'go', type: 'buttons', label: 'The microwave accident', items: [
      { label: 'Smooth cup in a microwave', act: (s) => { s.seed = 2; s.pout = ATM; s.temp = 108; } },
      { label: 'Drop in a spoon of sugar', act: (s, inst) => { s.seed = 300; inst.disturb(); } },
      { label: 'Back to a steel pot', act: (s) => { s.seed = 100; s.pout = ATM; s.temp = 60; } }] },
  ],
  quiz: [
    { q: 'Water boils when…', options: ['It reaches exactly 100 °C, always', 'Its vapour pressure equals the pressure around it', 'All the air has left it', 'Its molecules split apart'], answer: 1, why: 'A bubble survives only if the vapour inside pushes as hard as the surroundings squeeze. At sea level that happens at about 100 °C; elsewhere it does not.' },
    { q: 'Why do streams of bubbles in a pot keep rising from the same few spots?', options: ['Those spots are the hottest', 'The water is thinner there', 'Those are scratches holding tiny air pockets, where bubbles can start', 'It is an optical illusion'], answer: 2, why: 'A bubble cannot start from nothing: surface tension would crush it. Trapped air pockets in scratches give it a head start.' },
    { q: 'Water heated in a smooth cup in a microwave sits perfectly still at 105 °C. What happens if you drop in sugar?', options: ['Nothing', 'It cools down quietly', 'It freezes', 'It can boil all at once and erupt'], answer: 3, why: 'The sugar brings thousands of nucleation sites. The heat stored above 100 °C flashes a few grams of water into several litres of steam in an instant.' },
  ],
  reel: [
    { ms: 5600, caption: 'A bubble can only survive when the water\'s vapour pressure matches the air pressing down. At sea level, that is 100 °C.', set: { temp: 40, pout: ATM, seed: 100 }, anim: { temp: [40, 101.5] }, view: { pos: [-0.6, 5.4, 9.6], target: [-0.6, 4.8, 0] }, spin: 0.05 },
  ],

  build({ stage, s: s0 }) {
    const root = new THREE.Group(); stage.root.add(root);
    const table = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.1, 3.4), M.matte(0x2b3039)); table.position.set(-1.7, 0.05, 0); root.add(table);
    const pot = makePot(root, { x: -1.7, y0: 0.05, R: 1.3, H: 2.7, stove: false, glass: true, seed: 31, nT: 60 });
    // one bubble, magnified
    const BC = [1.55, 2.2, 0], bubMat = new THREE.MeshPhysicalMaterial({ color: 0xcdefff, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0, clearcoat: 1, depthWrite: false });
    const big = sphere(1, bubMat, 40); big.castShadow = false; big.position.set(...BC); root.add(big);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.012, 8, 80), new THREE.MeshBasicMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.5 })); ring.position.set(...BC); root.add(ring);
    const outA = [], inA = [];
    for (let i = 0; i < 6; i++) { const a = flowArrow(hex(COL.hot), 0.04, 0.2), b = flowArrow(hex(COL.cold), 0.04, 0.2); root.add(a, b); outA.push(a); inA.push(b); }
    const lMag = stage.label('one bubble, magnified', [BC[0], BC[1] + 1.75, 0], root), lOut = stage.label('vapour pushes out', [BC[0], BC[1] - 1.7, 0], root, 'hot'), lIn = stage.label('everything else pushes in', [BC[0], BC[1] - 2.1, 0], root, 'hot');
    lOut.element.style.setProperty('--c', COL.hot); lIn.element.style.setProperty('--c', COL.cold);
    const lT = stage.label('', [-1.7, 3.3, 0], root, 'hot'); lT.element.style.setProperty('--c', COL.hot);

    const st = { T: s0.temp, state: 'cold', ph: 0, erupt: 0, flash: 0, level: 0.78, last: null };
    let S = s0, key = '', c = {};
    function calc() {
      const P = S.pout, flat = tsat(P), cap = tNeed(P, S.seed);
      c = { P, flat, cap, pv: psat(st.T), need: pNeed(st.T, P, S.seed), skin: (2 * sigmaW(st.T)) / (S.seed * 1e-6) / 1000 };
      st.state = st.T >= cap - 0.02 ? 'boil' : c.pv >= P + DEPTH ? 'super' : 'cold';
    }
    const flashOf = (T, flat) => (CUP_KG * C_WATER * Math.max(0, T - flat)) / latent(flat);     // kg of steam
    function disturb() {
      const flat = tsat(S.pout), cap = tNeed(S.pout, S.seed);
      if (st.T > cap + 0.3) { const kg = flashOf(st.T, flat); st.last = { kg, litres: (kg / steamRho(flat, S.pout)) * 1000, from: st.T }; st.erupt = 1.6; st.T = cap; st.level = Math.max(0.35, st.level - 0.25); }
    }
    calc();

    const bA = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Vapour pressure of water', 'against temperature');
      const { X, Y } = axes(g, w, h, { x0: 66, y1: 62, y0: h - 44, xMin: 0, xMax: 130, yMin: 0, yMax: 280, xTicks: [0, 25, 50, 75, 100, 125], yTicks: [0, 100, 200], xFmt: (v) => v + '°', yFmt: (v) => v + ' kPa' });
      const pts = (f) => Array.from({ length: 66 }, (_, i) => [i * 2, f(i * 2)]);
      line(g, pts(psatCC), X, Y, 'rgba(255,255,255,.55)', 2, [6, 5]);
      line(g, pts(psat), X, Y, COL.hot, 5);
      g.strokeStyle = COL.cold; g.lineWidth = 3; g.beginPath(); g.moveTo(X(0), Y(c.P)); g.lineTo(X(130), Y(c.P)); g.stroke();
      g.fillStyle = COL.cold; g.font = '16px sans-serif'; g.fillText(`outside: ${c.P.toFixed(0)} kPa`, X(2), Y(c.P) - 8);
      if (c.flat < 128) { g.strokeStyle = 'rgba(255,255,255,.6)'; g.setLineDash([5, 5]); g.lineWidth = 2; g.beginPath(); g.moveTo(X(c.flat), Y(c.P)); g.lineTo(X(c.flat), Y(0)); g.stroke(); g.setLineDash([]); g.fillStyle = '#fff'; g.font = 'bold 16px sans-serif'; g.fillText(`boils at ${c.flat.toFixed(1)} °C`, Math.min(X(c.flat) + 6, w - 170), Y(0) - 8); }
      if (c.cap < 130) dot(g, X(c.cap), Y(psat(c.cap)), COL.latent, 6);
      dot(g, X(st.T), Y(c.pv), '#fff', 9);
      legend(g, [['Steam tables', COL.hot], ['Clausius–Clapeyron', '#cfd6e2'], ['This cup\'s seed can grow', COL.latent]], 76, 70, 14);
    }, [5.3, 3.4, 0]);
    const bB = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h); title(g, 'The fight over one bubble', 'kPa');
      const mx = Math.max(140, c.need * 1.15, c.pv * 1.15);
      bars(g, [
        { label: 'OUT: vapour inside', value: c.pv, color: COL.hot },
        { label: 'IN: air above', value: c.P, color: COL.cold },
        { label: 'IN: water above', value: DEPTH, color: '#4aa3ff' },
        { label: 'IN: the bubble\'s skin', value: c.skin, color: COL.latent },
      ], { y: 62, w: 612, rowH: 56, labelW: 210, unit: (v) => (v >= 10 ? v.toFixed(0) : v.toFixed(2)) + ' kPa', max: mx });
      g.font = 'bold 19px sans-serif'; g.fillStyle = st.state === 'boil' ? COL.ok : st.state === 'super' ? COL.heat : COL.cold;
      g.fillText(st.state === 'boil' ? 'Out wins: the bubble grows. Boiling.' : st.state === 'super' ? 'Hot enough for a big bubble, but this seed is too small.' : 'In wins: any bubble is crushed.', 20, h - 22);
    }, [5.3, 1.05, 0]);

    return {
      disturb,
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        fitNarrow(stage, [lMag, lOut, lIn]); reelBoards([bA, bB], -0.6, stage, VIEW);
        const cap = tNeed(s.pout, s.seed), target = Math.min(s.temp, cap);
        if (st.erupt > 0) st.erupt -= dt; else { st.T += (target - st.T) * (1 - Math.exp(-dt * 2.5)); st.level += (0.78 - st.level) * dt * 0.15; }
        calc();
        const boiling = st.state === 'boil' && s.temp >= cap - 0.02, vig = boiling ? clamp(0.25 + (s.temp - cap) / 10, 0.25, 1) : 0;
        pot.set({ level: st.level, T: st.T, lo: 20, hi: 110, flame: 0, heat: 0, air: 0, sing: 0, boil: st.erupt > 0 ? 1 : vig, steam: clamp(c.pv / c.P, 0, 1) * 0.3 + vig * 0.5, flow: clamp((st.T - 20) / 160, 0.05, 0.5), jet: st.erupt > 0 ? 1 : 0 });
        pot.step(dt);
        // the magnified bubble: grows when out beats in, is crushed otherwise
        st.ph = (st.ph + dt * (boiling ? 0.55 : 0.45)) % 1;
        const r = boiling ? 0.12 + 0.8 * st.ph : st.state === 'super' ? 0.12 + 0.015 * Math.sin(st.ph * 6.283 * 4) : 0.6 * (1 - st.ph) ** 1.5;
        big.scale.setScalar(Math.max(0.001, r)); bubMat.opacity = boiling ? 0.4 * (1 - st.ph * 0.6) : 0.35;
        const Lo = clamp(c.pv / 150, 0.03, 1.2), Li = clamp(c.need / 150, 0.03, 1.2);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.52, b = a + 0.52, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
          outA[i].aim([BC[0] + ca * (r + 0.04), BC[1] + sa * (r + 0.04), 0], [ca, sa, 0], Lo * 0.6);
          inA[i].aim([BC[0] + cb * (r + 0.06 + Li * 0.6), BC[1] + sb * (r + 0.06 + Li * 0.6), 0], [-cb, -sb, 0], Li * 0.6);
        }
        lT.element.innerHTML = `water <b>${st.T.toFixed(1)} °C</b>${st.state === 'super' ? ' · superheated, and still' : ''}`;
        const k = `${st.T.toFixed(1)}|${s.pout}|${s.seed.toFixed(2)}|${st.state}`;
        if (k !== key) { key = k; bA.redraw(); bB.redraw(); }
      },
      readout: (s) => {
        const sup = Math.max(0, st.T - c.flat), kg = flashOf(st.T, c.flat), litres = (kg / steamRho(c.flat, c.P)) * 1000;
        const head = st.erupt > 0 ? ['It erupts', COL.hot] : st.state === 'boil' ? ['Boiling', COL.ok] : st.state === 'super' ? ['Superheated: no bubble can start', COL.heat] : ['Too cool: bubbles are crushed', COL.cold];
        return `<div class="big" style="color:${head[1]}">${head[0]}</div>
          <div class="row"><span>Water temperature</span><b style="color:${COL.hot}">${st.T.toFixed(1)} °C</b></div>
          <div class="row"><span>Its vapour pressure · outside</span><b style="color:${COL.hot}">${c.pv.toFixed(1)} · ${c.P.toFixed(1)} kPa</b></div>
          <div class="row"><span>Boiling point at this pressure</span><b>${c.flat.toFixed(1)} °C</b></div>
          <div class="row"><span>Skin squeeze on a ${fmtSeed(s.seed)} bubble, 2σ/r</span><b style="color:${COL.latent}">${c.skin >= 10 ? c.skin.toFixed(0) : c.skin.toFixed(2)} kPa</b></div>
          <div class="row"><span>This cup starts to bubble at</span><b>${c.cap.toFixed(1)} °C</b></div>
          <div class="row"><span>Stored above boiling</span><b>${sup > 0.5 ? sup.toFixed(1) + ' °C, enough for ' + litres.toFixed(1) + ' L of steam' : 'nothing'}</b></div>
          <small>${st.last && (st.erupt > 0 || st.state !== 'cold') ? `The cup at ${st.last.from.toFixed(0)} °C flashed ${(st.last.kg * 1000).toFixed(1)} g of water into about ${st.last.litres.toFixed(1)} litres of steam at once. ` : ''}${s.temp > c.cap + 0.3 ? 'Extra heat now makes bubbles, not a higher temperature.' : st.state === 'super' ? 'It looks calm. It is not safe.' : 'Same curve for all pure water. Only the outside pressure and the seeds change.'}</small>`;
      },
    };
  },
};
