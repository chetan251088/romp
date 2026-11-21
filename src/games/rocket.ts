// Rocket — every squat is an engine burn.
// Squats power your thrusters to blast through the asteroid belt; steer with your body to avoid debris.
import { players, isLow, sim } from '../pose.ts';
import { hardness } from '../meta.ts';
import { backdrop, glowLook, lit, node, shapes } from '../engine.ts';
import { H, W, bestLine, bursts as makeBursts, figure, hitStop, round, scoreHud, sfx, type Game } from '../kit.ts';

const MAX_ROCKS = 14;

type Rock = {
  live: boolean;
  x: number;
  y: number;
  vy: number;
  radius: number;
  obj: any;
};

export default async function rocket({ stage, best, onEnd, hud, scene }: Game) {
  const hard = hardness(stage);
  const bg = backdrop(scene, 'launchpad');

  const bursts = makeBursts(scene.root);
  const playerFig = figure(scene, 0, { x: 0, y: -2.2, scale: 0.9 });

  // Rocket entity
  const rocketGroup = node(scene.root, undefined, undefined, [0, -1.8, 0.5]);
  const rocketBody = node(rocketGroup, shapes.cone(0.65, 1.8), lit('#ef4444', { emissive: '#dc2626', glow: 0.3 }));
  rocketBody.setLocalEulerAngles(180, 0, 0);
  const finL = node(rocketGroup, shapes.box(0.12, 0.6, 0.5), lit('#ffffff'), [-0.7, -0.6, 0]);
  const finR = node(rocketGroup, shapes.box(0.12, 0.6, 0.5), lit('#ffffff'), [0.7, -0.6, 0]);
  void finL; void finR;
  const flame = node(rocketGroup, shapes.cone(0.4, 1.2), glowLook('#f97316', 1.2), [0, -1.2, 0]);

  // Asteroid pool
  const rockMesh = shapes.facets(0.7, 1);
  const rockLook = lit('#64748b', { emissive: '#334155', glow: 0.1 });
  const rocks: Rock[] = Array.from({ length: MAX_ROCKS }, () => {
    const obj = node(scene.root, rockMesh, rockLook);
    obj.enabled = false;
    return { live: false, x: 0, y: 0, vy: -3, radius: 0.7, obj };
  });

  let altitude = 0;
  let speed = 2; // base scroll speed
  let rocketX = 0;
  let spawnTimer = 0;
  let thrustTimer = 0;

  const checkBest = bestLine(hud, best);
  const finish = () => onEnd([Math.round(altitude)]);
  const tick = round(hud, 60, finish);

  return (dt: number) => {
    const t = tick(dt);
    if (t === null) return;

    bursts.update(dt);
    playerFig.update();

    const pl = players[0];
    const squatting = sim ? pl.hands[0].y < -0.3 : isLow(pl);

    // Steer left/right
    const steer = sim ? pl.lean : pl.steer;
    rocketX = Math.max(-W / 2 + 1.5, Math.min(W / 2 - 1.5, rocketX + steer * dt * 9));
    rocketGroup.setLocalPosition(rocketX, -1.8, 0.5);
    rocketGroup.setLocalEulerAngles(0, 0, -steer * 24);

    if (squatting) {
      // Thrust!
      speed = Math.min(18, speed + dt * 14 * hard);
      thrustTimer = 0.3;
      sfx('zapThreeToneUp', { vol: 0.4 });
      bursts.burst(rocketX, -2.8, 0.5, '#f59e0b', 6, 4);
    } else {
      speed = Math.max(3, speed - dt * 6);
    }

    thrustTimer -= dt;
    flame.enabled = thrustTimer > 0;
    if (flame.enabled) {
      const flScale = 0.8 + Math.random() * 0.5;
      flame.setLocalScale(flScale, flScale * (speed / 5), flScale);
    }

    altitude += speed * dt * 8;
    bg.drive(speed * 0.1);

    // Spawn asteroids
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawnTimer = 1.2 / hard + Math.random() * 0.5;
      const rock = rocks.find((r) => !r.live);
      if (rock) {
        rock.live = true;
        rock.x = (Math.random() - 0.5) * (W - 3);
        rock.y = H / 2 + 1.5;
        rock.radius = 0.5 + Math.random() * 0.4;
        rock.vy = -(speed * 0.9 + 2);
        rock.obj.enabled = true;
        rock.obj.setLocalPosition(rock.x, rock.y, 0.3);
        rock.obj.setLocalScale(rock.radius, rock.radius, rock.radius);
      }
    }

    // Update asteroids
    for (const rock of rocks) {
      if (!rock.live) continue;
      rock.y -= (speed + 2) * dt;
      rock.obj.setLocalPosition(rock.x, rock.y, 0.3);

      // Hit test with rocket
      const dist = Math.hypot(rock.x - rocketX, rock.y - (-1.8));
      if (dist < rock.radius + 0.6) {
        // Collision!
        hitStop(120);
        sfx('zapTwoTone', { vol: 0.8 });
        bursts.burst(rocketX, -1.8, 0.6, '#ef4444', 20, 8);
        hud.flash('#ef4444');
        hud.shake(0.8);
        altitude = Math.max(0, altitude - 150);
        speed = 2;
        rock.live = false;
        rock.obj.enabled = false;
        hud.pop(rocketX, -1.2, 'CRASH! -150m', '#ef4444');
        continue;
      }

      if (rock.y < -H / 2 - 2) {
        rock.live = false;
        rock.obj.enabled = false;
      }
    }

    scoreHud(hud, 1, [altitude]);
    checkBest(altitude);
    hud.p('h', 0, `${Math.round(altitude)}m · ${Math.round(speed * 12)} km/h · Squat to burn!`);
  };
}
