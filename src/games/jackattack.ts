// Jack Attack — every jumping jack fires the cannon.
// Arms up and out, feet apart to fire. Destroy alien targets before they reach the ground.
import { players, sim } from '../pose.ts';
import { hardness } from '../meta.ts';
import { backdrop, glowLook, lit, node, shapes, tint } from '../engine.ts';
import { bestLine, bursts as makeBursts, comboText, divider, figure, hitSound, hitStop, round, scoreHud, sfx, zoneHalf, zoneX, type Game } from '../kit.ts';

const MAX_TARGETS = 16;
const MAX_BALLS = 12;

type Target = { live: boolean; x: number; y: number; vy: number; hp: number; maxHp: number; obj: any; p: number };
type Ball = { live: boolean; x: number; y: number; vy: number; vx: number; obj: any; p: number };

export default async function jackAttack({ n, stage, best, onEnd, hud, scene }: Game) {
  const hard = hardness(stage);
  backdrop(scene, 'gym');
  divider(scene, n);

  const bursts = makeBursts(scene.root);
  const runners = Array.from({ length: n }, (_, p) => figure(scene, p, { x: zoneX(n, p), y: -1.5, scale: 0.95 }));

  // Cannon visual per player
  const cannons = Array.from({ length: n }, (_, p) => {
    const cx = zoneX(n, p);
    const base = node(scene.root, shapes.box(1.2, 0.6, 0.6), lit('#475569'), [cx, -3.8, 0.2]);
    const barrel = node(scene.root, shapes.cylinder(0.35, 1.4), lit('#334155'), [cx, -3.2, 0.3]);
    barrel.setLocalEulerAngles(0, 0, 0);
    return { base, barrel, cx };
  });

  // Target pool (cute flying alien spheres with glowing eyes)
  const targetMesh = shapes.sphere(0.65, 14);
  const targetLook = lit('#a855f7', { emissive: '#7c3aed', glow: 0.4 });
  const targets: Target[] = Array.from({ length: MAX_TARGETS }, () => {
    const obj = node(scene.root, targetMesh, targetLook);
    obj.enabled = false;
    return { live: false, x: 0, y: 0, vy: -1.2, hp: 1, maxHp: 1, obj, p: 0 };
  });

  // Cannonball pool
  const ballMesh = shapes.sphere(0.28, 10);
  const ballLook = glowLook('#f97316', 0.9);
  const balls: Ball[] = Array.from({ length: MAX_BALLS }, () => {
    const obj = node(scene.root, ballMesh, ballLook);
    obj.enabled = false;
    return { live: false, x: 0, y: 0, vy: 14, vx: 0, obj, p: 0 };
  });

  const scores = Array.from({ length: n }, () => 0);
  const combos = Array.from({ length: n }, () => 0);
  const isJackOpen = Array.from({ length: n }, () => false);
  let spawnTimer = 0;

  const checkBest = bestLine(hud, best);
  const finish = () => onEnd(scores.map(Math.round));
  const tick = round(hud, 60, finish);

  const fireCannon = (p: number) => {
    const ball = balls.find((b) => !b.live);
    if (!ball) return;
    ball.live = true;
    ball.p = p;
    ball.x = cannons[p].cx + (Math.random() - 0.5) * 0.4;
    ball.y = -3.0;
    ball.vy = 16;
    ball.vx = (Math.random() - 0.5) * 1.5;
    ball.obj.enabled = true;
    ball.obj.setLocalPosition(ball.x, ball.y, 0.5);

    sfx('zapThreeToneUp', { vol: 0.7 });
    hud.pop(cannons[p].cx, -2.8, 'BOOM!', '#f97316');
    bursts.burst(cannons[p].cx, -2.8, 0.5, '#f97316', 10, 5);
  };

  return (dt: number) => {
    const t = tick(dt);
    if (t === null) return;

    bursts.update(dt);
    runners.forEach((r) => r.update());

    // Spawn targets
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = (1.4 / hard) + Math.random() * 0.6;
      for (let p = 0; p < n; p++) {
        const target = targets.find((tg) => !tg.live);
        if (target) {
          target.live = true;
          target.p = p;
          const span = zoneHalf(n) * 0.75;
          target.x = zoneX(n, p) + (Math.random() - 0.5) * 2 * span;
          target.y = 4.8;
          target.vy = -(1.2 + Math.random() * 0.8) * hard;
          target.maxHp = target.hp = stage >= 3 && Math.random() < 0.35 ? 2 : 1;
          target.obj.enabled = true;
          target.obj.setLocalPosition(target.x, target.y, 0.3);
          tint(target.obj, target.hp > 1 ? '#ef4444' : '#a855f7');
        }
      }
    }

    // Detect jumping jacks per player
    for (let p = 0; p < n; p++) {
      const pl = players[p];
      if (!pl.present) continue;

      let detectedJack = false;
      if (sim) {
        // In sim mode, pressing 'A' or 'D' triggers a jack
        if (pl.hands[0].y > 0.4 && pl.hands[1].y > 0.4) {
          if (!isJackOpen[p]) {
            isJackOpen[p] = true;
            detectedJack = true;
          }
        } else {
          isJackOpen[p] = false;
        }
      } else if (pl.rig.length === 33) {
        const rig = pl.rig;
        // Wrists: 15, 16. Shoulders: 11, 12. Ankles: 27, 28. Hips: 23, 24.
        const armsUp = rig[15][1] > 0.2 && rig[16][1] > 0.2;
        const armsWide = Math.abs(rig[15][0] - rig[16][0]) > 1.8;
        const feetApart = Math.abs(rig[27][0] - rig[28][0]) > 0.9;

        const inJackState = armsUp && armsWide && feetApart;
        if (inJackState && !isJackOpen[p]) {
          isJackOpen[p] = true;
          detectedJack = true;
        } else if (!inJackState && !armsUp && !feetApart) {
          isJackOpen[p] = false;
        }
      }

      if (detectedJack) {
        combos[p]++;
        fireCannon(p);
        hud.p('h', p, comboText(combos[p]) || 'Fire!');
      }
    }

    // Update cannonballs
    for (const ball of balls) {
      if (!ball.live) continue;
      ball.y += ball.vy * dt;
      ball.x += ball.vx * dt;
      ball.obj.setLocalPosition(ball.x, ball.y, 0.5);

      if (ball.y > 5.5) {
        ball.live = false;
        ball.obj.enabled = false;
        continue;
      }

      // Hit check against targets
      for (const target of targets) {
        if (!target.live || target.p !== ball.p) continue;
        const dist = Math.hypot(ball.x - target.x, ball.y - target.y);
        if (dist < 0.85) {
          ball.live = false;
          ball.obj.enabled = false;
          target.hp--;

          hitSound('hit', combos[ball.p]);
          hitStop(50);
          bursts.burst(target.x, target.y, 0.5, '#ec4899', 14, 6);

          if (target.hp <= 0) {
            target.live = false;
            target.obj.enabled = false;
            const pts = Math.round(25 * hard * (1 + combos[ball.p] * 0.1));
            scores[ball.p] += pts;
            hud.pop(target.x, target.y, `+${pts}`, '#38bdf8');
          } else {
            tint(target.obj, '#fb923c');
          }
          break;
        }
      }
    }

    // Update targets
    for (const target of targets) {
      if (!target.live) continue;
      target.y += target.vy * dt;
      target.obj.setLocalPosition(target.x, target.y, 0.3);

      if (target.y < -3.5) {
        // Reached floor
        target.live = false;
        target.obj.enabled = false;
        combos[target.p] = 0;
        sfx('zapTwoTone', { vol: 0.5 });
        hud.pop(target.x, -3.2, 'MISSED', '#ef4444');
      }
    }

    scoreHud(hud, n, scores);
    checkBest(scores[0]);
  };
}
