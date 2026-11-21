// Sprint — run on the spot, knees up. Your pace is your speed.
// Three 20-second heats flat out. High knees count toward a faster stride.
import { players, sim } from '../pose.ts';
import { hardness } from '../meta.ts';
import { backdrop, flat, glowLook, node, shapes } from '../engine.ts';
import { bestLine, bursts as makeBursts, divider, figure, round, scoreHud, sfx, zoneHalf, zoneX, type Game } from '../kit.ts';

const HEAT_TIME = 20;

export default async function sprint({ n, stage, best, onEnd, hud, scene }: Game) {
  const hard = hardness(stage);
  backdrop(scene, 'gym');
  divider(scene, n);

  const bursts = makeBursts(scene.root);
  const runners = Array.from({ length: n }, (_, p) => figure(scene, p, { x: zoneX(n, p), y: -1.2, scale: 1.1 }));

  // Track lanes and distance markers
  const laneWidth = zoneHalf(n) * 1.8;
  const tracks = Array.from({ length: n }, (_, p) => {
    const cx = zoneX(n, p);
    const meterBg = node(scene.root, shapes.quad(laneWidth * 0.9, 0.4), flat('#18181b', { opacity: 0.85 }), [cx, 3.8, 0.1]);
    const meterBar = node(scene.root, shapes.quad(laneWidth * 0.9, 0.32), flat('#f59e0b'), [cx, 3.8, 0.2]);
    const glow = node(scene.root, shapes.quad(laneWidth * 0.9 + 0.4, 0.6), glowLook('#f59e0b', 0.5), [cx, 3.8, 0.05]);
    void meterBg; void glow;
    return { meterBar, cx };
  });

  const scores = Array.from({ length: n }, () => 0);
  const steps = Array.from({ length: n }, () => 0);
  const kneeUp = Array.from({ length: n }, () => [false, false]); // [left, right]
  let currentHeat = 1;
  let heatTimer = HEAT_TIME;
  let stridePace = Array.from({ length: n }, () => 0);

  const checkBest = bestLine(hud, best);
  const finish = () => onEnd(scores.map(Math.round));
  const tick = round(hud, HEAT_TIME * 3, finish);

  return (dt: number) => {
    const t = tick(dt);
    if (t === null) return;

    bursts.update(dt);
    runners.forEach((r) => r.update());

    for (let p = 0; p < n; p++) {
      const pl = players[p];
      if (!pl.present) continue;

      let stepTaken = false;
      if (sim) {
        stridePace[p] = Math.min(10, stridePace[p] + dt * 3);
        if (Math.random() < 0.25) stepTaken = true;
      } else if (pl.rig.length === 33) {
        const rig = pl.rig;
        const lKneeHeight = rig[25][1] - rig[23][1];
        const rKneeHeight = rig[26][1] - rig[24][1];
        const threshold = -0.45;

        // Left step
        if (lKneeHeight > threshold && !kneeUp[p][0]) {
          kneeUp[p][0] = true;
          stepTaken = true;
        } else if (lKneeHeight < threshold - 0.15) {
          kneeUp[p][0] = false;
        }

        // Right step
        if (rKneeHeight > threshold && !kneeUp[p][1]) {
          kneeUp[p][1] = true;
          stepTaken = true;
        } else if (rKneeHeight < threshold - 0.15) {
          kneeUp[p][1] = false;
        }
      }

      if (stepTaken) {
        steps[p]++;
        stridePace[p] = Math.min(12, stridePace[p] + 1.8);
        const pts = Math.round(10 * hard * (1 + stridePace[p] * 0.15));
        scores[p] += pts;
        sfx('tick', { vol: 0.4, rate: 1.2 + stridePace[p] * 0.05 });
        if (steps[p] % 10 === 0) {
          hud.pop(tracks[p].cx, 1.5, `+${pts}`, '#fbbf24');
          bursts.burst(tracks[p].cx, -1.2, 0.5, '#fbbf24', 8, 4);
        }
      }

      // Decay pace naturally
      stridePace[p] = Math.max(0, stridePace[p] - dt * 2.2);

      // Update speed bar
      const barFill = Math.min(1, stridePace[p] / 8);
      tracks[p].meterBar.setLocalScale(barFill, 1, 1);
      tracks[p].meterBar.setLocalPosition(tracks[p].cx - (laneWidth * 0.9 * (1 - barFill)) / 2, 3.8, 0.2);

      hud.p('h', p, `Heat ${currentHeat}/3 · ${Math.round(stridePace[p] * 10)} km/h`);
    }

    // Heat countdown progression
    heatTimer -= dt;
    if (heatTimer <= 0 && currentHeat < 3) {
      currentHeat++;
      heatTimer = HEAT_TIME;
      hud.banner(`Heat ${currentHeat}! GO!`, 1200);
      sfx('powerUp', { vol: 0.8 });
    }

    scoreHud(hud, n, scores);
    checkBest(scores[0]);
  };
}
