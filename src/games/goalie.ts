// Goalie — get a glove to every shot.
// Soccer balls fly toward the net; move your gloves to block every strike. Three lives.
import { sim } from '../pose.ts';
import { hardness } from '../meta.ts';
import { backdrop, flat, lit, node, shapes } from '../engine.ts';
import { bestLine, bursts as makeBursts, hands as makeHands, hitSound, hitStop, round, scoreHud, sfx, say, type Game } from '../kit.ts';

const MAX_BALLS = 5;

type Ball = {
  live: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  obj: any;
};

export default async function goalie({ stage, best, onEnd, hud, scene }: Game) {
  const hard = hardness(stage);
  backdrop(scene, 'field');

  const bursts = makeBursts(scene.root);
  const handTracker = makeHands(scene, 1, undefined, 4, ['#22c55e', '#22c55e']);

  // Goal net visual boundary
  const netFrame = node(scene.root, shapes.box(10.5, 6.2, 0.2), flat('#ffffff', { opacity: 0.15 }), [0, 0, 0.1]);
  void netFrame;

  // Ball pool
  const ballMesh = shapes.sphere(0.65, 16);
  const ballLook = lit('#ffffff', { emissive: '#000000' });
  const balls: Ball[] = Array.from({ length: MAX_BALLS }, () => {
    const obj = node(scene.root, ballMesh, ballLook);
    obj.enabled = false;
    return { live: false, x: 0, y: 0, vx: 0, vy: 0, speed: 6, obj };
  });

  let score = 0;
  let lives = 3;
  let spawnTimer = 1.0;

  const checkBest = bestLine(hud, best);
  const finish = () => onEnd([Math.round(score)]);
  const tick = round(hud, Infinity, finish);

  return (dt: number) => {
    const t = tick(dt);
    if (t === null) return;

    bursts.update(dt);
    const hStates = handTracker.update(dt);

    // Spawn incoming soccer shots
    spawnTimer -= dt;
    if (spawnTimer <= 0 && lives > 0) {
      spawnTimer = (1.5 / hard) + Math.random() * 0.7;
      const b = balls.find((ball) => !ball.live);
      if (b) {
        b.live = true;
        // Starts deep/outside and shoots toward net
        const targetX = (Math.random() - 0.5) * 8.0;
        const targetY = -1.5 + Math.random() * 3.5;
        const startX = (Math.random() - 0.5) * 3.0;
        const startY = 4.5;
        b.x = startX;
        b.y = startY;
        const dist = Math.hypot(targetX - startX, targetY - startY);
        b.speed = (6.5 + Math.random() * 3.0) * hard;
        b.vx = ((targetX - startX) / dist) * b.speed;
        b.vy = ((targetY - startY) / dist) * b.speed;
        b.obj.enabled = true;
        b.obj.setLocalPosition(b.x, b.y, 0.4);

        sfx('whoosh', { vol: 0.5 });
      }
    }

    // Update balls
    for (const b of balls) {
      if (!b.live) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.obj.setLocalPosition(b.x, b.y, 0.4);

      // Glove save check
      let saved = false;
      for (const h of hStates) {
        if (!h.on) continue;
        const dist = Math.hypot(h.x - b.x, h.y - b.y);
        if (dist < 1.05 || (sim && dist < 1.5)) {
          saved = true;
          break;
        }
      }

      if (saved) {
        b.live = false;
        b.obj.enabled = false;
        const cornerBonus = Math.abs(b.x) > 3.0 ? 1.5 : 1.0;
        const pts = Math.round(50 * hard * cornerBonus);
        score += pts;

        hitStop(60);
        hitSound('hit', 2);
        hud.pop(b.x, b.y, `SAVED! +${pts}`, '#22c55e');
        bursts.burst(b.x, b.y, 0.5, '#22c55e', 16, 6);
        continue;
      }

      // Ball entered goal (missed save)
      if (b.y < -2.2) {
        b.live = false;
        b.obj.enabled = false;
        lives--;
        sfx('zapTwoTone', { vol: 0.8 });
        hud.flash('#ef4444');
        hud.pop(b.x, b.y, 'GOAL CONCEDED!', '#ef4444');

        if (lives <= 0) {
          say('game_over');
          finish();
          return;
        }
      }
    }

    hud('clock', '♥'.repeat(Math.max(0, lives)));
    scoreHud(hud, 1, [score]);
    checkBest(score);
    hud.p('h', 0, `Gloves Ready · ${lives} Lives Remaining`);
  };
}
