import { useState } from 'react';
import { complete, DirectionPad, Feedback, playerName, Role, type FamilyProps } from './shell.tsx';
import { gridStep, MOON_BASE as BASE, MOON_MAPS, MOON_SIZE as SIZE } from './puzzles.ts';

export default function MoonBase(game: FamilyProps) {
  const map = MOON_MAPS[game.stage - 1];
  const [battery, setBattery] = useState(map.battery), [at, setAt] = useState(BASE);
  const [samples, setSamples] = useState<number[]>([]), [feedback, setFeedback] = useState('');
  const [trail, setTrail] = useState<number[]>([BASE]);
  const canCollect = map.samples.includes(at) && !samples.includes(at);
  const home = at === BASE && samples.length === map.samples.length;
  const pilot = game.n === 2 ? samples.length % 2 : 0;
  const move = (direction: number) => {
    const next = gridStep(at, direction, SIZE);
    if (next < 0 || map.craters.includes(next)) return setFeedback('Choose a route around the crater or map edge.');
    const cost = map.rough.includes(next) ? 2 : 1;
    if (cost > battery) return setFeedback('The rover needs ' + cost + ' units for that tile. Look for a shorter route or reset.');
    setBattery(battery - cost); setAt(next); setTrail([...trail, next]);
    setFeedback(next === BASE ? (samples.length === 2 ? 'The rover and both samples are home.' : 'You are back at base. There are samples still to collect.') :
      map.samples.includes(next) && !samples.includes(next) ? 'Sample found. Scientist, collect it!' : 'Used ' + cost + ' battery.');
  };
  return <div className="family-workbench">
    <div className="family-board-area">
      <div className="family-grid moon-grid" style={{ '--columns': SIZE } as React.CSSProperties} aria-label="Rover map">
        {Array.from({ length: SIZE ** 2 }, (_, i) => {
          const crater = map.craters.includes(i), rough = map.rough.includes(i), sample = map.samples.includes(i) && !samples.includes(i);
          const terrain = i === BASE ? 'Base' : crater ? 'Crater' : rough ? 'Rough ground' : 'Smooth ground';
          const icon = at === i ? '🚙' : i === BASE ? '🏠' : crater ? '🕳️' : sample ? '💎' : rough ? '⋮' : trail.includes(i) ? '·' : '';
          return <span key={i} className={(crater ? 'blocked' : rough ? 'rough' : '') + (at === i ? ' rover' : '')} title={terrain + (sample ? ', sample' : '')}
            aria-label={'Row ' + (Math.floor(i / SIZE) + 1) + ', column ' + (i % SIZE + 1) + ', ' + terrain + (sample ? ', sample' : '') + (at === i ? ', rover' : '')}>{icon}</span>;
        })}
      </div>
      <p>🏠 Base · 💎 Sample · 🕳️ Crater · ⋮ Rough ground</p>
    </div>
    <div className="family-controls">
      <h2>Bring two samples home</h2>
      <p className="family-clue">🔋 {battery} / {map.battery} <span> · </span> 💎 {samples.length} / 2</p>
      <Role name={playerName(game, pilot)}>Rover Pilot</Role>
      <DirectionPad onMove={move} disabled={!battery || home} />
      <p>A smooth tile costs 1 battery. Rough ground costs 2. Craters are blocked.</p>
      <Role name={playerName(game, game.n === 2 ? 1 - pilot : 0)}>Sample Scientist</Role>
      <div className="family-actions">
        <button disabled={!canCollect} onClick={() => { setSamples([...samples, at]); setFeedback(game.n === 2 ? 'Sample collected. Swap jobs!' : 'Sample collected.'); }}>Collect sample</button>
        <button onClick={() => { setAt(BASE); setBattery(map.battery); setSamples([]); setTrail([BASE]); setFeedback('Fresh battery, back at base.'); }}>Reset rover</button>
        {home && <button className="primary" onClick={() => complete(game, 1, 'Both lunar samples brought home', battery + ' battery left')}>Finish mission</button>}
      </div>
      <Feedback>{feedback}</Feedback>
    </div>
  </div>;
}
