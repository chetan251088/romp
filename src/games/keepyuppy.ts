// Keepy-Uppy — keep the balloon off the floor.
// Headers and kicks keep the balloon dancing in the air. Team play supported.
import { sim } from '../pose.ts';
import { hardness } from '../meta.ts';
import { backdrop, lit, node, shapes } from '../engine.ts';
import { bestLine, bursts as makeBursts, comboText, figure, hitSound, hitStop, round, scoreHud, sfx, say, zoneX, type Game } from '../kit.ts';

export default async function keepyUppy({ n, stage, team, best, onEnd, hud, scene }: Game) {
  const hard = hardness(stage);
  backdrop(scene, 'park');

  const bursts = makeBursts(scene.root);
  const runners = Array.from({ length: n }, (_, p) => figure(scene, p, { x: zoneX(n, p), y: -1.4, scale: 1.1 }));

  // Balloon entity
  const balloonRadius = 0.95;
  const balloonMesh = shapes.sphere(balloonRadius, 20);
  const balloonLook = lit('#f43f5e', { emissive: '#fb7185', glow: 0.35 });
  const balloon = node(scene.root, balloonMesh, balloonLook, [0, 1.5, 0.4]);
  // Balloon knot string
  node(balloon, shapes.cone(0.15, 0.3), lit('#be123c'), [0, -balloonRadius * 0.95, 0]);

  let bx = 0;
  let by = 2.0;
  let bvx = 0.4;
  let bvy = 2.0;
  const gravity = -4.5 * hard;

  let score = 0;
  let combo = 0;
  let lives = 3;

  const checkBest = bestLine(hud, best);
  const finish = () => onEnd(n === 2 ? [Math.round(score), Math.round(score)] : [Math.round(score)]);
  const tick = round(hud, Infinity, finish);

  return (dt: number) => {
    const t = tick(dt);
    if (t === null) return;

    bursts.update(dt);
    const pads = runners.flatMap((r) => r.update());

    // Balloon physics
    bvy += gravity * dt;
    bx += bvx * dt;
    by += bvy * dt;

    // Bounce off left/right screen walls
    if (bx < -6.8) {
      bx = -6.8;
      bvx = Math.abs(bvx) * 0.9;
      sfx('tick', { vol: 0.3 });
    } else if (bx > 6.8) {
      bx = 6.8;
      bvx = -Math.abs(bvx) * 0.9;
      sfx('tick', { vol: 0.3 });
    }

    // Check hit against player pads (head, feet, hands)
    let balloonHit = false;
    let hitPart = '';

    for (const pad of pads) {
      if (!pad.seen && !sim) continue;
      const dist = Math.hypot(pad.x - bx, pad.y - by);
      if (dist < balloonRadius + 0.45 || (sim && Math.abs(by - 0) < 1.0)) {
        balloonHit = true;
        hitPart = pad.part;
        // Direction away from pad
        const dx = bx - pad.x;
        bvx = Math.max(-4, Math.min(4, dx * 3.5 + (Math.random() - 0.5) * 1.5));
        bvy = Math.max(5.5, 6.5 + Math.random() * 2.0);
        break;
      }
    }

    if (balloonHit) {
      combo++;
      const isHeader = hitPart === 'head';
      const isKick = hitPart === 'foot';
      const pts = Math.round((isHeader ? 30 : isKick ? 25 : 15) * hard * (1 + combo * 0.1));
      score += pts;

      hitStop(45);
      hitSound('hit', combo);
      hud.pop(bx, by, isHeader ? `HEADER! +${pts}` : isKick ? `KICK! +${pts}` : `BUMP! +${pts}`, '#f43f5e');
      bursts.burst(bx, by, 0.4, '#f43f5e', 14, 5);
    }

    // Balloon hit the floor!
    if (by < -3.6) {
      lives--;
      combo = 0;
      sfx('zapTwoTone', { vol: 0.7 });
      hud.flash('#ef4444');
      hud.pop(bx, -3.2, 'BALLOON DROPPED!', '#ef4444');

      if (lives <= 0) {
        say('game_over');
        finish();
        return;
      }

      // Reset balloon to sky
      by = 3.5;
      bx = 0;
      bvx = (Math.random() - 0.5) * 2;
      bvy = 1.0;
    }

    balloon.setLocalPosition(bx, by, 0.4);

    hud('clock', '♥'.repeat(Math.max(0, lives)));
    scoreHud(hud, team ? 1 : n, [score]);
    checkBest(score);
    hud.p('h', 0, combo > 1 ? comboText(combo) : 'Headers and kicks keep it up!');
  };
}
