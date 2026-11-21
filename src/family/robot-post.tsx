import { useContext, useEffect, useState } from 'react';
import { Shell } from '../stage.tsx';
import { complete, DirectionPad, Feedback, playerName, Role, type FamilyProps } from './shell.tsx';
import { GRID_MOVES, gridStep, ROBOT_ROUTES } from './puzzles.ts';
type Card = { move: number; times: number };
type Run = { moves: number[]; step: number; at: number };

export default function RobotPost(game: FamilyProps) {
  const { paused } = useContext(Shell);
  const [round, setRound] = useState(0), [program, setProgram] = useState<Card[]>([]);
  const [prediction, setPrediction] = useState<number | null>(null), [at, setAt] = useState<number | null>(null);
  const [run, setRun] = useState<Run | null>(null), [success, setSuccess] = useState(false), [feedback, setFeedback] = useState('');
  const route = ROBOT_ROUTES[(game.stage - 1 + round) % ROBOT_ROUTES.length];
  const edit = (cards: Card[]) => { setProgram(cards); setAt(null); setSuccess(false); setFeedback(''); };
  useEffect(() => {
    if (!run || paused) return;
    const timeout = window.setTimeout(() => {
      const next = gridStep(run.at, run.moves[run.step], route.size);
      if (next < 0 || route.walls.includes(next)) {
        setRun(null);
        setFeedback('The robot got stuck at step ' + (run.step + 1) + '. Change the route and try again.');
        return;
      }
      setAt(next);
      if (run.step + 1 < run.moves.length) {
        setRun({ ...run, at: next, step: run.step + 1 });
        return;
      }
      setRun(null);
      setSuccess(next === route.goal);
      setFeedback((next === route.goal ? 'Mail delivered!' : 'The robot stopped short of the mailbox.') +
        (prediction === next ? ' Your prediction matched.' : ' Compare the stop with your prediction.'));
    }, 240);
    return () => clearTimeout(timeout);
  }, [run, paused, route, prediction]);

  return <div className="family-workbench">
    <div className="family-board-area">
      <p>Select a square to predict where the robot will stop.</p>
      <div className="family-grid" style={{ '--columns': route.size } as React.CSSProperties} aria-label="Robot map">
        {Array.from({ length: route.size ** 2 }, (_, i) => {
          const blocked = route.walls.includes(i);
          const symbol = i === (at ?? route.start) ? '🤖' : i === route.goal ? '📬' : blocked ? '🪨' : '';
          return <button key={i} className={blocked ? 'blocked' : ''} aria-pressed={prediction === i} disabled={blocked || !!run}
            aria-label={'Row ' + (Math.floor(i / route.size) + 1) + ', column ' + (i % route.size + 1) + (i === route.goal ? ', mailbox' : blocked ? ', rock' : i === route.start ? ', start' : '')}
            onClick={() => setPrediction(i)}>{symbol}</button>;
        })}
      </div>
    </div>
    <div className="family-controls">
      <div className="family-strip"><Role name={playerName(game, game.n === 2 ? round : 0)}>Programmer</Role><span>Delivery {round + 1} / 2</span></div>
      <p>Tap an arrow to add a command.</p>
      <DirectionPad onMove={(move) => edit([...program, { move, times: 1 }])} disabled={!!run || program.length >= 12} />
      <div className="program-cards" aria-label="Program">
        {program.length ? program.map((card, i) => <span className={run?.step === program.slice(0, i).reduce((sum, c) => sum + c.times, 0) ? 'active' : ''} key={i}>{GRID_MOVES[card.move].arrow}{card.times > 1 ? ' ×' + card.times : ''}</span>) : <span>Add your first arrow</span>}
      </div>
      <div className="family-actions">
        {[2, 3].map((count) => <button key={count} disabled={!!run || !program.length} onClick={() => edit([...program.slice(0, -1), { ...program[program.length - 1], times: count }])}>Repeat last ×{count}</button>)}
        <button disabled={!!run || !program.length} onClick={() => edit(program.slice(0, -1))}>Undo arrow</button>
        <button disabled={!!run || !program.length} onClick={() => edit([])}>Clear</button>
      </div>
      <Role name={playerName(game, game.n === 2 ? 1 - round : 0)}>Route Checker</Role>
      <div className="family-actions">
        <button className="primary" disabled={!program.length || prediction === null || !!run} onClick={() => {
          setAt(route.start); setSuccess(false); setFeedback('');
          setRun({ moves: program.flatMap((card) => Array<number>(card.times).fill(card.move)), at: route.start, step: 0 });
        }}>Run program</button>
        {success && <button className="primary" onClick={() => {
          if (round === 1) return complete(game, 1, 'Two letters delivered', 'Wrote and tested two programs');
          setRound(1); setPrediction(null); edit([]);
        }}>{round === 0 ? 'Swap jobs for the next letter' : 'Finish deliveries'}</button>}
      </div>
      <Feedback>{feedback}</Feedback>
    </div>
  </div>;
}
