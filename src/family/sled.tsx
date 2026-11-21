import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { feed, perf, players, track } from '../pose.ts';
import { Shell } from '../stage.tsx';
import { complete, playerName, Role, type FamilyProps } from './shell.tsx';

const W = 960, H = 480, laneX = [268, 480, 692], sledY = 405;
const lanes = ['Left', 'Middle', 'Right'];
const routes = [
  [1, 0, 1, 2, 2, 1, 0, 2], [1, 2, 0, 1, 2, 1, 1, 0],
  [2, 1, 0, 2, 1, 2, 0, 1], [0, 2, 1, 0, 1, 2, 1, 0],
  [1, 0, 2, 0, 1, 2, 0, 2], [1, 2, 1, 2, 0, 1, 2, 0],
];
type Race = { time: number; lane: number; next: number; deliveries: number; x: number; lastHit: number; fps: number };
const newLeg = (): Race => ({ time: 0, lane: 1, next: 0, deliveries: 0, x: laneX[1], lastHit: -10, fps: 0 });

function draw(ctx: CanvasRenderingContext2D, race: Race, route: number[], interval: number) {
  ctx.clearRect(0, 0, W, H);
  for (let i = race.next; i < route.length; i++) {
    const arrival = 2.7 + i * interval;
    const y = sledY - (arrival - race.time) * 153;
    if (y < -35) break;
    const safe = route[i];
    for (let lane = 0; lane < 3; lane++) {
      if (lane !== safe && lane !== (safe + 1 + (i % 2)) % 3) continue;
      const x = laneX[lane];
      if (lane === safe) {
        ctx.fillStyle = '#2c806c';
        ctx.beginPath(); ctx.roundRect(x - 19, y - 21, 38, 33, 7); ctx.fill();
        ctx.strokeStyle = '#ffe26e'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(x - 12, y - 6); ctx.lineTo(x + 12, y - 6); ctx.moveTo(x, y - 15); ctx.lineTo(x, y + 6); ctx.stroke();
      } else {
        ctx.fillStyle = '#56698a';
        ctx.beginPath(); ctx.moveTo(x - 33, y + 14); ctx.lineTo(x - 16, y - 14); ctx.lineTo(x + 11, y - 23); ctx.lineTo(x + 34, y + 14); ctx.closePath(); ctx.fill();
      }
    }
  }
  const x = race.x, color = race.time - race.lastHit < 0.27 ? '#ffc170' : '#a92165';
  ctx.strokeStyle = '#233658'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 36, sledY - 16); ctx.lineTo(x - 36, sledY + 22);
  ctx.moveTo(x + 36, sledY - 16); ctx.lineTo(x + 36, sledY + 22); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(x - 29, sledY - 22, 58, 45, 11); ctx.fill();
  ctx.fillStyle = '#fff3ba';
  ctx.beginPath(); ctx.arc(x, sledY - 5, 11, 0, Math.PI * 2); ctx.fill();
}

export default function Sled(game: FamilyProps) {
  const { paused } = useContext(Shell);
  const [phase, setPhase] = useState<'ready' | 'race' | 'checkpoint' | 'done'>('ready');
  const [leg, setLeg] = useState(0), [scores, setScores] = useState<number[]>([]), [showStats, setShowStats] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [marker, setMarker] = useState<number | null>(null);
  const [cameraOverride, setCameraOverride] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null), race = useRef(newLeg()), manualLane = useRef<number | null>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const meter = useRef<HTMLSpanElement>(null), ahead = useRef<HTMLSpanElement>(null), diag = useRef<HTMLSpanElement>(null);
  const driver = game.n === 2 ? leg : 0;
  const interval = 1.35 - (game.stage - 1) * 0.065;
  const route = useMemo(() => routes[(game.stage - 1 + leg) % routes.length], [game.stage, leg]);
  const setLane = (lane: number) => { manualLane.current = lane; setCameraOverride(true); };
  const begin = (next: number) => {
    race.current = newLeg(); manualLane.current = null;
    setCameraOverride(false); setMarker(null); setLeg(next); setPhase('race');
  };
  useEffect(() => {
    const video = preview.current;
    if (!showCamera || !video) return;
    video.srcObject = feed.video?.srcObject ?? null;
    return () => { video.srcObject = null; };
  }, [showCamera]);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx || paused) return;
    draw(ctx, race.current, route, interval);
    if (phase !== 'race') return;
    let frame = 0, last = 0, nextHud = 0;
    const keydown = (event: KeyboardEvent) => {
      const delta = event.code === 'ArrowLeft' || event.code === 'KeyA' ? -1 : event.code === 'ArrowRight' || event.code === 'KeyD' ? 1 : 0;
      if (!delta || event.ctrlKey || event.metaKey || event.altKey) return;
      event.preventDefault();
      if (!event.repeat) setLane(Math.max(0, Math.min(2, (manualLane.current ?? race.current.lane) + delta)));
    };
    const tick = (time: number) => {
      const state = race.current, rawDt = last ? (time - last) / 1000 : 0;
      last = time;
      const dt = Math.min(0.05, rawDt);
      state.time += dt;
      if (rawDt > 0) state.fps += (1 / rawDt - state.fps) * 0.08;
      const player = players[driver];
      if (manualLane.current !== null) state.lane = manualLane.current;
      else if (game.camera && player.present) {
        state.lane = player.steer < -0.35 ? 0 : player.steer > 0.35 ? 2 : 1;
      }
      state.x += (laneX[state.lane] - state.x) * Math.min(1, dt * 23);
      if (state.next < route.length && state.time >= 2.7 + state.next * interval) {
        const safe = route[state.next];
        if (state.lane === safe) state.deliveries++;
        else if (state.lane === (safe + 1 + (state.next % 2)) % 3) state.lastHit = state.time;
        state.next++;
      }
      if (state.time >= nextHud) {
        nextHud = state.time + 0.15;
        if (meter.current) meter.current.textContent = state.deliveries + ' / ' + route.length + ' supplies';
        if (ahead.current) ahead.current.textContent = lanes[route[state.next]] ?? 'Cabin ahead';
        if (diag.current) diag.current.textContent = Math.round(state.fps) + ' render fps' + (game.camera ?
          ' · ' + Math.round(perf.fps) + ' pose fps · ' + Math.round(track.lag) + ' ms camera to pose' +
          (driver === 1 && track.partner ? ' · P2 ' + Math.round(track.fps2) + ' pose fps' : '') : '');
      }
      draw(ctx, state, route, interval);
      if (state.next === route.length && state.time >= 2.7 + (route.length - 1) * interval + 0.5) {
        setScores((previous) => [...previous, state.deliveries]);
        setPhase(leg === 0 ? 'checkpoint' : 'done');
      } else frame = requestAnimationFrame(tick);
    };
    addEventListener('keydown', keydown);
    frame = requestAnimationFrame(tick);
    return () => { removeEventListener('keydown', keydown); cancelAnimationFrame(frame); };
  }, [phase, route, leg, driver, game.camera, paused, interval]);

  const supplies = scores.reduce((a, b) => a + b, 0);
  return <>
    <div className="family-strip">
      <Role name={playerName(game, driver)}>Driver</Role>
      {game.n === 2 && <Role name={playerName(game, 1 - driver)}>Navigator</Role>}
      <span>Leg {leg + 1} / 2</span>
      <div className="family-actions">
        {game.camera && <button className="ghost" aria-pressed={showCamera} onClick={() => setShowCamera(!showCamera)}>Camera preview</button>}
        <button className="ghost" aria-pressed={showStats} onClick={() => setShowStats(!showStats)}>Latency stats</button>
      </div>
    </div>
    <div className="sled-layout">
      <div className="sled-course"><canvas ref={canvas} width={W} height={H} aria-label="Three lanes on the snowy sled track" />
        {phase !== 'race' && <div className="sled-cover">
          <h2>{phase === 'checkpoint' ? 'Checkpoint!' : phase === 'done' ? 'Both sleds are home!' : 'Ready to sled?'}</h2>
          <p>{phase === 'checkpoint' ? scores[0] + ' supplies delivered. ' + (game.n === 2 ? 'Swap driver and navigator.' : 'Ready for the last leg?') :
            phase === 'done' ? supplies + ' of ' + (route.length * 2) + ' supplies delivered together.' : 'Aim for the green parcels and go around the rocks.'}</p>
          {phase === 'done' ?
            <button className="primary" onClick={() => complete(game, 0.56 + 0.44 * supplies / (route.length * 2), supplies + ' supplies delivered', 'Both legs finished')}>Finish relay</button> :
            <button className="primary" onClick={() => begin(phase === 'checkpoint' ? 1 : 0)}>{phase === 'checkpoint' ? 'Start second leg' : 'Start the race'}</button>}
        </div>}
      </div>
      <aside className="sled-guide">
        {showCamera && <video className="sled-camera" ref={preview} autoPlay muted playsInline aria-label="Live camera preview" />}
        <p><strong>Next parcel</strong><br /><span ref={ahead}>—</span></p>
        <p><strong>Deliveries</strong><br /><span ref={meter}>0 / {route.length} supplies</span></p>
        {game.n === 2 && <>
          <p>Navigator, call out the lane or mark it here.</p>
          <div className="family-actions">
            {lanes.map((lane, i) => <button key={lane} title={'Mark ' + lane + ' lane'} aria-label={'Mark ' + lane + ' lane'} aria-pressed={marker === i} disabled={phase !== 'race'} onClick={() => setMarker(marker === i ? null : i)}>{['←', '•', '→'][i]}</button>)}
          </div>
          {marker !== null && <p className="family-clue">{lanes[marker]} lane!</p>}
        </>}
      </aside>
    </div>
    <div className="family-actions">
      {lanes.map((lane, i) => <button key={lane} disabled={phase !== 'race'} onClick={() => setLane(i)}>{lane}</button>)}
      {game.camera && cameraOverride && <button onClick={() => { manualLane.current = null; setCameraOverride(false); }}>Use leaning again</button>}
      <span>{game.camera && !cameraOverride ? 'Lean gently left or right. You can also tap a lane.' : 'Tap a lane or steer with the arrow keys.'}</span>
    </div>
    {showStats && <p className="sled-diagnostics"><span ref={diag}>Start a leg to see live stats.</span> · TV delay is outside this reading.</p>}
  </>;
}
