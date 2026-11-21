// Beat — hit the moves on the beat.
// Arrow icons scroll toward the strike zone: jump, duck, lean, and hands up in time with the song.
import { players, isAir, isLow, sim } from '../pose.ts';
import { hardness } from '../meta.ts';
import { backdrop, glowLook, lit, node, shapes, tint } from '../engine.ts';
import { bestLine, bursts as makeBursts, comboText, figure, hitSound, hitStop, round, scoreHud, sfx, type Game } from '../kit.ts';

const MAX_ARROWS = 14;
type MoveType = 'up' | 'down' | 'left' | 'right' | 'hands';
type Arrow = { live: boolean; move: MoveType; x: number; y: number; obj: any };

export default async function beat({ stage, best, onEnd, hud, scene }: Game) {
  const hard = hardness(stage);
  backdrop(scene, 'dancestage');

  const bursts = makeBursts(scene.root);
  const playerFig = figure(scene, 0, { x: 0, y: -1.2, scale: 1.05 });

  // Strike line at y = 1.0
  const hitLine = node(scene.root, shapes.quad(6.5, 0.15), glowLook('#8b5cf6', 0.9), [0, 1.0, 0.2]);
  void hitLine;

  // Arrow pool
  const arrowMesh = shapes.cone(0.45, 0.9);
  const arrows: Arrow[] = Array.from({ length: MAX_ARROWS }, () => {
    const obj = node(scene.root, arrowMesh, lit('#a855f7'));
    obj.enabled = false;
    return { live: false, move: 'up', x: 0, y: -4.5, obj };
  });

  let score = 0;
  let combo = 0;
  let beatTimer = 0;

  const checkBest = bestLine(hud, best);
  const finish = () => onEnd([Math.round(score)]);
  const tick = round(hud, 60, finish);

  return (dt: number) => {
    const t = tick(dt);
    if (t === null) return;

    bursts.update(dt);
    playerFig.update();

    beatTimer += dt;
    if (beatTimer >= 1.0 / hard) {
      beatTimer = 0;
      const arrow = arrows.find((a) => !a.live);
      if (arrow) {
        const moves: MoveType[] = ['up', 'down', 'left', 'right', 'hands'];
        arrow.live = true;
        arrow.move = moves[Math.floor(Math.random() * moves.length)];
        arrow.x = (Math.random() - 0.5) * 4.2;
        arrow.y = -4.2;
        arrow.obj.enabled = true;
        arrow.obj.setLocalPosition(arrow.x, arrow.y, 0.3);

        const rot = arrow.move === 'up' ? 0 : arrow.move === 'down' ? 180 : arrow.move === 'left' ? 90 : -90;
        arrow.obj.setLocalEulerAngles(0, 0, rot);
        tint(arrow.obj, arrow.move === 'up' ? '#38bdf8' : arrow.move === 'down' ? '#f59e0b' : '#ec4899');
      }
    }

    const pl = players[0];

    // Update arrows
    for (const arrow of arrows) {
      if (!arrow.live) continue;
      arrow.y += dt * 4.8 * hard;
      arrow.obj.setLocalPosition(arrow.x, arrow.y, 0.3);

      const inZone = Math.abs(arrow.y - 1.0) < 0.65;
      let matched = false;

      if (inZone && pl.present) {
        if (sim) {
          matched = Math.random() < 0.3;
        } else {
          switch (arrow.move) {
            case 'up':
              matched = isAir(pl);
              break;
            case 'down':
              matched = isLow(pl);
              break;
            case 'left':
              matched = pl.steer < -0.4;
              break;
            case 'right':
              matched = pl.steer > 0.4;
              break;
            case 'hands':
              matched = pl.hands[0].y > 0.4 && pl.hands[1].y > 0.4;
              break;
          }
        }
      }

      if (matched) {
        arrow.live = false;
        arrow.obj.enabled = false;
        combo++;
        const perfect = Math.abs(arrow.y - 1.0) < 0.25;
        const pts = Math.round((perfect ? 60 : 35) * hard * (1 + combo * 0.12));
        score += pts;

        hitStop(40);
        hitSound('hit', combo);
        hud.pop(arrow.x, 1.2, perfect ? 'PERFECT!' : 'GOOD!', perfect ? '#fbbf24' : '#a855f7');
        bursts.burst(arrow.x, 1.0, 0.5, '#a855f7', 12, 5);
        continue;
      }

      if (arrow.y > 2.0) {
        // Missed arrow passed hit zone
        arrow.live = false;
        arrow.obj.enabled = false;
        combo = 0;
        sfx('zapTwoTone', { vol: 0.3 });
      }
    }

    scoreHud(hud, 1, [score]);
    checkBest(score);
    hud.p('h', 0, combo > 1 ? comboText(combo) : 'Jump · Duck · Lean · Hands to the beat');
  };
}
