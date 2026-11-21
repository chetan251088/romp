// Lumberjack — wind up and chop across your body.
// Logs fall down the chute; swipe your hands with speed and follow the stripe.
import { sim } from '../pose.ts';
import { hardness } from '../meta.ts';
import { backdrop, fitted, flat, lit, node, shapes } from '../engine.ts';
import { bestLine, bursts as makeBursts, figure, hands as makeHands, hitSound, hitStop, round, scoreHud, sfx, type Game } from '../kit.ts';

const MAX_LOGS = 6;

type Log = {
  live: boolean;
  x: number;
  y: number;
  vy: number;
  angle: number; // stripe angle in degrees
  cut: boolean;
  obj: any;
  stripe: any;
};

export default async function lumberjack({ stage, best, onEnd, hud, scene }: Game) {
  const hard = hardness(stage);
  backdrop(scene, 'dojo');

  const bursts = makeBursts(scene.root);
  const playerFig = figure(scene, 0, { x: 0, y: -1.2, scale: 1.1 });
  const handTracker = makeHands(scene, 1);

  // Log visual pool
  let logTemplate: any = null;
  try {
    logTemplate = await fitted('/assets/camp/tree-log.glb', 2.4, true);
  } catch {
    logTemplate = node(scene.root, shapes.cylinder(0.6, 2.2), lit('#78350f'));
  }

  const logs: Log[] = Array.from({ length: MAX_LOGS }, () => {
    const obj = node(scene.root);
    const m = logTemplate.clone();
    obj.addChild(m);
    // Stripe indicating cut angle
    const stripe = node(obj, shapes.box(0.2, 1.8, 0.7), flat('#ef4444'), [0, 0, 0.4]);
    obj.enabled = false;
    return { live: false, x: 0, y: 0, vy: -2, angle: 0, cut: false, obj, stripe };
  });

  let score = 0;
  let combo = 0;
  let spawnTimer = 0;

  const checkBest = bestLine(hud, best);
  const finish = () => onEnd([Math.round(score)]);
  const tick = round(hud, 60, finish);

  return (dt: number) => {
    const t = tick(dt);
    if (t === null) return;

    bursts.update(dt);
    playerFig.update();
    const hStates = handTracker.update(dt);

    // Spawn logs
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = 1.8 / hard + Math.random() * 0.5;
      const log = logs.find((l) => !l.live);
      if (log) {
        log.live = true;
        log.cut = false;
        log.x = (Math.random() - 0.5) * 5;
        log.y = 5.2;
        log.vy = -(2.2 + Math.random() * 1.0) * hard;
        log.angle = [-35, 0, 35][Math.floor(Math.random() * 3)];
        log.obj.enabled = true;
        log.obj.setLocalPosition(log.x, log.y, 0.3);
        log.obj.setLocalEulerAngles(0, 0, log.angle);
      }
    }

    // Process player chops
    for (const log of logs) {
      if (!log.live || log.cut) continue;
      log.y += log.vy * dt;
      log.obj.setLocalPosition(log.x, log.y, 0.3);

      // Check for swipe across log
      for (const h of hStates) {
        if (!h.on) continue;
        const inHitZone = Math.hypot(h.x - log.x, h.y - log.y) < 1.3;
        const isFastSwipe = h.speed > 5.5 || Math.abs(h.x - h.px) / dt > 6.0;

        if (inHitZone && (isFastSwipe || sim)) {
          log.cut = true;
          combo++;
          const pts = Math.round(50 * hard * (1 + combo * 0.15));
          score += pts;

          hitStop(70);
          hitSound('hit', combo);
          sfx('powerUp', { vol: 0.6 });
          hud.pop(log.x, log.y, `CHOP! +${pts}`, '#22c55e');
          bursts.burst(log.x, log.y, 0.5, '#78350f', 18, 6);

          log.live = false;
          log.obj.enabled = false;
          break;
        }
      }

      if (log.y < -4.2) {
        // Missed log
        log.live = false;
        log.obj.enabled = false;
        combo = 0;
        sfx('zapTwoTone', { vol: 0.4 });
      }
    }

    scoreHud(hud, 1, [score]);
    checkBest(score);
    hud.p('h', 0, combo > 1 ? `Chop Combo ×${combo}` : 'Chop across the stripe!');
  };
}
