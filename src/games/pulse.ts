// Pulse — hit the music. A neon tunnel, three original songs. Swing, clap, duck.
// Move to the rhythm to keep the beat alive and chain a high combo.
import { players, isLow, sim } from '../pose.ts';
import { hardness } from '../meta.ts';
import { backdrop, flat, glowLook, node, shapes, tint } from '../engine.ts';
import { bestLine, bursts as makeBursts, comboText, divider, figure, hitSound, hitStop, round, scoreHud, sfx, zoneHalf, zoneX, type Game } from '../kit.ts';

const BPM = 124;
const BEAT_INTERVAL = 60 / BPM;
const MAX_CUES = 16;

type CueKind = 'swingL' | 'swingR' | 'clap' | 'duck';
type Cue = { live: boolean; kind: CueKind; x: number; y: number; time: number; obj: any; p: number };

export default async function pulse({ n, stage, best, onEnd, hud, scene }: Game) {
  const hard = hardness(stage);
  const bg = backdrop(scene, 'neon');
  divider(scene, n);

  const bursts = makeBursts(scene.root);
  const runners = Array.from({ length: n }, (_, p) => figure(scene, p, { x: zoneX(n, p), y: -1.2, scale: 1.0 }));

  // Target hit zone markers at x = 0 in each player's zone
  const hitBars = Array.from({ length: n }, (_, p) => {
    const cx = zoneX(n, p);
    const line = node(scene.root, shapes.quad(0.08, 6.0), glowLook('#38bdf8', 0.8), [cx, 0, 0.2]);
    return { cx, line };
  });

  // Cue pool
  const cueMesh = shapes.circle(0.55, 18);
  const cues: Cue[] = Array.from({ length: MAX_CUES }, () => {
    const obj = node(scene.root, cueMesh, flat('#ec4899'));
    obj.enabled = false;
    return { live: false, kind: 'clap', x: 0, y: 0, time: 0, obj, p: 0 };
  });

  const scores = Array.from({ length: n }, () => 0);
  const combos = Array.from({ length: n }, () => 0);
  let beatTimer = 0;
  let songTime = 0;

  const checkBest = bestLine(hud, best);
  const finish = () => onEnd(scores.map(Math.round));
  const tick = round(hud, 75, finish);

  return (dt: number) => {
    const t = tick(dt);
    if (t === null) return;

    bursts.update(dt);
    runners.forEach((r) => r.update());

    songTime += dt;
    beatTimer += dt;
    bg.drive(songTime * 2.0);

    // Spawn rhythmic cues
    if (beatTimer >= BEAT_INTERVAL * 2) {
      beatTimer -= BEAT_INTERVAL * 2;
      const kinds: CueKind[] = ['swingL', 'swingR', 'clap', 'duck'];
      const chosenKind = kinds[Math.floor(Math.random() * kinds.length)];

      for (let p = 0; p < n; p++) {
        const cue = cues.find((c) => !c.live);
        if (cue) {
          cue.live = true;
          cue.kind = chosenKind;
          cue.p = p;
          cue.x = zoneX(n, p) + zoneHalf(n) * 0.9; // Spawns on right side
          cue.y = chosenKind === 'duck' ? -1.8 : chosenKind === 'clap' ? 0.2 : chosenKind === 'swingL' ? 1.5 : 1.5;
          cue.time = 0;
          cue.obj.enabled = true;
          cue.obj.setLocalPosition(cue.x, cue.y, 0.3);

          const col = chosenKind === 'duck' ? '#f59e0b' : chosenKind === 'clap' ? '#a855f7' : '#ec4899';
          tint(cue.obj, col);
        }
      }
    }

    // Move cues toward hit line and test player moves
    for (const cue of cues) {
      if (!cue.live) continue;
      cue.x -= dt * 6.5 * hard;
      cue.obj.setLocalPosition(cue.x, cue.y, 0.3);

      const targetX = hitBars[cue.p].cx;
      const dist = Math.abs(cue.x - targetX);
      const inWindow = dist < 0.85;

      const pl = players[cue.p];
      let hit = false;

      if (inWindow && pl.present) {
        if (sim) {
          hit = Math.random() < 0.35;
        } else {
          switch (cue.kind) {
            case 'swingL':
              hit = pl.hands[0].y > 0.4 || pl.hands[0].vy > 3.0;
              break;
            case 'swingR':
              hit = pl.hands[1].y > 0.4 || pl.hands[1].vy > 3.0;
              break;
            case 'clap':
              hit = Math.abs(pl.hands[0].x - pl.hands[1].x) < 0.45;
              break;
            case 'duck':
              hit = isLow(pl);
              break;
          }
        }
      }

      if (hit) {
        cue.live = false;
        cue.obj.enabled = false;
        combos[cue.p]++;
        const perfect = dist < 0.35;
        const pts = Math.round((perfect ? 50 : 30) * hard * (1 + combos[cue.p] * 0.1));
        scores[cue.p] += pts;

        hitSound('hit', combos[cue.p]);
        hitStop(45);
        hud.pop(cue.x, cue.y, perfect ? 'PERFECT!' : 'GOOD!', perfect ? '#fbbf24' : '#ec4899');
        bursts.burst(cue.x, cue.y, 0.5, '#ec4899', 12, 5);
        continue;
      }

      // Missed cue passed behind
      if (cue.x < targetX - 1.2) {
        cue.live = false;
        cue.obj.enabled = false;
        combos[cue.p] = 0;
        sfx('zapTwoTone', { vol: 0.35 });
      }
    }

    scoreHud(hud, n, scores);
    checkBest(scores[0]);
    for (let p = 0; p < n; p++) {
      hud.p('h', p, combos[p] > 1 ? comboText(combos[p]) : 'Swing · Clap · Duck on beat');
    }
  };
}
