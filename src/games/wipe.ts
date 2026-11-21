// Wipe — scrub the screen clean before the grime creeps back.
// Two players scrub together to clear the grime tiles. Satisfying, fast-paced team cleanup.
import { sim } from '../pose.ts';
import { hardness } from '../meta.ts';
import { backdrop, instanced, shapes } from '../engine.ts';
import { H, W, bestLine, bursts as makeBursts, hands as makeHands, round, scoreHud, sfx, type Game } from '../kit.ts';

const COLS = 12;
const ROWS = 8;
const TOTAL_CELLS = COLS * ROWS;

export default async function wipe({ n, stage, team, best, onEnd, hud, scene }: Game) {
  const hard = hardness(stage);
  const bg = backdrop(scene, 'bathroom');

  const bursts = makeBursts(scene.root);
  const handTracker = makeHands(scene, n, undefined, 3);

  // Instanced grime tiles covering the screen
  const cellW = (W * 0.92) / COLS;
  const cellH = (H * 0.85) / ROWS;
  const grimeMesh = instanced(scene.root, shapes.quad(cellW * 0.94, cellH * 0.94), TOTAL_CELLS, 0.85);

  const grimeLevels = new Float32Array(TOTAL_CELLS);
  for (let i = 0; i < TOTAL_CELLS; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = -W * 0.46 + (col + 0.5) * cellW;
    const y = -H * 0.42 + (row + 0.5) * cellH;
    grimeLevels[i] = 0.8 + Math.random() * 0.2;
    grimeMesh.place(i, x, y, -0.2, 1);
    grimeMesh.paint(i, '#1e293b');
  }
  grimeMesh.commit();

  let teamScore = 0;
  let cleanPercent = 0;
  let fullCleanBonusTimer = 0;

  const checkBest = bestLine(hud, best);
  const finish = () => onEnd(n === 2 ? [Math.round(teamScore), Math.round(teamScore)] : [Math.round(teamScore)]);
  const tick = round(hud, 60, finish);

  return (dt: number) => {
    const t = tick(dt);
    if (t === null) return;

    bursts.update(dt);
    const hStates = handTracker.update(dt);
    bg.drive(cleanPercent / 100);

    // Scrub cells near hands
    for (const h of hStates) {
      if (!h.on) continue;

      for (let i = 0; i < TOTAL_CELLS; i++) {
        if (grimeLevels[i] <= 0.05) continue;
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const cx = -W * 0.46 + (col + 0.5) * cellW;
        const cy = -H * 0.42 + (row + 0.5) * cellH;

        const dist = Math.hypot(h.x - cx, h.y - cy);
        if (dist < 1.15 || (sim && dist < 1.8)) {
          const scrubbed = Math.min(grimeLevels[i], dt * 4.5);
          grimeLevels[i] -= scrubbed;
          teamScore += Math.round(scrubbed * 25 * hard);

          if (Math.random() < 0.08) {
            sfx('tick', { vol: 0.25, rate: 1.8 });
            bursts.burst(cx, cy, 0.4, '#38bdf8', 4, 3);
          }
        }
      }
    }

    // Grime slowly creeps back
    let cleanCount = 0;
    const regrowRate = 0.045 * hard;
    for (let i = 0; i < TOTAL_CELLS; i++) {
      if (grimeLevels[i] < 1.0) {
        grimeLevels[i] = Math.min(1.0, grimeLevels[i] + dt * regrowRate);
      }
      grimeMesh.fade(i, grimeLevels[i]);
      if (grimeLevels[i] < 0.2) cleanCount++;
    }
    grimeMesh.commit();

    cleanPercent = Math.round((cleanCount / TOTAL_CELLS) * 100);

    // 100% clean board bonus
    if (cleanPercent >= 95) {
      fullCleanBonusTimer += dt;
      if (fullCleanBonusTimer >= 1.0) {
        fullCleanBonusTimer = 0;
        teamScore += Math.round(150 * hard);
        hud.pop(0, 0, 'SPARKLING CLEAN! +150', '#38bdf8');
        sfx('powerUp', { vol: 0.7 });
      }
    }

    scoreHud(hud, team ? 1 : n, [teamScore]);
    checkBest(teamScore);
    hud.p('h', 0, `Clean: ${cleanPercent}% · Keep scrubbing!`);
    if (n === 2) hud.p('h', 1, `Clean: ${cleanPercent}% · Team effort`);
  };
}
