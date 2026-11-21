// Leaks — plug the cracks with your whole body.
// Water jets burst from cracks in the wall; block them with your hands, feet, and head.
import { sim } from '../pose.ts';
import { hardness } from '../meta.ts';
import { backdrop, flat, glowLook, node, shapes } from '../engine.ts';
import { bestLine, bursts as makeBursts, figure, round, scoreHud, sfx, say, type Game } from '../kit.ts';

const MAX_CRACKS = 6;

type Crack = {
  live: boolean;
  x: number;
  y: number;
  plugged: boolean;
  waterTime: number;
  obj: any;
  jet: any;
};

export default async function leaks({ stage, best, onEnd, hud, scene }: Game) {
  const hard = hardness(stage);
  const bg = backdrop(scene, 'pipe');

  const bursts = makeBursts(scene.root);
  const playerFig = figure(scene, 0, { x: 0, y: -1.2, scale: 1.15 });

  // Crack visual pool
  const crackMesh = shapes.circle(0.45, 12);
  const jetMesh = shapes.cylinder(0.18, 1.8);
  const jetLook = glowLook('#38bdf8', 0.9);

  const cracks: Crack[] = Array.from({ length: MAX_CRACKS }, () => {
    const obj = node(scene.root, crackMesh, flat('#0284c7'));
    const jet = node(obj, jetMesh, jetLook, [0, 0, 0.6]);
    jet.setLocalEulerAngles(90, 0, 0);
    obj.enabled = false;
    return { live: false, x: 0, y: 0, plugged: false, waterTime: 0, obj, jet };
  });

  let score = 0;
  let lives = 3;
  let floodMeter = 0; // 0..100
  let spawnTimer = 1.0;

  const checkBest = bestLine(hud, best);
  const finish = () => onEnd([Math.round(score)]);
  const tick = round(hud, Infinity, finish);

  return (dt: number) => {
    const t = tick(dt);
    if (t === null) return;

    bursts.update(dt);
    const pads = playerFig.update();

    bg.drive(floodMeter / 100);

    // Spawn new pipe cracks
    spawnTimer -= dt;
    if (spawnTimer <= 0 && lives > 0) {
      spawnTimer = 2.2 / hard + Math.random() * 1.0;
      const crack = cracks.find((c) => !c.live);
      if (crack) {
        crack.live = true;
        crack.plugged = false;
        crack.x = (Math.random() - 0.5) * 6.5;
        // Diverse heights: high (hands), middle (head/hands), low (feet)
        crack.y = -2.5 + Math.random() * 4.8;
        crack.waterTime = 0;
        crack.obj.enabled = true;
        crack.obj.setLocalPosition(crack.x, crack.y, 0.2);
        sfx('whoosh', { vol: 0.5 });
      }
    }

    // Check crack plugging against body pads
    let unpluggedCount = 0;
    for (const crack of cracks) {
      if (!crack.live) continue;

      let isCovered = false;
      for (const pad of pads) {
        if (!pad.seen && !sim) continue;
        const dist = Math.hypot(pad.x - crack.x, pad.y - crack.y);
        if (dist < 0.85 || (sim && Math.abs(crack.y) < 1.0)) {
          isCovered = true;
          break;
        }
      }

      crack.plugged = isCovered;
      crack.jet.enabled = !isCovered;

      if (isCovered) {
        score += Math.round(15 * dt * hard);
        if (Math.random() < 0.1) {
          sfx('tick', { vol: 0.2, rate: 1.5 });
          bursts.burst(crack.x, crack.y, 0.4, '#38bdf8', 4, 3);
        }
      } else {
        unpluggedCount++;
        crack.waterTime += dt;
        if (Math.random() < 0.08) bursts.burst(crack.x, crack.y, 0.5, '#0284c7', 6, 4);
      }
    }

    // Unplugged water fills flood meter
    if (unpluggedCount > 0) {
      floodMeter += unpluggedCount * dt * 14 * hard;
      if (floodMeter >= 100) {
        floodMeter = 0;
        lives--;
        sfx('zapTwoTone', { vol: 0.8 });
        hud.flash('#38bdf8');
        hud.pop(0, 0, 'FLOODED! -1 LIFE', '#ef4444');

        if (lives <= 0) {
          say('game_over');
          finish();
          return;
        }
      }
    } else {
      floodMeter = Math.max(0, floodMeter - dt * 25);
    }

    hud('clock', '♥'.repeat(Math.max(0, lives)));
    scoreHud(hud, 1, [score]);
    checkBest(score);
    hud.p('h', 0, `Water Level: ${Math.round(floodMeter)}% · Plug the leaks!`);
  };
}
