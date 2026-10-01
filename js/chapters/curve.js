// Chapter 4: the heating curve and latent heat (1 scene unit ≈ 5 cm).
// Energy to warm liquid water: m c ΔT with c = 4,186 J/kg·K. Energy to turn it to steam at 100 °C:
//   m L with L = 2,257 kJ/kg (steam tables, 1 atm). For 1 kg from 25 °C: 314 kJ to reach the boil,
//   then 2,257 kJ to boil it all away, 7.2 times as much. From 0 °C the first figure is 419 kJ, so
//   the latent heat is 5.4 times the whole 0-to-100 climb.
// Burner: you choose its power and how much of it reaches the water. "All of it" is the textbook
//   case (1 kg, 2 kW: 157 s to boil, 18.8 min more to boil dry). A gas flame gets about 60% into
//   the pot (pot.js), an induction hob about 85% and an electric kettle about 90% (typical
//   measured figures; they vary with the pot). Losses from the pot's surface are left out here so
//   the curve is the clean textbook one; chapter 6 puts them back.
// Steam past 100 °C (drawn dashed) would need a closed vessel: c of steam ≈ 2.01 kJ/kg·K.
// Burns: 1 g of steam at 100 °C condensing on skin and cooling to 37 °C gives up
//   2,257 + 4.186 × 63 = 2,521 J. 1 g of boiling water cooling to 37 °C gives up 264 J: 9.6 times less.
import { THREE } from '../kit.js';
import {
  ATM, C_WATER, C_STEAM, L_VAP, LPG_J, COL, tsat, makePot, board, panelBg, axes, title, line, dot, bars, fitNarrow, reelBoards, clamp, fmtT, fmtW, link,
} from '../boil.js';

const kJ = (J) => Math.round(J / 1000).toLocaleString('en-IN') + ' kJ';
const TB = tsat(ATM), VIEW = { pos: [2.2, 4.55, 11.0], target: [2.2, 3.3, 0] };
const ETA = { ideal: { n: 'All of it (textbook)', e: 1 }, gas: { n: 'Gas flame, about 60%', e: 0.6 }, induction: { n: 'Induction, about 85%', e: 0.85 } };
export const eBoil = (kg, T0) => kg * C_WATER * (100 - T0);
export const eDry = (kg) => kg * L_VAP;

export default {
  id: 'curve',
  short: 'The flat step',
  title: 'The temperature that refuses to rise',
  subtitle: 'Water climbs to 100 °C and stops there, while 2,257 kJ per kilogram disappears into steam.',
  view: VIEW,
  learn: `<p>Put a thermometer in a pot and plot what it reads against the heat you have put in. The line climbs steadily: every kilogram of water needs <b>4.186 kJ</b> for each degree. Then, at 100 °C, it goes <b>flat</b>. The burner is still pouring heat in, but the temperature will not move until the last drop is gone.</p>
    <p>Where does the heat go? Into <b>pulling molecules apart</b>. In the liquid each molecule is held by its neighbours; to become steam it must break free of all of them. That takes <b>2,257 kJ for every kilogram</b>, and it is called <b>latent heat</b> ("hidden" heat, because no thermometer shows it). The molecules in the steam are moving no faster than those in the boiling water. They are just free.</p>
    <p>The size of that number is the surprise. Taking 1 litre from 25 °C to boiling needs 314 kJ. Boiling that litre away needs <b>seven times more</b>. That is why a pot takes minutes to boil but ages to boil dry, and why a rolling boil cooks no faster than a gentle one: both are at 100 °C, and the big flame only makes more steam.</p>
    <p>It also explains why <b>steam burns are worse</b> than boiling-water burns. When steam touches your skin it condenses, and hands back all that latent heat on the spot, nearly ten times what the same weight of boiling water would give. The matching flat step at 0 °C, where ice melts, is in MeltClear; what energy is and how it is counted is in ${link('energyclear', 'EnergyClear')}.</p>
    <p class="tip"><b>Try it:</b> let it run and watch the dot hit the flat step. Then switch from "all of it" to a gas flame and see how the times stretch.</p>`,
  terms: [
    { t: 'Specific heat', d: 'The energy needed to warm 1 kg of something by 1 °C. For liquid water it is 4.186 kJ, one of the highest of any common substance.' },
    { t: 'Latent heat of vaporisation', d: 'The energy needed to turn 1 kg of liquid into gas at the same temperature. For water at 100 °C it is 2,257 kJ.' },
    { t: 'Phase change', d: 'A change between solid, liquid and gas. While it happens the temperature stays put.' },
    { t: 'Condensation', d: 'Gas turning back into liquid. It releases the same latent heat that boiling took in.' },
  ],
  defaults: { power: 2, eff: 'ideal', kg: 1, start: 25, fast: 20 },
  controls: [
    { key: 'power', type: 'range', label: 'Burner power', min: 0.5, max: 3, step: 0.1, ends: ['0.5 kW', '3 kW'], fmt: (v) => v.toFixed(1) + ' kW' },
    { key: 'eff', type: 'seg', label: 'How much reaches the water', options: Object.entries(ETA).map(([v, e]) => ({ v, label: e.n })) },
    { key: 'kg', type: 'range', label: 'Water', min: 0.25, max: 2.5, step: 0.05, ends: ['250 mL', '2.5 L'], fmt: (v) => (v < 1 ? Math.round(v * 1000) + ' mL' : v.toFixed(2) + ' L') },
    { key: 'start', type: 'range', label: 'Starting temperature', min: 5, max: 40, step: 1, ends: ['5 °C', '40 °C'], fmt: (v) => v + ' °C' },
    { key: 'fast', type: 'seg', label: 'Time', options: [{ v: 1, label: 'Real time' }, { v: 20, label: '×20' }, { v: 60, label: '×60' }] },
    { key: 'go', type: 'buttons', label: 'Start again', items: [{ label: 'Refill the pot', act: (s, inst) => inst.reset(s) }] },
  ],
  onChange(s, key) { if (key === 'kg' || key === 'start') s._reset = true; },
  quiz: [
    { q: 'A pot is at a full boil on a high flame. Where is the flame\'s heat going?', options: ['Into making the water hotter', 'Into breaking molecules free of the liquid, as latent heat', 'Nowhere, it is wasted', 'Into the air dissolved in the water'], answer: 1, why: 'At the boiling point every extra joule frees more molecules. The temperature stays at 100 °C until the water is gone.' },
    { q: 'Heating 1 kg of water from 25 °C to boiling takes about 314 kJ. Boiling it all away takes about…', options: ['The same again', 'Half as much', '2,257 kJ, about seven times more', '100 kJ'], answer: 2, why: 'Latent heat of vaporisation is 2,257 kJ/kg. 2,257 ÷ 314 ≈ 7.2.' },
    { q: 'Why is a burn from steam worse than one from the same weight of boiling water?', options: ['Steam is much hotter than 100 °C', 'Steam is acidic', 'Steam moves faster', 'Steam condenses on skin and releases its latent heat as well'], answer: 3, why: 'Each gram of steam gives up about 2,257 J as it condenses, and then is still 100 °C water. That is roughly ten times the heat from a gram of boiling water.' },
  ],
  reel: [
    { ms: 5600, caption: 'Then the temperature stops at 100 °C. Boiling a litre away takes 2,257 kilojoules: seven times the heat that brought it to the boil.', set: { power: 2, eff: 'ideal', kg: 1, start: 25, fast: 40 }, act: (s, inst) => { inst.reset(s); inst.preRun(s, 110); }, view: { pos: [-0.6, 5.4, 9.6], target: [-0.6, 4.8, 0] }, spin: 0.05 },
  ],

  build({ stage, s: s0 }) {
    const root = new THREE.Group(); stage.root.add(root);
    const pot = makePot(root, { x: -0.9, seed: 17 });
    let S = s0, key = '';
    const st = { T: 25, m: 1, E: 0, t: 0, tBoil: null, tDry: null };
    const reset = (s) => { if (s) S = s; st.T = S.start; st.m = S.kg; st.E = 0; st.t = 0; st.tBoil = null; st.tDry = null; };
    const Pw = () => S.power * 1000 * ETA[S.eff].e;
    function physics(dt) {
      if (st.m <= 0) return;
      const dE = Pw() * dt; let left = dE;
      if (st.T < TB) { const need = st.m * C_WATER * (TB - st.T); if (left < need) { st.T += left / (st.m * C_WATER); left = 0; } else { st.T = TB; left -= need; st.tBoil ??= st.t + dt * (1 - left / dE); } }
      if (left > 0) { const dm = left / L_VAP; if (dm >= st.m) { st.tDry = st.t + dt; st.m = 0; } else st.m -= dm; }
      st.E += dE; st.t += dt;
    }
    const preRun = (s, secs) => { S = s; for (let t = 0; t < secs; t += 0.5) physics(0.5); };
    reset();

    const bA = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      const E1 = eBoil(S.kg, S.start), E2 = eDry(S.kg), xM = (E1 + E2) * 1.12;
      panelBg(g, w, h); title(g, 'The heating curve', `${S.kg < 1 ? Math.round(S.kg * 1000) + ' g' : S.kg.toFixed(2) + ' kg'} of water`);
      const tick = xM > 4e6 ? 1e6 : xM > 1.6e6 ? 5e5 : 2e5, xt = []; for (let v = 0; v <= xM; v += tick) xt.push(v);
      const { X, Y } = axes(g, w, h, { x0: 62, y1: 62, y0: h - 60, xMax: xM, yMin: 0, yMax: 140, xTicks: xt, yTicks: [0, 25, 50, 75, 100, 125], xFmt: (v) => (v / 1000).toFixed(0), yFmt: (v) => v + '°', xLabel: 'heat put into the water, kJ' });
      g.fillStyle = 'rgba(196,155,255,.14)'; g.fillRect(X(E1), Y(140), X(E1 + E2) - X(E1), Y(0) - Y(140));
      line(g, [[E1 + E2, 100], [xM, 100 + (xM - E1 - E2) / (S.kg * C_STEAM)]], X, Y, 'rgba(142,240,255,.8)', 3, [6, 5]);
      line(g, [[0, S.start], [E1, 100]], X, Y, COL.hot, 5);
      line(g, [[E1, 100], [E1 + E2, 100]], X, Y, COL.latent, 5);
      g.font = 'bold 16px sans-serif'; g.fillStyle = COL.hot; g.fillText('warming', X(0) + 6, Y(100) - 30); g.fillText(kJ(E1), X(0) + 6, Y(100) - 10);
      g.fillStyle = COL.latent; g.fillText('boiling: the temperature does not move', X(E1) + 30, Y(100) + 26); g.fillText(`latent heat, ${kJ(E2)}`, X(E1) + 30, Y(100) + 48);
      g.fillStyle = COL.steam; g.font = '15px sans-serif'; g.fillText('steam', X(E1 + E2) - 12, Y(100) - 22);
      const Ed = Math.min(st.E, E1 + E2); dot(g, X(Ed), Y(st.m > 0 ? st.T : 100), '#fff', 9);
    }, [5.3, 3.4, 0]);
    const bB = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Hidden heat', 'joules in one gram');
      bars(g, [
        { label: '1 g of water, 25 → 100 °C', value: C_WATER * 75 / 1000, color: COL.hot },
        { label: '1 g boiled into steam', value: L_VAP / 1000, color: COL.latent },
        { label: 'Burn: 1 g boiling water', value: C_WATER * 63 / 1000, color: COL.cold },
        { label: 'Burn: 1 g of steam', value: (L_VAP + C_WATER * 63) / 1000, color: COL.steam },
      ], { y: 62, w: 612, rowH: 56, labelW: 262, unit: (v) => Math.round(v).toLocaleString('en-IN') + ' J', max: 3100 });
      g.font = '16px sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText('Burn rows: heat given to skin while cooling to 37 °C.', 20, h - 20);
    }, [5.3, 1.05, 0]);
    const lT = stage.label('', [1.3, 2.3, 0.9], root, 'hot'), lE = stage.label('', [-0.9, 4.35, 0], root, 'hot');
    lT.element.style.setProperty('--c', COL.hot); lE.element.style.setProperty('--c', COL.latent);

    return {
      reset, preRun,
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        fitNarrow(stage, []); reelBoards([bA, bB], -0.6, stage, VIEW);
        if (s._reset) { s._reset = false; reset(s); }
        const n = Math.max(1, Math.round(s.fast)); for (let i = 0; i < n; i++) physics(dt);
        const boiling = st.m > 0 && st.T >= TB, vig = boiling ? clamp(Pw() / 1800, 0.15, 1) : 0, fl = clamp(s.power / 3, 0, 1);
        pot.set({ level: clamp(st.m / 2.6, 0, 1), T: st.T, flame: fl, heat: fl * ETA[s.eff].e, air: !boiling && st.T > 45 ? clamp((st.T - 45) / 30, 0.15, 1) : 0, sing: !boiling && st.T > 80 ? 0.6 : 0, boil: vig, steam: vig * 0.8 + (st.T > 60 ? 0.1 : 0), flow: st.m > 0 ? clamp(0.2 + Pw() / 3000, 0, 1) : 0 });
        pot.step(dt);
        lT.element.innerHTML = st.m > 0 ? `water <b>${st.T.toFixed(1)} °C</b>` : 'empty';
        lE.element.innerHTML = st.m <= 0 ? '<b>Boiled dry</b>' : boiling ? `<b>${(((S.kg - st.m) / S.kg) * 100).toFixed(0)}%</b> boiled away · still 100 °C` : `<b>${kJ(st.E)}</b> in so far`;
        const k = `${Math.round(st.E / 4000)}|${s.kg}|${s.start}|${st.m > 0}`;
        if (k !== key) { key = k; bA.redraw(); bB.redraw(); }
      },
      readout: (s) => {
        const P = Pw(), E1 = eBoil(s.kg, s.start), E2 = eDry(s.kg);
        return `<div class="big">${kJ(st.E)} into the water</div>
          <div class="row"><span>Water</span><b style="color:${COL.hot}">${st.m > 0 ? st.T.toFixed(1) + ' °C · ' + (st.m * 1000).toFixed(0) + ' g left' : 'none left'}</b></div>
          <div class="row"><span>Time so far, at ${fmtW(P)} into the water</span><b>${fmtT(st.t)}</b></div>
          <div class="row"><span>To reach the boil: ${kJ(E1)}</span><b>${fmtT(E1 / P)}</b></div>
          <div class="row"><span>Then to boil it all away: ${kJ(E2)}</span><b style="color:${COL.latent}">${fmtT(E2 / P)} more</b></div>
          <div class="row"><span>Boiling away ÷ reaching the boil</span><b>${(E2 / E1).toFixed(1)}×</b></div>
          <small>${s.eff === 'gas' ? `On gas the flame gives out ${s.power.toFixed(1)} kW but only about 60% gets in. Boiling it dry would burn ${(((E1 + E2) / 0.6 / LPG_J) * 1000).toFixed(0)} g of LPG.` : s.eff === 'induction' ? 'An induction hob heats the pot itself, so about 85% of the electricity ends up in the water.' : 'The textbook case: every joule goes into the water. A harder boil only makes steam faster.'}</small>`;
      },
    };
  },
};
