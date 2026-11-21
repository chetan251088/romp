// Shape Up — match the shape before it lands.
// Outline shapes fall toward the baseline: match your silhouette to the target in time.
import { players, isLow, sim } from '../pose.ts';
import { hardness } from '../meta.ts';
import { backdrop, flat, glowLook, node, shapes, tint } from '../engine.ts';
import { bestLine, bursts as makeBursts, figure, hitSound, hitStop, round, scoreHud, sfx, type Game } from '../kit.ts';

type ShapeType = 'tpose' | 'star' | 'crouch' | 'leanL' | 'leanR';

export default async function shapeUp({ stage, best, onEnd, hud, scene }: Game) {
  const hard = hardness(stage);
  backdrop(scene, 'puzzle');

  const bursts = makeBursts(scene.root);
  const playerFig = figure(scene, 0, { x: 0, y: -1.2, scale: 1.1 });

  // Baseline target zone at y = -1.2
  const targetZone = node(scene.root, shapes.ring(1.8, 2.0, 36), glowLook('#6366f1', 0.6), [0, -1.2, 0.2]);
  void targetZone;

  // Falling shape visuals (compound primitives)
  const shapeGroup = node(scene.root, undefined, undefined, [0, 4.8, 0.3]);
  const mainQuad = node(shapeGroup, shapes.quad(2.2, 2.2), flat('#6366f1', { opacity: 0.85 }));
  const innerQuad = node(shapeGroup, shapes.quad(1.8, 1.8), flat('#1e1b4b'));
  void innerQuad;

  let currentShape: ShapeType = 'tpose';
  let shapeY = 4.8;
  let score = 0;
  let combo = 0;
  const shapesList: ShapeType[] = ['tpose', 'star', 'crouch', 'leanL', 'leanR'];

  const spawnNewShape = () => {
    currentShape = shapesList[Math.floor(Math.random() * shapesList.length)];
    shapeY = 4.8;
    shapeGroup.setLocalPosition(0, shapeY, 0.3);

    // Customize shape representation
    if (currentShape === 'tpose') {
      mainQuad.setLocalScale(2.8, 0.8, 1);
      tint(mainQuad, '#38bdf8');
    } else if (currentShape === 'star') {
      mainQuad.setLocalScale(2.2, 2.2, 1);
      tint(mainQuad, '#f59e0b');
    } else if (currentShape === 'crouch') {
      mainQuad.setLocalScale(1.4, 1.2, 1);
      tint(mainQuad, '#ec4899');
    } else if (currentShape === 'leanL' || currentShape === 'leanR') {
      mainQuad.setLocalScale(1.2, 2.4, 1);
      shapeGroup.setLocalEulerAngles(0, 0, currentShape === 'leanL' ? 30 : -30);
      tint(mainQuad, '#a855f7');
    }
  };

  spawnNewShape();

  const checkBest = bestLine(hud, best);
  const finish = () => onEnd([Math.round(score)]);
  const tick = round(hud, 60, finish);

  return (dt: number) => {
    const t = tick(dt);
    if (t === null) return;

    bursts.update(dt);
    playerFig.update();

    shapeY -= dt * 2.2 * hard;
    shapeGroup.setLocalPosition(0, shapeY, 0.3);

    const inZone = Math.abs(shapeY - (-1.2)) < 0.6;
    const pl = players[0];

    if (inZone && pl.present) {
      let matched = false;
      if (sim) {
        matched = Math.random() < 0.35;
      } else if (pl.rig.length === 33) {
        const rig = pl.rig;
        switch (currentShape) {
          case 'tpose':
            // Arms horizontal out wide
            matched = Math.abs(rig[15][0] - rig[16][0]) > 2.0 && Math.abs(rig[15][1] - rig[11][1]) < 0.3;
            break;
          case 'star':
            // Arms up and legs wide
            matched = rig[15][1] > 0.2 && rig[16][1] > 0.2 && Math.abs(rig[27][0] - rig[28][0]) > 1.0;
            break;
          case 'crouch':
            matched = isLow(pl);
            break;
          case 'leanL':
            matched = pl.steer < -0.4;
            break;
          case 'leanR':
            matched = pl.steer > 0.4;
            break;
        }
      }

      if (matched) {
        combo++;
        const pts = Math.round(100 * hard * (1 + combo * 0.15));
        score += pts;

        hitStop(60);
        hitSound('hit', combo);
        hud.pop(0, -0.6, `SHAPE MATCH! +${pts}`, '#38bdf8');
        bursts.burst(0, -1.2, 0.5, '#6366f1', 20, 6);
        spawnNewShape();
      }
    }

    if (shapeY < -2.4) {
      // Shape passed un-matched
      combo = 0;
      sfx('zapTwoTone', { vol: 0.4 });
      hud.pop(0, -1.5, 'MISSED', '#ef4444');
      spawnNewShape();
    }

    scoreHud(hud, 1, [score]);
    checkBest(score);
    hud.p('h', 0, `Match: ${currentShape.toUpperCase()}`);
  };
}
