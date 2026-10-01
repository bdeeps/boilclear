// Chapter 1: a pot of water on a gas stove, from cold to a rolling boil (1 scene unit ≈ 5 cm).
// The pot: stainless steel, 20 cm across, on one burner of an Indian LPG stove.
// Heat in: flame power × 0.6. Indian LPG stoves must reach about 68% thermal efficiency in the
//   standard pan test (IS 4246; the BEE star label starts there); a real pot that does not fit the
//   burner perfectly does worse, so we use 60%.
// The water is one well-mixed lump: m c dT/dt = heat in − losses (potLoss in boil.js: evaporation
//   from the open surface plus the warm wall). Once it reaches the boiling point, every spare watt
//   makes steam at 2,257 kJ/kg and the temperature stops.
// The inside of the base runs hotter than the water. Before boiling, heat leaves it by natural
//   convection, Nu = 0.15 Ra^⅓ (hot plate facing up, turbulent; Incropera eq. 9.31), which for water
//   near 60 °C works out to q″ ≈ 400 ΔT^(4/3) W/m². At 38 kW/m² that is about 30 °C above the water,
//   so the base passes 100 °C while the water is still near 75 °C. Vapour bubbles then form on the
//   base and collapse in the cooler water above: the "singing". Once bubbles form freely the base
//   settles about 8 °C above the boiling point (Rohsenow's nucleate-boiling correlation for water on
//   steel, q″ ∝ ΔT³).
// Stages: shimmer from about 35 °C (warm water rising bends light); air bubbles from about 45 °C
//   (cold tap water holds roughly 20 mL of dissolved air per litre, and less as it warms); singing
//   while the base is above the boiling point and the water is more than 3 °C below it; rolling boil
//   at the boiling point. Kitchen at 30 °C, sea level (water boils at 99.97 °C).
import { THREE } from '../kit.js';
import {
  ATM, C_WATER, STOVE_ETA, LPG_J, COL, tsat, latent, potLoss, makePot, boilSound, board, panelBg, axes, title, line, dashH, bars,
  fitNarrow, inReel, reelBoards, clamp, fmtW, fmtT, link,
} from '../boil.js';

const AMB = 30, RPOT = 0.1, AREA = Math.PI * RPOT * RPOT, TSAT = tsat(ATM);
const VIEW = { pos: [2.2, 4.55, 11.0], target: [2.2, 3.3, 0] };
const STAGES = [
  { n: 'Still', d: 'Heat is conducting through the steel base into the bottom layer of water.', col: '#6fb6ff' },
  { n: 'Shimmer', d: 'Warm water is lighter, so it rises and cooler water sinks: convection. The moving layers bend light.', col: '#8ef0ff' },
  { n: 'Tiny bubbles', d: 'These are air, not steam. Warm water holds less dissolved air, so it comes out on the metal.', col: '#5ce1a9' },
  { n: 'Singing', d: 'The base is already above 100 °C. Vapour bubbles form on it and collapse in the cooler water above. Each collapse is a click.', col: '#ffb547' },
  { n: 'Rolling boil', d: 'The water has reached its boiling point, so bubbles survive all the way to the top. The temperature stops rising.', col: '#ff7a59' },
];
// Temperature of the inside of the base for a water temperature T and a heat flux q (W/m²).
export function baseTemp(T, q) {
  const conv = T + Math.pow(Math.max(0, q) / 400, 0.75), nb = TSAT + 8 * Math.cbrt(Math.max(0, q) / 38000);
  return Math.min(conv, Math.max(nb, T));
}
export function stageOf(T, Tb) { return T >= TSAT - 0.05 ? 4 : Tb > TSAT + 1 && T < TSAT - 0.05 ? 3 : T >= 45 ? 2 : T >= 35 ? 1 : 0; }

export default {
  id: 'pot',
  short: 'The pot',
  title: 'A pot on the stove',
  subtitle: 'Shimmer, tiny bubbles, a singing sound, then a rolling boil: four stages you can see and hear.',
  view: VIEW,
  learn: `<p>Put a steel pot of water on the gas and watch closely. It does not go straight from still to boiling. The blue flame heats the <b>base</b>, the base heats the bottom layer of water by touch, and that warm water, being a little lighter, <b>rises</b> while cooler water sinks to take its place. That loop is <b>convection</b>, and you can see it as a faint shimmer.</p>
    <p>At about 45 °C <b>tiny bubbles</b> appear on the base and walls. They are not steam. Cold tap water has air dissolved in it, and warm water can hold less, so the air comes out.</p>
    <p>Then the pot starts to <b>sing</b>. The base is hotter than the water: by the time the water is about 75 °C, the metal is past 100 °C. Bubbles of real water vapour form on it, rise into cooler water and <b>collapse</b> with a click. Thousands of clicks make the hiss and rumble of a pot that is "about to boil".</p>
    <p>At <b>100 °C</b> the whole pot is hot enough for bubbles to survive. They reach the top and burst: a <b>rolling boil</b>. The noise actually gets softer, and the thermometer stops climbing, however high the flame. The next chapters explain why. How heat travels in general is in ${link('heatclear', 'HeatClear')}.</p>
    <p class="tip"><b>Try it:</b> start with cold water and watch the stage change. Then turn the flame down at a rolling boil: the bubbles slow, but the temperature does not move.</p>`,
  terms: [
    { t: 'Convection', d: 'Heat carried by a moving liquid or gas. Warm water expands, becomes lighter and rises; cooler water sinks.' },
    { t: 'Dissolved air', d: 'Air mixed invisibly into water. Warm water holds less of it, so it leaves as tiny bubbles long before boiling.' },
    { t: 'Rolling boil', d: 'Boiling so vigorous that stirring does not stop it. The water is no hotter than at a gentle boil.' },
    { t: 'Steam', d: 'Water as a gas. It is invisible. The white cloud above a pot is tiny droplets that have already condensed.' },
  ],
  defaults: { flame: 2, litres: 1.5, start: 28, fast: 10 },
  controls: [
    { key: 'flame', type: 'range', label: 'Flame', min: 0, max: 3, step: 0.1, ends: ['off', '3 kW'], fmt: (v) => (v ? v.toFixed(1) + ' kW' : 'off'), hint: 'A big burner on an Indian gas stove is about 2 kW.' },
    { key: 'litres', type: 'range', label: 'Water in the pot', min: 0.5, max: 2.5, step: 0.1, ends: ['0.5 L', '2.5 L'], fmt: (v) => v.toFixed(1) + ' L' },
    { key: 'start', type: 'range', label: 'Starting temperature', min: 5, max: 40, step: 1, ends: ['5 °C', '40 °C'], fmt: (v) => v + ' °C' },
    { key: 'fast', type: 'seg', label: 'Time', options: [{ v: 1, label: 'Real time' }, { v: 10, label: '×10' }, { v: 30, label: '×30' }] },
    { key: 'go', type: 'buttons', label: 'Start again', items: [{ label: 'Fresh cold water', act: (s, inst) => inst.reset(s) }] },
  ],
  onChange(s, key) { if (key === 'litres' || key === 'start') s._reset = true; },
  quiz: [
    { q: 'The first tiny bubbles that appear on the base of a warming pot are…', options: ['Steam', 'Air that was dissolved in the water', 'Hydrogen', 'Bits of metal'], answer: 1, why: 'Warm water holds less dissolved air than cold water, so the air comes out as small bubbles at about 45 to 60 °C, long before any boiling.' },
    { q: 'Why does a pot "sing" just before it boils?', options: ['The steel expands', 'The flame gets louder', 'Vapour bubbles form on the hot base and collapse in the cooler water above', 'Air is escaping'], answer: 2, why: 'The base is above 100 °C while the water is still cooler. Bubbles born on the base collapse as soon as they rise, and each collapse makes a click.' },
    { q: 'At a rolling boil you turn the flame from medium to high. The water temperature…', options: ['Stays the same', 'Rises steadily', 'Doubles', 'Falls'], answer: 0, why: 'Boiling water at sea level stays at about 100 °C. More heat makes more steam, not hotter water.' },
  ],
  reel: [
    { ms: 5600, caption: 'Water does not just start boiling. First it shimmers, then tiny air bubbles appear, and then the pot begins to sing.', set: { flame: 2, litres: 1.5, start: 28, fast: 14 }, act: (s, inst) => { inst.reset(s); inst.preRun(s, 60); }, view: { pos: [-0.6, 5.4, 9.6], target: [-0.6, 4.8, 0] }, spin: 0.05 },
    { ms: 5000, caption: 'At 100 °C bubbles of water vapour survive all the way to the top. That is a rolling boil.', set: { flame: 2.4, fast: 6 }, act: (s, inst) => inst.preRun(s, 300), view: { pos: [-1.6, 3.6, 6.2], target: [-1.2, 2.6, 0] }, spin: 0.25 },
  ],

  build({ stage, s: s0 }) {
    const root = new THREE.Group(); stage.root.add(root);
    const pot = makePot(root, { x: -0.9, seed: 11 });
    const snd = boilSound();
    const st = { T: 28, m: 1.5, t: 0, rows: [], marks: [], stg: 0, boiled: 0, gas: 0, tBoil: null };
    let S = s0, key = '', q = {};
    const reset = (s) => { if (s) S = s; st.T = S.start; st.m = S.litres; st.t = 0; st.rows = []; st.marks = []; st.stg = 0; st.boiled = 0; st.gas = 0; st.tBoil = null; };
    const wetH = () => (st.m / 1000) / AREA;                         // depth of water, metres
    function physics(dt) {
      const Pin = S.flame * 1000 * STOVE_ETA, loss = potLoss(st.T, { amb: AMB, R: RPOT, wet: wetH() });
      let net = Pin - loss.total, steam = 0;
      if (st.m > 0.02) {
        if (st.T >= TSAT && net > 0) { steam = net; const dm = (net * dt) / latent(st.T); st.m -= dm; st.boiled += dm; st.T = TSAT; }
        else st.T = clamp(st.T + (net * dt) / (st.m * C_WATER), AMB < S.start ? AMB : S.start, TSAT);
      }
      st.t += dt; st.gas += (S.flame * 1000 * dt) / LPG_J;
      const flux = Pin / AREA, Tb = st.m > 0.02 ? baseTemp(st.T, flux) : st.T + 200;
      q = { Pin, loss, net, steam, flux, Tb, warm: Math.max(0, Math.min(net, Pin) - steam) };
      const stg = st.m > 0.02 ? stageOf(st.T, Tb) : 4;
      if (stg > st.stg) { st.marks.push([st.t, st.T, stg]); if (stg === 4 && st.tBoil === null) st.tBoil = st.t; }
      st.stg = stg;
    }
    const log = () => { if (!st.rows.length || st.t - st.rows[st.rows.length - 1][0] >= 4) { st.rows.push([st.t, st.T]); if (st.rows.length > 600) st.rows.splice(0, 2); } };
    const preRun = (s, secs) => { S = s; for (let t = 0; t < secs; t += 1) { physics(1); log(); } };

    reset(); physics(0);

    const bA = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Water temperature', S.fast > 1 ? `time-lapse ×${S.fast}` : 'real time');
      const t1 = Math.max(600, st.t * 1.05), step = t1 > 1500 ? 600 : t1 > 700 ? 300 : 120, xt = []; for (let v = 0; v <= t1; v += step) xt.push(v);
      const { X, Y } = axes(g, w, h, { x0: 70, y1: 62, y0: h - 44, xMax: t1, yMin: 0, yMax: 110, xTicks: xt, yTicks: [0, 25, 50, 75, 100], xFmt: (v) => (v / 60).toFixed(0) + ' min', yFmt: (v) => v + '°' });
      dashH(g, X(0), X(t1), Y(TSAT), 'boiling point, 100 °C', 'rgba(255,122,89,.7)');
      st.marks.forEach(([t, T, k]) => { g.strokeStyle = STAGES[k].col; g.lineWidth = 2; g.beginPath(); g.moveTo(X(t), Y(T) - 4); g.lineTo(X(t), Y(0)); g.stroke(); g.fillStyle = STAGES[k].col; g.font = 'bold 15px sans-serif'; g.save(); g.translate(X(t) + 15, Y(0) - 8); g.rotate(-Math.PI / 2); g.fillText(STAGES[k].n, 0, 0); g.restore(); });
      line(g, st.rows, X, Y, COL.hot, 5);
    }, [5.3, 3.4, 0]);
    const bB = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Where the flame\'s heat goes', 'now');
      bars(g, [
        { label: 'Flame gives out', value: S.flame * 1000, color: '#6f9dff' },
        { label: 'Reaches the pot', value: q.Pin || 0, color: COL.heat },
        { label: 'Warms the water', value: q.warm || 0, color: COL.hot },
        { label: 'Makes steam', value: q.steam || 0, color: COL.latent },
        { label: 'Lost from the pot', value: q.loss?.total || 0, color: COL.steam },
      ], { y: 62, w: 612, rowH: 56, labelW: 200, unit: (v) => fmtW(v), max: 3300 });
    }, [5.3, 1.05, 0]);
    const lStage = stage.label('', [-0.9, 4.35, 0], root, 'hot'), lT = stage.label('', [1.3, 2.3, 0.9], root, 'hot'), lBase = stage.label('', [-1.6, 0.45, 2.2], root);
    lT.element.style.setProperty('--c', COL.hot);

    return {
      reset, preRun,
      dispose() { snd.dispose(); },
      update(dt, s) {
        dt = Math.max(0, Math.min(dt, 0.05)); S = s;
        fitNarrow(stage, [lBase]); reelBoards([bA, bB], -0.6, stage, VIEW);
        if (s._reset) { s._reset = false; reset(s); }
        const n = Math.max(1, Math.round(s.fast)); for (let i = 0; i < n; i++) physics(dt);
        log();
        const fl = clamp(s.flame / 3, 0, 1), boil = st.stg === 4 ? clamp((q.steam || 0) / 1100, 0.08, 1) : 0;
        const sing = st.stg === 3 ? clamp((q.Tb - TSAT) / 8, 0.15, 1) * (st.T > TSAT - 3 ? 0.6 : 1) : 0;
        pot.set({ level: clamp(st.m / 2.6, 0, 1), T: st.T, flame: fl, heat: fl, air: st.stg >= 2 ? clamp((st.T - 45) / 30, 0.15, 1) * (st.stg === 4 ? 0 : 1) : 0, sing, boil: boil + (st.stg === 3 && st.T > TSAT - 3 ? 0.08 : 0), steam: clamp(q.loss.evap / 280, 0, 1) * 0.35 + boil * 0.65, flow: st.stg ? clamp(0.25 + q.flux / 80000, 0, 1) : 0.05 });
        pot.step(dt);
        // quiet shimmer, then a rising hiss while it sings, then the softer, deeper rumble of a boil
        snd.set(st.stg === 3 ? 0.05 + 0.2 * sing : st.stg === 4 ? 0.05 + 0.1 * boil : 0, st.stg === 4 ? 320 : 900 + 900 * sing, 0.7);
        const sd = STAGES[st.stg];
        lStage.element.style.setProperty('--c', sd.col); lStage.element.innerHTML = st.m > 0.02 ? `<b>${sd.n}</b>` : '<b>Boiled dry</b>';
        lT.element.innerHTML = `water <b>${st.T.toFixed(1)} °C</b>`;
        lBase.element.innerHTML = `inside of the base: about ${q.Tb.toFixed(0)} °C`;
        lBase.visible = lBase.visible && s.flame > 0 && st.m > 0.02;
        const k = `${st.rows.length}|${st.marks.length}|${s.flame}|${Math.round((q.steam || 0) / 10)}|${Math.round((q.warm || 0) / 10)}|${s.fast}`;
        if (k !== key) { key = k; bA.redraw(); bB.redraw(); }
      },
      readout: () => {
        const sd = STAGES[st.stg], dry = st.m <= 0.02;
        return `<div class="big" style="color:${sd.col}">${dry ? 'Boiled dry' : sd.n}</div>
          <div class="row"><span>Water</span><b style="color:${COL.hot}">${st.T.toFixed(1)} °C</b></div>
          <div class="row"><span>Inside of the base, about</span><b>${dry ? 'rising fast' : q.Tb.toFixed(0) + ' °C'}</b></div>
          <div class="row"><span>Time on the stove · LPG burnt</span><b>${fmtT(st.t)} · ${(st.gas * 1000).toFixed(1)} g</b></div>
          <div class="row"><span>Reached a rolling boil after</span><b>${st.tBoil === null ? 'not yet' : fmtT(st.tBoil)}</b></div>
          <div class="row"><span>Water left · boiled off</span><b>${st.m.toFixed(2)} L · ${(st.boiled * 1000).toFixed(0)} g</b></div>
          <small>${dry ? 'With no water left to take the heat, the steel has nothing holding it at 100 °C. This is how pots burn.' : sd.d}</small>`;
      },
    };
  },
};
