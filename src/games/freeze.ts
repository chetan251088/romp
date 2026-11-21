// Freeze — dance, then hold dead still.
// Score big points while the music pumps; freeze solid the instant it stops.
import { players, sim } from '../pose.ts';
import { hardness } from '../meta.ts';
import { backdrop, glowLook, node, shapes } from '../engine.ts';
import { bestLine, bursts as makeBursts, divider, figure, round, scoreHud, sfx, zoneX, type Game } from '../kit.ts';

export default async function freeze({ n, stage, best, onEnd, hud, scene }: Game) {
  const hard = hardness(stage);
  backdrop(scene, 'dancestage');
  divider(scene, n);

  const bursts = makeBursts(scene.root);
  const runners = Array.from({ length: n }, (_, p) => figure(scene, p, { x: zoneX(n, p), y: -1.2, scale: 1.1 }));

  // Ice overlay indicator for freeze phase
  const iceFrame = node(scene.root, shapes.quad(16, 9), glowLook('#38bdf8', 0.25), [0, 0, 0.4]);
  iceFrame.enabled = false;

  const scores = Array.from({ length: n }, () => 0);
  let isFreezing = false;
  let phaseTimer = 7.0; // Dance for 7s first
  const prevEnergy = Array.from({ length: n }, () => 0);

  const checkBest = bestLine(hud, best);
  const finish = () => onEnd(scores.map(Math.round));
  const tick = round(hud, 60, finish);

  return (dt: number) => {
    const t = tick(dt);
    if (t === null) return;

    bursts.update(dt);
    runners.forEach((r) => r.update());

    phaseTimer -= dt;
    if (phaseTimer <= 0) {
      isFreezing = !isFreezing;
      phaseTimer = isFreezing ? 3.5 / hard : (6.5 + Math.random() * 3.0);
      iceFrame.enabled = isFreezing;

      if (isFreezing) {
        hud.banner('FREEZE!', 1400);
        hud.flash('#38bdf8');
        sfx('zapTwoTone', { vol: 0.8 });
      } else {
        hud.banner('DANCE!', 1200);
        hud.flash('#f472b6');
        sfx('powerUp', { vol: 0.7 });
      }
    }

    for (let p = 0; p < n; p++) {
      const pl = players[p];
      if (!pl.present) continue;

      const currentEnergy = pl.energy;
      const energyDelta = Math.max(0, currentEnergy - prevEnergy[p]);
      prevEnergy[p] = currentEnergy;

      if (!isFreezing) {
        // Dance phase: movement pays points!
        const pts = Math.round((energyDelta * 8 + (sim ? 1.5 : 0)) * hard);
        scores[p] += pts;
        hud.p('h', p, `DANCE! +${pts}`);
      } else {
        // Freeze phase: holding still is tested
        const moved = energyDelta > 0.45;
        if (moved && !sim) {
          // Penalty!
          scores[p] = Math.max(0, scores[p] - 25);
          hud.pop(zoneX(n, p), 0.5, 'MOVED! -25', '#ef4444');
          sfx('zapTwoTone', { vol: 0.5 });
          hud.p('h', p, 'STILL! HOLD STILL!');
        } else {
          // Good freeze bonus
          scores[p] += Math.round(15 * dt * hard);
          hud.p('h', p, 'ICE COLD! PERFECT');
        }
      }
    }

    scoreHud(hud, n, scores);
    checkBest(scores[0]);
  };
}
