// Chapter 2: water as molecules. A live molecular-dynamics simulation (1 scene unit ≈ 0.8 nm).
// 168 round "molecules" attract each other at short range and repel when they touch: the
//   Lennard-Jones potential, V(r) = 4ε[(σ/r)¹² − (σ/r)⁶], cut off at 2.5 σ. Newton's laws are
//   stepped with the velocity-Verlet method (time step 0.005 in model units). The box repeats
//   sideways (periodic walls) and has a floor, a ceiling and a touch of gravity so the liquid sits
//   at the bottom with room for vapour above it. A gentle thermostat (Berendsen, velocity
//   rescaling) nudges the average kinetic energy towards the temperature you set.
// What is real: temperature is the average kinetic energy (T = ⅔ × mean KE per molecule here);
//   speeds follow the Maxwell–Boltzmann distribution, drawn from theory on the chart as a check;
//   only the fast tail has enough energy to break free; more escape as it gets hotter.
// What is simplified: real water molecules are bent and bond in particular directions through
//   hydrogen bonds (about 20 kJ/mol each). The model's attraction is the same in every direction.
//   The temperature scale is matched roughly: the model liquid's freezing point (0.69 ε/k) is
//   pinned to 0 °C and its critical point (about 1.19 with this cut-off) to water's 374 °C.
//   Real steam at 100 °C is about 1,600 times thinner than water, so with 168 molecules you would
//   rarely see even one in the vapour; the model's vapour is denser than that, so you can watch.
// Real-water figures in the readout: v_rms = √(3RT/M) with M = 18.015 g/mol; energy to free one
//   molecule = 40.66 kJ/mol ÷ Avogadro's number, compared with the average kinetic energy 3⁄2 kT.
import { THREE } from '../kit.js';
import {
  K0, R_GAS, M_WATER, L_MOL, COL, hex, dots, board, panelBg, axes, title, line, legend, rng, tempColor, fitNarrow, inReel, reelBoards, clamp, link,
} from '../boil.js';

const NP = 168, LX = 8, LZ = 5, LY = 12, RC2 = 6.25, DT = 0.005, GRAV = 0.03, SC = 0.38;
const VIEW = { pos: [2.2, 4.55, 11.0], target: [2.2, 3.3, 0] };
const tStar = (C) => 0.69 + (C / 374) * 0.5;              // °C on the slider → model temperature
const NB = 26, VMAX = 4.2;
// Maxwell–Boltzmann speed distribution in 3D for unit mass at model temperature T.
export const mb = (v, T) => 4 * Math.PI * Math.pow(1 / (2 * Math.PI * T), 1.5) * v * v * Math.exp((-v * v) / (2 * T));

export default {
  id: 'molecules',
  short: 'Molecules',
  title: 'Water, one molecule at a time',
  subtitle: 'Temperature is motion. The fastest molecules break free, and that is evaporation.',
  view: VIEW,
  learn: `<p>Zoom in a hundred million times and water is a crowd of molecules that never stop moving. They pull on each other: every H₂O is slightly positive at its hydrogens and slightly negative at its oxygen, so neighbours stick with <b>hydrogen bonds</b>. Those bonds hold the liquid together, but they are weak enough to break and re-form billions of times a second.</p>
    <p><b>Temperature</b> is simply the <b>average kinetic energy</b> of the molecules. Heat the water and they jostle faster. But "average" hides a lot: at any moment some molecules are slow and a few are very fast. The chart shows the spread, and the dashed line is what physics predicts (the Maxwell–Boltzmann distribution).</p>
    <p>A molecule at the surface that happens to be moving fast enough, in the right direction, can break its bonds and fly off. That is <b>evaporation</b>, and it happens at <b>any</b> temperature: wet clothes dry at 25 °C. Since the leavers are the fastest ones, the ones left behind are slower on average, which is why evaporation <b>cools</b> (sweat, a wet matka).</p>
    <p>Raise the temperature and the whole spread shifts right. More molecules have enough energy to leave, bonds break more often, and the space above fills with vapour. The next chapter shows what must happen before that vapour can form <b>inside</b> the liquid. Why heat is motion at all is in ${link('thermoclear', 'ThermoClear')}, and what happens when the molecules slow down and lock into a crystal is in FreezeClear and MeltClear.</p>
    <p class="tip"><b>Try it:</b> slide the temperature from 20 °C to 250 °C and watch three things: the chart shifts right, each molecule keeps fewer close neighbours, and the vapour count climbs.</p>`,
  terms: [
    { t: 'Kinetic energy', d: 'The energy of motion, ½ m v². Temperature measures its average over all the molecules.' },
    { t: 'Hydrogen bond', d: 'The attraction between the hydrogen of one water molecule and the oxygen of another. About a tenth as strong as the bonds inside the molecule.' },
    { t: 'Evaporation', d: 'Molecules leaving from the surface of a liquid. It happens at every temperature.' },
    { t: 'Maxwell–Boltzmann distribution', d: 'The spread of molecular speeds at a given temperature: a few slow, most in the middle, a thin tail of very fast ones.' },
  ],
  defaults: { temp: 60, bonds: true, speed: 1 },
  controls: [
    { key: 'temp', type: 'range', label: 'Temperature', min: 10, max: 300, step: 1, ends: ['10 °C', '300 °C'], fmt: (v) => v + ' °C', hint: 'Above 100 °C, picture a closed container that keeps the water liquid.' },
    { key: 'bonds', type: 'toggle', label: 'Show the bonds between neighbours' },
    { key: 'speed', type: 'seg', label: 'Motion', options: [{ v: 0.25, label: 'Slow' }, { v: 1, label: 'Normal' }, { v: 2, label: 'Fast' }] },
    { key: 'go', type: 'buttons', label: 'Start again', items: [{ label: 'Pack the molecules back into a liquid', act: (s, inst) => inst.reset() }] },
  ],
  quiz: [
    { q: 'What does the temperature of water measure?', options: ['How many molecules there are', 'The average kinetic energy of its molecules', 'How many bonds it has', 'The speed of the fastest molecule'], answer: 1, why: 'Temperature is the average energy of motion. Individual molecules are spread around that average: some much slower, a few much faster.' },
    { q: 'Wet clothes dry on a line at 30 °C, far below boiling. How?', options: ['The sun boils the water', 'Air soaks water up like a sponge', 'The fastest molecules at the surface have enough energy to escape', 'Water breaks into hydrogen and oxygen'], answer: 2, why: 'Evaporation needs only that some molecules at the surface are fast enough to break free, and there are always a few in the fast tail.' },
    { q: 'Why does evaporation cool what is left behind?', options: ['The leavers are the fastest molecules, so the average energy of the rest falls', 'Vapour is always cold', 'It lets cold air in', 'It breaks the molecules apart'], answer: 0, why: 'Each escaping molecule carries away more than its share of energy. Lower average kinetic energy means lower temperature.' },
  ],
  reel: [
    { ms: 5400, caption: 'Heat is motion. Hotter water means faster molecules, and the fastest ones break free of their neighbours.', set: { temp: 30, bonds: true, speed: 1 }, anim: { temp: [30, 260] }, act: (s, inst) => inst.reset(), view: { pos: [-0.6, 5.4, 9.6], target: [-0.6, 4.8, 0] }, spin: 0.1 },
  ],

  build({ stage, s: s0 }) {
    const root = new THREE.Group(); stage.root.add(root);
    const OX = -0.9 - (LX * SC) / 2, OY = 0.25, OZ = -(LZ * SC) / 2;
    // the box
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(LX * SC, LY * SC, LZ * SC)), new THREE.LineBasicMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.55 }));
    frame.position.set(-0.9, OY + (LY * SC) / 2, 0); root.add(frame);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(LX * SC + 0.1, 0.1, LZ * SC + 0.1), new THREE.MeshStandardMaterial({ color: 0x8c95a3, metalness: 0.8, roughness: 0.35 })); floor.position.set(-0.9, OY - 0.05, 0); root.add(floor);
    const mol = dots(NP, 0.5 * SC * 0.74, 0xffffff, 12); root.add(mol);
    const MAXB = 900, bpos = new Float32Array(MAXB * 6), bgeo = new THREE.BufferGeometry();
    bgeo.setAttribute('position', new THREE.BufferAttribute(bpos, 3).setUsage(THREE.DynamicDrawUsage));
    const bondLines = new THREE.LineSegments(bgeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 })); bondLines.frustumCulled = false; root.add(bondLines);

    // ---------------------------------------------------------------- the simulation
    const x = new Float64Array(NP), y = new Float64Array(NP), z = new Float64Array(NP);
    const vx = new Float64Array(NP), vy = new Float64Array(NP), vz = new Float64Array(NP);
    const fx = new Float64Array(NP), fy = new Float64Array(NP), fz = new Float64Array(NP);
    const nb = new Uint8Array(NP), gas = new Uint8Array(NP);
    const hist = new Float64Array(NB), rows = [];
    const m = { T: 0.8, Ts: 0.8, bonds: 0, vapour: 0, escaped: 0, t: 0, nBond: 0 };
    let rnd = rng(5), S = s0, key = '', frameN = 0;
    const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
    function forces(measure) {
      fx.fill(0); fz.fill(0); fy.fill(-GRAV);
      if (measure) { nb.fill(0); m.nBond = 0; }
      for (let i = 0; i < NP - 1; i++) {
        for (let j = i + 1; j < NP; j++) {
          let dx = x[i] - x[j], dz = z[i] - z[j]; const dy = y[i] - y[j];
          const wx = dx > LX / 2 ? -LX : dx < -LX / 2 ? LX : 0, wz = dz > LZ / 2 ? -LZ : dz < -LZ / 2 ? LZ : 0;
          dx += wx; dz += wz;
          const r2 = dx * dx + dy * dy + dz * dz;
          if (r2 >= RC2) continue;
          const q2 = Math.max(r2, 0.64), i2 = 1 / q2, i6 = i2 * i2 * i2, f = 24 * i6 * (2 * i6 - 1) * i2;
          fx[i] += f * dx; fy[i] += f * dy; fz[i] += f * dz; fx[j] -= f * dx; fy[j] -= f * dy; fz[j] -= f * dz;
          if (measure && r2 < 2.25) {
            nb[i]++; nb[j]++;
            if (!wx && !wz && m.nBond < MAXB && r2 < 1.82) { const o = m.nBond++ * 6; bpos[o] = OX + x[i] * SC; bpos[o + 1] = OY + y[i] * SC; bpos[o + 2] = OZ + z[i] * SC; bpos[o + 3] = OX + x[j] * SC; bpos[o + 4] = OY + y[j] * SC; bpos[o + 5] = OZ + z[j] * SC; }
          }
        }
      }
    }
    function reset() {
      rnd = rng(5); let n = 0; const T0 = tStar(S.temp);
      for (let k = 0; k < 6; k++) for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) {
        x[n] = (i + 0.5 + 0.1 * (rnd() - 0.5)) * (LX / 7); z[n] = (j + 0.5 + 0.1 * (rnd() - 0.5)) * (LZ / 4); y[n] = 0.8 + k * 1.02;
        vx[n] = gauss() * Math.sqrt(T0); vy[n] = gauss() * Math.sqrt(T0); vz[n] = gauss() * Math.sqrt(T0); n++;
      }
      gas.fill(0); hist.fill(0); rows.length = 0; m.escaped = 0; m.t = 0; m.T = m.Ts = T0;
      forces(true);
    }
    function step(n) {
      const T0 = tStar(S.temp);
      for (let k = 0; k < n; k++) {
        for (let i = 0; i < NP; i++) {
          vx[i] += 0.5 * DT * fx[i]; vy[i] += 0.5 * DT * fy[i]; vz[i] += 0.5 * DT * fz[i];
          x[i] += DT * vx[i]; y[i] += DT * vy[i]; z[i] += DT * vz[i];
          if (x[i] < 0) x[i] += LX; else if (x[i] >= LX) x[i] -= LX;
          if (z[i] < 0) z[i] += LZ; else if (z[i] >= LZ) z[i] -= LZ;
          if (y[i] < 0.5) { y[i] = 1 - y[i]; vy[i] = Math.abs(vy[i]); } else if (y[i] > LY - 0.5) { y[i] = 2 * (LY - 0.5) - y[i]; vy[i] = -Math.abs(vy[i]); }
        }
        forces(k === n - 1);
        let ke = 0;
        for (let i = 0; i < NP; i++) { vx[i] += 0.5 * DT * fx[i]; vy[i] += 0.5 * DT * fy[i]; vz[i] += 0.5 * DT * fz[i]; ke += vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i]; }
        const T = ke / (3 * NP), lam = Math.sqrt(clamp(1 + (DT / 0.15) * (T0 / Math.max(T, 1e-6) - 1), 0.9, 1.1));
        for (let i = 0; i < NP; i++) { vx[i] *= lam; vy[i] *= lam; vz[i] *= lam; }
        m.T = T * lam * lam; m.Ts += (m.T - m.Ts) * 0.004; m.t += DT;
      }
      // measurements
      let bonds = 0, vap = 0; const h = new Float64Array(NB);
      for (let i = 0; i < NP; i++) {
        bonds += nb[i];
        const isGas = nb[i] <= 1;
        if (isGas && !gas[i]) m.escaped++;
        gas[i] = isGas ? 1 : 0; vap += gas[i];
        const v = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i]), b = Math.floor((v / VMAX) * NB);
        if (b < NB) h[b] += 1 / (NP * (VMAX / NB));
      }
      for (let b = 0; b < NB; b++) hist[b] += (h[b] - hist[b]) * 0.06;
      m.bonds += (bonds / NP - m.bonds) * 0.1; m.vapour += (vap - m.vapour) * 0.1;
    }
    reset(); for (let b = 0; b < NB; b++) hist[b] = mb((b + 0.5) * (VMAX / NB), m.T); m.bonds = 8; step(1);

    const col = new THREE.Color(), cGas = new THREE.Color(COL.steam);
    function draw() {
      const T0 = Math.max(0.3, m.T);
      for (let i = 0; i < NP; i++) {
        mol.place(i, OX + x[i] * SC, OY + y[i] * SC, OZ + z[i] * SC, 1);
        const ke = 0.5 * (vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i]);
        tempColor(ke / (1.5 * T0), 0, 2.6, col); if (gas[i]) col.lerp(cGas, 0.25);
        mol.tint(i, col);
      }
      mol.done();
      bondLines.visible = !!S.bonds; bgeo.setDrawRange(0, m.nBond * 2); bgeo.attributes.position.needsUpdate = true;
    }

    const bA = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h); title(g, 'How fast are the molecules?', 'share at each speed');
      const { X, Y } = axes(g, w, h, { x0: 40, y1: 84, y0: h - 44, xMax: VMAX, yMin: 0, yMax: 1.1, xTicks: [0, 1, 2, 3, 4], yTicks: [], xFmt: (v) => (v === 0 ? 'still' : v === 4 ? 'very fast' : '') });
      const bw = X(VMAX / NB) - X(0);
      for (let b = 0; b < NB; b++) { const k = ((b + 0.5) / NB) * VMAX; g.fillStyle = '#' + tempColor((0.5 * k * k) / (1.5 * Math.max(0.3, m.T)), 0, 2.6).getHexString(); g.globalAlpha = 0.85; g.fillRect(X(b * VMAX / NB) + 1, Y(hist[b]), bw - 2, Y(0) - Y(hist[b])); }
      g.globalAlpha = 1;
      const curve = (T) => Array.from({ length: 60 }, (_, i) => [(i / 59) * VMAX, mb((i / 59) * VMAX, T)]);
      line(g, curve(tStar(20)), X, Y, 'rgba(111,182,255,.6)', 2, [4, 5]);
      line(g, curve(m.T), X, Y, '#fff', 3, [9, 6]);
      legend(g, [['Counted in the model', COL.hot], ['Theory at this temperature', '#ffffff'], ['Theory at 20 °C', COL.cold]], 20, 50, 15);
    }, [5.3, 3.4, 0]);
    const bB = board(root, 3.9, 2.25, 632, 364, (g, w, h) => {
      panelBg(g, w, h); title(g, 'Molecules that have broken free', 'out of 168');
      const t1 = Math.max(30, m.t), t0 = Math.max(0, t1 - 120), yM = Math.max(20, Math.ceil(Math.max(...rows.map((r) => r[1]), 0) / 20) * 20);
      const { X, Y } = axes(g, w, h, { x0: 60, y1: 62, y0: h - 44, xMin: t0, xMax: t1, yMin: 0, yMax: yM, xTicks: [], yTicks: [0, yM / 2, yM], yFmt: (v) => v.toFixed(0) });
      line(g, rows.filter((r) => r[0] >= t0), X, Y, COL.steam, 5);
      g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '17px sans-serif'; g.fillText('time →', X(t1) - 60, Y(0) + 26);
    }, [5.3, 1.05, 0]);
    const lV = stage.label('vapour: free molecules', [-0.9 + LX * SC * 0.5 + 0.2, OY + LY * SC * 0.8, 0], root, 'hot'), lL = stage.label('liquid: held by bonds', [-0.9 + LX * SC * 0.5 + 0.2, OY + 1.0, 0], root);
    lV.element.style.setProperty('--c', COL.steam);

    return {
      reset,
      update(dt, s) {
        S = s; fitNarrow(stage, [lV, lL]); reelBoards([bA, bB], -0.6, stage, VIEW);
        step(Math.max(1, Math.round(10 * s.speed * (inReel() ? 1.2 : 1))));
        draw();
        if (++frameN % 6 === 0) { rows.push([m.t, m.vapour]); if (rows.length > 900) rows.shift(); const k = String(frameN); if (k !== key) { key = k; bA.redraw(); bB.redraw(); } }
      },
      readout: (s) => {
        const K = s.temp + K0, vr = Math.sqrt((3 * R_GAS * K) / M_WATER), ratio = L_MOL / (1.5 * R_GAS * K), TC = ((m.Ts - 0.69) / 0.5) * 374;
        return `<div class="big">Temperature = average motion</div>
          <div class="row"><span>You set ${s.temp} °C · measured from motion</span><b style="color:${COL.hot}">${TC.toFixed(0)} °C</b></div>
          <div class="row"><span>Close neighbours per molecule</span><b>${m.bonds.toFixed(1)}</b></div>
          <div class="row"><span>In the vapour now</span><b style="color:${COL.steam}">${m.vapour.toFixed(0)} of ${NP}</b></div>
          <div class="row"><span>Real water at ${s.temp} °C: typical speed</span><b>${Math.round(vr)} m/s</b></div>
          <div class="row"><span>Energy to break free ÷ average energy</span><b>${ratio.toFixed(1)}×</b></div>
          <small>Only the fast tail can leave. The model's molecules are simple round balls, and its vapour is drawn far denser than real steam.</small>`;
      },
    };
  },
};
