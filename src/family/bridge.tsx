import { useState } from 'react';
import { complete, Feedback, playerName, Role, type FamilyProps } from './shell.tsx';
import { beamCapacity, BRIDGE_BLUEPRINTS } from './puzzles.ts';

export default function Bridge(game: FamilyProps) {
  const [round, setRound] = useState(0), [beams, setBeams] = useState<number[]>([]), [piers, setPiers] = useState<number[]>([]);
  const [prediction, setPrediction] = useState<boolean | null>(null);
  const [test, setTest] = useState<{ pass: boolean; message: string; attempt: number } | null>(null);
  const puzzle = BRIDGE_BLUEPRINTS[(game.stage - 1 + round) % BRIDGE_BLUEPRINTS.length];
  const length = beams.reduce((a, b) => a + b, 0);
  const joints = beams.slice(0, -1).map((_, i) => beams.slice(0, i + 1).reduce((a, b) => a + b, 0));
  const edit = (pieces: number[]) => { setBeams(pieces); setPiers([]); setTest(null); setPrediction(null); };
  const run = () => {
    const wrongLength = length !== puzzle.span;
    const unsupported = joints.some((joint) => !piers.includes(joint));
    const weakBeam = beams.some((beam) => beamCapacity(beam) < puzzle.load);
    const pass = !wrongLength && !unsupported && !weakBeam;
    const finding = wrongLength ? 'The beams need to reach exactly across the river.' :
      unsupported ? 'A joint needs a pier underneath it.' :
      weakBeam ? 'A beam was too long for that load. Try shorter beams.' : 'The sled made it across!';
    setTest({ pass, message: finding + (prediction === pass ? ' Your prediction matched the test.' : ' That was different from your prediction.'), attempt: (test?.attempt ?? 0) + 1 });
  };
  const next = () => {
    if (round === 1) return complete(game, 1, 'Two bridges crossed', 'Built, predicted, and tested together');
    setRound(1); edit([]);
  };
  return <>
    <div className="family-strip"><Role name={playerName(game, game.n === 2 ? round : 0)}>Beam Builder</Role><span>Bridge {round + 1} / 2</span></div>
    <h2>Span {puzzle.span} tiles and carry {puzzle.load} supply crates</h2>
    <div className="bridge-scene" style={{ '--tiles': puzzle.span } as React.CSSProperties}>
      <div className="bridge-water" aria-hidden="true" />
      <div className="bridge-spans" aria-label={length + ' of ' + puzzle.span + ' bridge tiles covered'}>
        {beams.map((beam, i) => <span key={i} style={{ flex: beam }}>{beam}</span>)}
        {length < puzzle.span && <span className="bridge-gap" style={{ flex: puzzle.span - length }} />}
      </div>
      {piers.map((pier) => <span className="bridge-support" key={pier} style={{ left: (pier / puzzle.span) * 100 + '%' }} />)}
      {test && <span key={test.attempt} aria-hidden="true" className={'bridge-sled ' + (test.pass ? 'cross' : 'dip')}>🛷</span>}
    </div>
    <div className="family-actions" aria-label="Add a beam">
      {puzzle.beams.map((beam) => <button key={beam} disabled={length + beam > puzzle.span || beams.length > puzzle.piers} onClick={() => edit([...beams, beam])}>+ {beam}-tile beam</button>)}
      <button disabled={!beams.length} onClick={() => edit(beams.slice(0, -1))}>Undo beam</button>
    </div>
    <p>{length} / {puzzle.span} tiles · A beam can carry 8 minus the number of tiles it spans.</p>
    <Role name={playerName(game, game.n === 2 ? 1 - round : 0)}>Support Engineer</Role>
    <div className="family-actions">
      {joints.map((joint) => <button key={joint} aria-pressed={piers.includes(joint)} disabled={!piers.includes(joint) && piers.length === puzzle.piers} onClick={() => {
        setPiers(piers.includes(joint) ? piers.filter((p) => p !== joint) : [...piers, joint]); setTest(null);
      }}>Pier at tile {joint}</button>)}
      {!joints.length && <span>Add two beams to make a joint.</span>}
    </div>
    <div className="family-actions" aria-label="Predict what happens">
      <button aria-pressed={prediction === true} onClick={() => setPrediction(true)}>It will hold</button>
      <button aria-pressed={prediction === false} onClick={() => setPrediction(false)}>It needs work</button>
      <button className="primary" disabled={!beams.length || prediction === null} onClick={run}>Test the bridge</button>
      {test?.pass && <button className="primary" onClick={next}>{round === 0 ? 'Swap jobs' : 'Finish building'}</button>}
    </div>
    <Feedback>{test?.message}</Feedback>
  </>;
}
