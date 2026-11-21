// Jab — punch the pads, squat under the bar.
// Target pads appear at striking range; sweep bars force fast ducking.
import { players, isLow, sim } from '../pose.ts';
import { hardness } from '../meta.ts';
import { backdrop, glowLook, lit, node, shapes, tint } from '../engine.ts';
import { bestLine, bursts as makeBursts, comboText, hands as makeHands, hitSound, hitStop, round, scoreHud, sfx, type Game } from '../kit.ts';

const MAX_PADS = 6;

type PadTarget = {
  live: boolean;
  x: number;
  y: number;
  time: number;
  obj: any;
};

export default async function jab({ stage, best, onEnd, hud, scene }: Game) {
  const hard = hardness(stage);
  backdrop(scene, 'gym');

  const bursts = makeBursts(scene.root);
  const handTracker = makeHands(scene, 1, undefined, 7, ['#ef4444', '#3b82f6']);

  // Pad pool
  const padMesh = shapes.circle(0.7, 20);
  const padLook = lit('#ef4444', { emissive: '#dc2626', glow: 0.4 });
  const pads: PadTarget[] = Array.from({ length: MAX_PADS }, () => {
    const obj = node(scene.root, padMesh, padLook);
    obj.enabled = false;
    return { live: false, x: 0, y: 0, time: 0, obj };
  });

  // Sweeping bar obstacle
  const barMesh = shapes.box(7.5, 0.45, 0.45);
  const barLook = glowLook('#f59e0b', 0.9);
  const sweepBar = node(scene.root, barMesh, barLook, [0, -0.6, 0.3]);
  sweepBar.enabled = false;

  let score = 0;
  let combo = 0;
  let spawnTimer = 0;
  let barTimer = 4.5;
  let barActive = false;
  let barX = -8;

  const checkBest = bestLine(hud, best);
  const finish = () => onEnd([Math.round(score)]);
  const tick = round(hud, 60, finish);

  return (dt: number) => {
    const t = tick(dt);
    if (t === null) return;

    bursts.update(dt);
    const hStates = handTracker.update(dt);

    // Spawn pads
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = 1.0 / hard + Math.random() * 0.4;
      const pad = pads.find((p) => !p.live);
      if (pad) {
        pad.live = true;
        pad.x = (Math.random() - 0.5) * 5.5;
        pad.y = -0.5 + (Math.random() - 0.5) * 2.8;
        pad.time = 1.8 / hard; // Window to hit
        pad.obj.enabled = true;
        pad.obj.setLocalPosition(pad.x, pad.y, 0.3);
        tint(pad.obj, Math.random() < 0.5 ? '#ef4444' : '#3b82f6');
      }
    }

    // Update pads & check punches
    for (const pad of pads) {
      if (!pad.live) continue;
      pad.time -= dt;

      // Punch test
      for (const h of hStates) {
        if (!h.on) continue;
        const dist = Math.hypot(h.x - pad.x, h.y - pad.y);
        const fastPunch = h.speed > 5.0 || sim;

        if (dist < 0.85 && fastPunch) {
          pad.live = false;
          pad.obj.enabled = false;
          combo++;
          const pts = Math.round(40 * hard * (1 + combo * 0.1));
          score += pts;

          hitStop(50);
          hitSound('hit', combo);
          hud.pop(pad.x, pad.y, `HIT! +${pts}`, '#facc15');
          bursts.burst(pad.x, pad.y, 0.5, '#ef4444', 14, 6);
          break;
        }
      }

      if (pad.time <= 0 && pad.live) {
        pad.live = false;
        pad.obj.enabled = false;
        combo = 0;
      }
    }

    // Bar sweep mechanic
    barTimer -= dt;
    if (barTimer <= 0 && !barActive) {
      barActive = true;
      barX = -8;
      sweepBar.enabled = true;
      hud.banner('DUCK!', 800);
      sfx('whoosh', { vol: 0.8 });
    }

    if (barActive) {
      barX += dt * 14 * hard;
      sweepBar.setLocalPosition(barX, -0.6, 0.3);

      const pl = players[0];
      const ducking = sim ? pl.hands[0].y < -0.3 : isLow(pl);

      // Hit test when bar sweeps through center
      if (Math.abs(barX) < 1.5 && !ducking) {
        // Hit by bar!
        hitStop(100);
        sfx('zapTwoTone', { vol: 0.7 });
        hud.flash('#ef4444');
        hud.pop(0, -0.6, 'DUCK MISSED! -50', '#ef4444');
        score = Math.max(0, score - 50);
        combo = 0;
      }

      if (barX > 8) {
        barActive = false;
        sweepBar.enabled = false;
        barTimer = 5.0 / hard + Math.random() * 2.0;
      }
    }

    scoreHud(hud, 1, [score]);
    checkBest(score);
    hud.p('h', 0, combo > 1 ? comboText(combo) : 'Punch the pads · Squat the bar');
  };
}
