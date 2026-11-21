// Smash — knock the crate tower down.
// Towers of wooden crates build up; swipe hard with your hands to send them flying.
import { sim } from '../pose.ts';
import { hardness } from '../meta.ts';
import { backdrop, fitted, lit, node, shapes } from '../engine.ts';
import { H, W, bestLine, bursts as makeBursts, comboText, divider, hands as makeHands, hitSound, hitStop, round, scoreHud, sfx, zoneX, type Game } from '../kit.ts';

const CRATES_PER_TOWER = 5;

type Crate = {
  live: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  hit: boolean;
  obj: any;
  p: number;
};

export default async function smash({ n, stage, best, onEnd, hud, scene }: Game) {
  const hard = hardness(stage);
  backdrop(scene, 'warehouse');
  divider(scene, n);

  const bursts = makeBursts(scene.root);
  const handTracker = makeHands(scene, n, undefined, 6);

  // Crate visual model
  let crateTemplate: any = null;
  try {
    crateTemplate = await fitted('/assets/kit/crate.glb', 1.4, true);
  } catch {
    crateTemplate = node(scene.root, shapes.box(1.2, 1.2, 1.2), lit('#d97706'));
  }

  const crates: Crate[] = [];
  for (let p = 0; p < n; p++) {
    for (let i = 0; i < CRATES_PER_TOWER * 2; i++) {
      const obj = node(scene.root);
      obj.addChild(crateTemplate.clone());
      obj.enabled = false;
      crates.push({ live: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, hit: false, obj, p });
    }
  }

  const spawnTower = (p: number) => {
    const cx = zoneX(n, p);
    for (let i = 0; i < CRATES_PER_TOWER; i++) {
      const c = crates.find((cr) => !cr.live && cr.p === p);
      if (c) {
        c.live = true;
        c.hit = false;
        c.x = cx;
        c.y = -3.2 + i * 1.35;
        c.vx = 0;
        c.vy = 0;
        c.rot = 0;
        c.obj.enabled = true;
        c.obj.setLocalPosition(c.x, c.y, 0.4);
        c.obj.setLocalEulerAngles(0, 0, 0);
      }
    }
  };

  for (let p = 0; p < n; p++) spawnTower(p);

  const scores = Array.from({ length: n }, () => 0);
  const combos = Array.from({ length: n }, () => 0);

  const checkBest = bestLine(hud, best);
  const finish = () => onEnd(scores.map(Math.round));
  const tick = round(hud, 60, finish);

  return (dt: number) => {
    const t = tick(dt);
    if (t === null) return;

    bursts.update(dt);
    const hStates = handTracker.update(dt);

    for (let p = 0; p < n; p++) {
      let activeCratesInTower = 0;

      for (const c of crates) {
        if (!c.live || c.p !== p) continue;

        if (c.hit) {
          // Physics tumbling away
          c.vy -= 14 * dt;
          c.y += c.vy * dt;
          c.x += c.vx * dt;
          c.rot += c.vx * dt * 45;
          c.obj.setLocalPosition(c.x, c.y, 0.4);
          c.obj.setLocalEulerAngles(0, 0, c.rot);

          if (c.y < -H / 2 - 2 || Math.abs(c.x) > W / 2 + 3) {
            c.live = false;
            c.obj.enabled = false;
          }
          continue;
        }

        activeCratesInTower++;

        // Hit detection against hands
        for (const h of hStates) {
          if (!h.on || h.p !== p) continue;
          const dist = Math.hypot(h.x - c.x, h.y - c.y);
          const hardSwipe = h.speed > 5.5 || sim;

          if (dist < 1.1 && hardSwipe) {
            c.hit = true;
            combos[p]++;
            c.vx = (h.x - c.x > 0 ? -1 : 1) * (7 + Math.random() * 5);
            c.vy = 5 + Math.random() * 6;

            const pts = Math.round(35 * hard * (1 + combos[p] * 0.1));
            scores[p] += pts;

            hitStop(55);
            hitSound('hit', combos[p]);
            hud.pop(c.x, c.y, `SMASH! +${pts}`, '#d97706');
            bursts.burst(c.x, c.y, 0.5, '#b45309', 16, 7);
            break;
          }
        }
      }

      // Rebuild tower when cleared
      if (activeCratesInTower === 0) {
        hud.pop(zoneX(n, p), 0, 'TOWER CLEARED! +100', '#22c55e');
        scores[p] += Math.round(100 * hard);
        sfx('powerUp', { vol: 0.7 });
        spawnTower(p);
      }
    }

    scoreHud(hud, n, scores);
    checkBest(scores[0]);
    for (let p = 0; p < n; p++) {
      hud.p('h', p, combos[p] > 1 ? comboText(combos[p]) : 'Swipe crates hard to smash');
    }
  };
}
