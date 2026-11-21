// Forge — hold the squat, then strike when the blade glows.
// Deep squats heat the blade on the anvil; explosive drive upward strikes at peak glow.
import { players, isLow, sim } from '../pose.ts';
import { hardness } from '../meta.ts';
import { backdrop, fitted, glowLook, lit, node, shapes, tint } from '../engine.ts';
import { bestLine, bursts as makeBursts, figure, hitSound, hitStop, round, scoreHud, sfx, type Game } from '../kit.ts';

export default async function forge({ stage, best, onEnd, hud, scene }: Game) {
  const hard = hardness(stage);
  backdrop(scene, 'smithy');

  const bursts = makeBursts(scene.root);
  const playerFig = figure(scene, 0, { x: 0, y: -1.0, scale: 1.15 });

  // Anvil and blade
  let anvilModel: any = null;
  try {
    anvilModel = await fitted('/assets/camp/workbench-anvil.glb', 2.8, true);
  } catch {
    anvilModel = node(scene.root, shapes.box(2.2, 1.2, 1.2), lit('#3f3f46'));
  }
  const anvil = node(scene.root);
  anvil.addChild(anvilModel);
  anvil.setLocalPosition(0, -3.2, 0.4);

  // Sword blade on anvil
  const blade = node(scene.root, shapes.box(0.35, 2.2, 0.12), lit('#71717a', { emissive: '#ea580c', glow: 0.1 }), [0, -1.8, 0.6]);
  blade.setLocalEulerAngles(0, 0, 75);

  // Sparks and heating aura
  const aura = node(scene.root, shapes.circle(1.8, 24), glowLook('#f97316', 0.2), [0, -1.8, 0.5]);

  let heat = 0; // 0..100
  let isSquatting = false;
  let wasLow = false;
  let score = 0;
  let combo = 0;

  const checkBest = bestLine(hud, best);
  const finish = () => onEnd([Math.round(score)]);
  const tick = round(hud, 60, finish);

  return (dt: number) => {
    const t = tick(dt);
    if (t === null) return;

    bursts.update(dt);
    playerFig.update();

    const pl = players[0];
    const low = sim ? pl.hands[0].y < -0.3 : isLow(pl);
    const driveUp = pl.liftV > 1.4;

    if (low) {
      // Heating blade
      isSquatting = true;
      heat = Math.min(100, heat + dt * 42 * hard);
      aura.setLocalScale(1 + heat / 50, 1 + heat / 50, 1);
      sfx('tick', { vol: 0.25, rate: 1 + heat / 70 });
      hud.p('h', 0, heat >= 85 ? 'STRIKE NOW!' : `Heating... ${Math.round(heat)}%`);
    } else {
      // Standing up or struck
      if (isSquatting && (driveUp || !wasLow)) {
        // Strike executed!
        isSquatting = false;
        if (heat >= 75) {
          // Perfect or Great strike!
          combo++;
          const perfect = heat >= 88 && heat <= 98;
          const pts = Math.round((perfect ? 120 : 70) * hard * (1 + combo * 0.1));
          score += pts;

          hitStop(80);
          hitSound('hit', combo);
          sfx('powerUp', { vol: 0.8 });
          hud.pop(0, -1.5, perfect ? 'PERFECT FORGE!' : 'GREAT STRIKE!', perfect ? '#fbbf24' : '#f97316');
          bursts.burst(0, -1.8, 0.7, '#fbbf24', 24, 7);
          hud.flash('#f59e0b');
        } else if (heat > 25) {
          // Too cold
          combo = 0;
          const pts = Math.round(20 * hard);
          score += pts;
          sfx('zapTwoTone', { vol: 0.5 });
          hud.pop(0, -1.5, 'Too Cold', '#94a3b8');
        }
        heat = 0;
      } else {
        heat = Math.max(0, heat - dt * 25);
        hud.p('h', 0, 'Squat to heat the blade!');
      }
    }
    wasLow = low;

    // Visual temperature coloring
    if (heat > 85) {
      tint(blade, '#ffffff'); // White-hot
    } else if (heat > 50) {
      tint(blade, '#fef08a'); // Bright yellow
    } else if (heat > 20) {
      tint(blade, '#f97316'); // Orange
    } else {
      tint(blade, '#71717a'); // Cold steel
    }

    scoreHud(hud, 1, [score]);
    checkBest(score);
  };
}
