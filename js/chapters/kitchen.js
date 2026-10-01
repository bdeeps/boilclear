// Chapter 6: salt, lids and safety (1 scene unit ≈ 6.5 cm). Two identical 20 cm steel pots on
// identical burners: one plain and open, one set up your way (salt, lid).
// Salt: boiling-point elevation ΔT = i K_b m, with K_b = 0.512 K·kg/mol for water, table salt
//   58.44 g/mol and i = 2 ions per NaCl (the ideal upper limit; measured values for salt water
//   are about 10% lower). A teaspoon (about 6 g) in a litre: 0.1 °C. Sea water (35 g/kg): 0.6 °C.
//   To gain 1 °C you would need 57 g per litre, far saltier than the sea. The salted pot also has
//   to heat the salt itself (0.88 kJ/kg·K), which is why it is a few seconds slower, not faster.
// Lid: heat losses from potLoss in boil.js. An open pot near boiling loses about 280 W by
//   evaporation from a 20 cm surface and about 30–50 W from its wall; a lid stops about 90% of
//   the evaporation. The numbers are estimates (still kitchen air at 30 °C, 60% humidity).
// Flame: 60% of the burner's heat reaches the pot (pot.js). LPG gives about 46 MJ/kg.
// "Flame needed to hold a boil" = the pot's heat loss at its boiling point ÷ 0.6.
import { THREE } from '../kit.js';
import {
  ATM, C_WATER, STOVE_ETA, LPG_J, COL, tsat, latent, saltRise, potLoss, makePot, board, panelBg, axes, title, line, legend, dashH, bars,
  fitNarrow, reelBoards, clamp, fmtT, fmtW, link,
} from '../boil.js';

const AMB = 30, START = 28, RPOT = 0.1, AREA = Math.PI * RPOT * RPOT, TSAT = tsat(ATM), C_SALT = 880;
const VIEW = { pos: [2.2, 4.55, 11.0], target: [2.2, 3.3, 0] };
const cfgOf = (s, mine) => ({ kg: s.litres, salt: mine ? s.salt : 0, lid: mine ? s.lid : false, flame: s.flame });
const tbOf = (c) => TSAT + saltRise(c.salt);
const capOf = (c, m) => m * C_WATER + c.kg * (c.salt / 1000) * C_SALT;
const lossOf = (c, T, m) => potLoss(T, { amb: AMB, R: RPOT, wet: m / 1000 / AREA, lid: c.lid });
// Time (s) for a pot to reach its boiling point, by stepping the same physics the live model uses.
export function timeToBoil(c) {
  let T = START, t = 0; const Tb = tbOf(c), P = c.flame * 1000 * STOVE_ETA;
  while (T < Tb && t < 4 * 3600) { const net = P - lossOf(c, T, c.kg).total; if (net <= 1) return Infinity; T += (net * 1) / capOf(c, c.kg); t += 1; }
  return t;
}
export const holdW = (c) => lossOf(c, tbOf(c), c.kg).total / STOVE_ETA;

export default {
  id: 'kitchen',
  short: 'Salt, lids, safety',
  title: 'Salt, lids and staying safe',
  subtitle: 'Salt does not make water boil faster. A lid really does save gas. And steam deserves respect.',
  view: VIEW,
  learn: `<p><b>Does salt make water boil faster?</b> No. Dissolved salt gets in the way of water molecules trying to leave, so the water has to be slightly <b>hotter</b> before its vapour pressure matches the air. But the effect is tiny: a teaspoon in a litre raises the boiling point by about <b>0.1 °C</b>. You would need nearly 60 g per litre, far saltier than the sea, to gain one degree. Salt your water for taste.</p>
    <p>Then why does water fizz when you throw salt in? Each grain is a rough surface full of <b>nucleation sites</b> (chapter 3), so bubbles that were waiting for a seed form all at once. It looks like boiling, but the water has not got hotter.</p>
    <p><b>A lid</b> matters far more. An open pot near boiling loses heat fast, mostly as water vapour leaving the surface, and every gram takes 2,257 J with it. A lid traps the vapour: it condenses and drips back, handing its heat back. The pot boils sooner, and once it is boiling you can turn the flame right down. The same idea, keeping heat in, is in ${link('waterheaterclear', 'WaterHeaterClear')} and ${link('fridgeclear', 'FridgeClear', 'insulation')}.</p>
    <p><b>Staying safe.</b> Steam burns are deeper than hot-water burns, because steam hands over its latent heat as it condenses on skin. Open a lid <b>away from you</b>, so the steam goes the other way. <b>Never force open a pressure cooker</b>: wait until the pressure has fallen by itself, or cool the lid under running water, and check the vent pipe is clear before every use. Water heated in a microwave in a smooth cup can be <b>superheated</b>: let it stand for half a minute and do not lean over it. Keep pot handles turned inward, away from children.</p>
    <p>If someone is scalded: hold the burn under <b>cool running water for about 20 minutes</b>, remove rings or tight clothing nearby, and cover it loosely with a clean cloth. Do not use ice, toothpaste, ghee or butter. For a large burn, a blistered burn on a child, or a burn on the face, hands or groin, get medical help; in India the emergency number is <b>112</b>.</p>
    <p class="tip"><b>Try it:</b> add salt and watch the boiling point move in the second decimal place. Then put the lid on and compare the flame each pot needs to stay at a boil.</p>`,
  terms: [
    { t: 'Boiling-point elevation', d: 'The small rise in boiling point when something is dissolved in a liquid. It depends on how many particles are dissolved, not on what they are.' },
    { t: 'Simmer', d: 'Keeping water just at its boiling point with a low flame. It cooks as fast as a hard boil, because the temperature is the same.' },
    { t: 'Condensation', d: 'Vapour turning back into liquid, as on the underside of a lid. It gives back the latent heat.' },
    { t: 'Scald', d: 'A burn from hot liquid or steam.' },
  ],
  defaults: { salt: 6, lid: true, litres: 2, flame: 2, fast: 20 },
  controls: [
    { key: 'salt', type: 'range', label: 'Your pot: salt', min: 0, max: 100, step: 1, ends: ['none', '100 g per litre'], fmt: (v) => `${v} g per litre · +${saltRise(v).toFixed(2)} °C`, hint: 'A teaspoon is about 6 g. Sea water has about 35 g per litre.' },
    { key: 'lid', type: 'toggle', label: 'Your pot: lid on' },
    { key: 'litres', type: 'range', label: 'Water in each pot', min: 1, max: 3, step: 0.1, ends: ['1 L', '3 L'], fmt: (v) => v.toFixed(1) + ' L' },
    { key: 'flame', type: 'range', label: 'Flame under each pot', min: 0.8, max: 3, step: 0.1, ends: ['0.8 kW', '3 kW'], fmt: (v) => v.toFixed(1) + ' kW' },
    { key: 'fast', type: 'seg', label: 'Time', options: [{ v: 1, label: 'Real time' }, { v: 20, label: '×20' }, { v: 60, label: '×60' }] },
    { key: 'go', type: 'buttons', label: 'Race them again', items: [{ label: 'Fresh water in both pots', act: (s, inst) => inst.reset() }] },
  ],
  onChange(s, key) { if (key === 'salt' || key === 'lid' || key === 'litres' || key === 'flame') s._reset = true; },
  quiz: [
    { q: 'You add a teaspoon of salt to a litre of water. Its boiling point…', options: ['Drops by 5 °C', 'Rises by about 0.1 °C', 'Rises by about 10 °C', 'Does not change at all'], answer: 1, why: 'ΔT = 2 × 0.512 × (6 g ÷ 58.44 g/mol) ≈ 0.1 °C. It boils very slightly later, not sooner.' },
    { q: 'Why does a lid save so much gas?', options: ['It makes the flame hotter', 'It adds pressure like a cooker', 'It stops vapour leaving, and escaping vapour carries away a lot of heat', 'It reflects light'], answer: 2, why: 'Evaporation is the biggest heat loss from an open pot near boiling: every gram that leaves takes about 2,257 J. An ordinary lid adds almost no pressure.' },
    { q: 'What is the right first aid for a scald?', options: ['Cool running water for about 20 minutes', 'Ice straight on the skin', 'Toothpaste', 'Butter or ghee'], answer: 0, why: 'Cool running water takes the heat out and limits the damage. Ice can injure the skin further, and pastes and fats trap heat and raise the risk of infection.' },
  ],
  reel: [
    { ms: 5600, caption: 'Salt? A spoonful raises the boiling point by a tenth of a degree. A lid saves far more gas, and a low simmer cooks just as fast.', set: { salt: 6, lid: true, litres: 2, flame: 2, fast: 30 }, act: (s, inst) => { inst.reset(); inst.preRun(s, 330); }, view: { pos: [-0.6, 5.4, 9.6], target: [-0.6, 4.8, 0] }, spin: 0.05 },
  ],

  build({ stage, s: s0 }) {
    const root = new THREE.Group(); stage.root.add(root);
    const pots = [makePot(root, { x: -2.25, R: 1.25, H: 1.9, seed: 3, nB: 90, nT: 70 }), makePot(root, { x: 0.75, R: 1.25, H: 1.9, seed: 9, nB: 90, nT: 70 })];
    let S = s0, key = '', pred = null, pkey = '';
    const P = [0, 1].map(() => ({ T: START, m: 2, t: 0, tBoil: null, rows: [], q: {} }));
    const reset = () => P.forEach((p) => Object.assign(p, { T: START, m: S.litres, t: 0, tBoil: null, rows: [], q: {} }));
    function physics(p, c, dt) {
      const Pin = c.flame * 1000 * STOVE_ETA, loss = lossOf(c, p.T, p.m), net = Pin - loss.total, Tb = tbOf(c);
      let steam = 0;
      if (p.m > 0.05) {
        if (p.T >= Tb && net > 0) { steam = net; p.m -= (net * dt) / latent(p.T); p.T = Tb; p.tBoil ??= p.t; }
        else p.T = Math.min(Tb, p.T + (net * dt) / capOf(c, p.m));
      }
      p.t += dt; p.q = { Pin, loss, steam, Tb };
    }
    const stepAll = (dt) => P.forEach((p, i) => physics(p, cfgOf(S, i === 1), dt));
    const log = () => P.forEach((p) => { if (!p.rows.length || p.t - p.rows[p.rows.length - 1][0] >= 5) { p.rows.push([p.t, p.T]); if (p.rows.length > 600) p.rows.splice(0, 2); } });
    const preRun = (s, secs) => { S = s; for (let t = 0; t < secs; t += 1) { stepAll(1); log(); } };
    const predict = () => { const k = `${S.salt}|${S.lid}|${S.litres}|${S.flame}`; if (k !== pkey) { pkey = k; pred = [0, 1].map((i) => { const c = cfgOf(S, i === 1); return { t: timeToBoil(c), hold: holdW(c), Tb: tbOf(c) }; }); } return pred; };
    reset(); stepAll(0); predict();

    const NAME = ['Plain, open', 'Yours'], CL = [COL.cold, COL.heat];
    const bA = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h); title(g, 'The race to boil', `time-lapse ×${S.fast}`);
      const t1 = Math.max(600, P[0].t * 1.05), stp = t1 > 1500 ? 600 : 300, xt = []; for (let v = 0; v <= t1; v += stp) xt.push(v);
      const { X, Y } = axes(g, w, h, { x0: 70, y1: 76, y0: h - 44, xMax: t1, yMin: 20, yMax: 110, xTicks: xt, yTicks: [25, 50, 75, 100], xFmt: (v) => (v / 60).toFixed(0) + ' min', yFmt: (v) => v + '°' });
      dashH(g, X(0), X(t1), Y(100), '100 °C');
      P.forEach((p, i) => line(g, p.rows, X, Y, CL[i], i ? 4 : 6));
      legend(g, NAME.map((n, i) => [n, CL[i]]), 20, 46, 16);
    }, [5.3, 3.4, 0]);
    const bB = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      const pr = predict();
      panelBg(g, w, h); title(g, 'Time to boil, and flame to keep it boiling');
      bars(g, pr.map((p, i) => ({ label: `${NAME[i]}: to boil`, value: isFinite(p.t) ? p.t : 0, color: CL[i], text: isFinite(p.t) ? fmtT(p.t) : 'never: flame too low' })), { y: 58, w: 612, rowH: 52, labelW: 210, max: Math.max(...pr.map((p) => (isFinite(p.t) ? p.t : 0)), 60) * 1.35 });
      bars(g, pr.map((p, i) => ({ label: `${NAME[i]}: to hold`, value: p.hold, color: CL[i], text: fmtW(p.hold) + ' of flame' })), { y: 176, w: 612, rowH: 52, labelW: 210, max: Math.max(...pr.map((p) => p.hold)) * 1.6 });
      const save = 1 - pr[1].hold / pr[0].hold;
      g.font = 'bold 18px sans-serif'; g.fillStyle = save > 0.02 ? COL.ok : 'rgba(255,255,255,.75)';
      g.fillText(save > 0.02 ? `Your pot simmers on ${(save * 100).toFixed(0)}% less gas.` : 'Without a lid, both pots need the same flame.', 20, h - 24);
    }, [5.3, 1.05, 0]);
    const lab = pots.map((p, i) => { const l = stage.label('', [p.g.position.x, 3.75, 0], root, 'hot'); l.element.style.setProperty('--c', CL[i]); return l; });

    return {
      reset, preRun,
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        fitNarrow(stage, []); reelBoards([bA, bB], -0.6, stage, VIEW);
        if (s._reset) { s._reset = false; reset(); }
        const n = Math.max(1, Math.round(s.fast)); for (let i = 0; i < n; i++) stepAll(dt);
        log();
        P.forEach((p, i) => {
          const c = cfgOf(s, i === 1), boiling = p.T >= p.q.Tb - 0.01, vig = boiling ? clamp(p.q.steam / 1100, 0.1, 1) : 0, fl = clamp(s.flame / 3, 0, 1);
          pots[i].set({ level: clamp(p.m / 3.4, 0, 1), T: p.T, flame: fl, heat: fl, lid: c.lid, air: !boiling && p.T > 45 ? clamp((p.T - 45) / 30, 0.15, 1) : 0, sing: !boiling && p.T > 78 ? 0.6 : 0, boil: vig, steam: clamp(p.q.loss.evap / 280, 0, 1) * 0.3 + vig * 0.6, flow: clamp(0.25 + s.flame / 4, 0, 1) });
          pots[i].step(dt);
          lab[i].element.innerHTML = `${NAME[i]}: <b>${p.T.toFixed(i && s.salt ? 2 : 1)} °C</b>${p.tBoil !== null ? ' · boiling' : ''}`;
        });
        const k = `${P[0].rows.length}|${pkey}|${s.fast}`;
        if (k !== key) { key = k; bA.redraw(); bB.redraw(); }
      },
      readout: (s) => {
        const pr = predict(), dT = saltRise(s.salt), dt = pr[1].t - pr[0].t, gas = (t) => ((s.flame * 1000 * t) / LPG_J) * 1000;
        const simmer = (i) => ((pr[i].hold * 1200) / LPG_J) * 1000;
        return `<div class="big">Salt: +${dT.toFixed(2)} °C. Lid: ${s.lid ? `−${((1 - pr[1].hold / pr[0].hold) * 100).toFixed(0)}% gas to simmer` : 'off'}</div>
          <div class="row"><span>Boiling point: plain · yours</span><b>${pr[0].Tb.toFixed(2)} · <span style="color:${COL.heat}">${pr[1].Tb.toFixed(2)} °C</span></b></div>
          <div class="row"><span>Time to boil: plain, open</span><b style="color:${COL.cold}">${isFinite(pr[0].t) ? fmtT(pr[0].t) + ' · ' + gas(pr[0].t).toFixed(0) + ' g LPG' : 'never'}</b></div>
          <div class="row"><span>Time to boil: yours${!isFinite(dt) || Math.abs(dt) < 1 ? '' : ` (${fmtT(Math.abs(dt))} ${dt < 0 ? 'sooner' : 'later'})`}</span><b style="color:${COL.heat}">${isFinite(pr[1].t) ? fmtT(pr[1].t) + ' · ' + gas(pr[1].t).toFixed(0) + ' g LPG' : 'never'}</b></div>
          <div class="row"><span>Flame to hold a boil: plain · yours</span><b>${fmtW(pr[0].hold)} · ${fmtW(pr[1].hold)}</b></div>
          <div class="row"><span>LPG for a 20-minute simmer: plain · yours</span><b>${simmer(0).toFixed(1)} g · ${simmer(1).toFixed(1)} g</b></div>
          <small>${s.salt > 0 && !s.lid ? 'Salt alone makes the pot very slightly slower: a higher boiling point, plus the salt itself to heat.' : s.lid ? 'The lid wins by stopping evaporation. Once it boils, turn the flame down: a simmer is just as hot as a rolling boil.' : 'Two identical pots: a dead heat.'} Losses are estimates for a 20 cm pot.</small>`;
      },
    };
  },
};
