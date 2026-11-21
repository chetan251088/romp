import { useState } from 'react';
import { complete, Feedback, playerName, Role, type FamilyProps } from './shell.tsx';

const experiments = [
  { question: 'Which ball rolls farther?', same: 'Same ball and ramp height.', change: 'Surface', variants: ['Smooth tile', 'Thick rug'], distance: [84, 44], finding: 'The rough rug slows the ball more than the smooth tile.', scene: 'roll' },
  { question: 'Which ball rolls farther?', same: 'Same ball and floor surface.', change: 'Ramp height', variants: ['Low ramp', 'High ramp'], distance: [48, 83], finding: 'The ball starts higher on the steep ramp and gets more energy as it rolls down.', scene: 'roll' },
  { question: 'Which platform lifts a crate farther?', same: 'Same handle, crate and number of turns.', change: 'Winch drum', variants: ['Large drum', 'Small drum'], distance: [83, 44], finding: 'A larger drum winds up more rope in one turn. It also takes more turning force to lift the same crate.', scene: 'lift' },
  { question: 'Which output gear spins farther?', same: 'Same small input gear and one turn of the handle.', change: 'Output gear', variants: ['12 teeth', '24 teeth'], distance: [80, 40], finding: 'The gear with twice the teeth turns through half the angle.', scene: 'gear' },
  { question: 'Which sled glides farther?', same: 'Same sled and starting speed.', change: 'Surface', variants: ['Packed snow', 'Loose snow'], distance: [86, 51], finding: 'In this model, loose snow pushes back more, so the sled stops sooner.', scene: 'roll' },
];

export default function Lab(game: FamilyProps) {
  const [round, setRound] = useState(0), [prediction, setPrediction] = useState<number | null>(null), [trial, setTrial] = useState(0);
  const experiment = experiments[(game.stage - 1 + round) % experiments.length];
  const winner = experiment.distance[0] > experiment.distance[1] ? 0 : 1;
  return <>
    <div className="family-strip"><Role name={playerName(game, game.n === 2 ? round : 0)}>Predictor</Role><span>Experiment {round + 1} / 2</span></div>
    <h2>{experiment.question}</h2>
    <p>{experiment.same} Only the {experiment.change.toLowerCase()} changes.</p>
    <div className="lab-samples">
      {experiment.variants.map((variant, i) => <div className="lab-sample" key={variant}>
        <button aria-pressed={prediction === i} onClick={() => { setPrediction(i); setTrial(0); }}>{variant}</button>
        <div className={'lab-track ' + experiment.scene} aria-hidden="true">
          <span key={trial} className={trial ? 'tested' : ''} style={{ '--travel': experiment.distance[i] + '%', '--angle': (experiment.distance[i] / 80 * 360) + 'deg' } as React.CSSProperties}>
            {experiment.scene === 'gear' ? '⚙' : experiment.scene === 'lift' ? '📦' : experiment.change === 'Surface' && round + game.stage >= 5 ? '🛷' : '●'}
          </span>
        </div>
        <span>{trial ? experiment.distance[i] + ' ' + (experiment.scene === 'gear' ? 'rotation points' : 'distance units') : 'Ready to test'}</span>
      </div>)}
    </div>
    <Role name={playerName(game, game.n === 2 ? 1 - round : 0)}>Experimenter</Role>
    <div className="family-actions">
      <button className="primary" onClick={() => setTrial(trial + 1)} disabled={prediction === null}>{trial ? 'Run again' : 'Run both tests'}</button>
      {trial > 0 && <button onClick={() => {
        if (round === 1) return complete(game, 1, 'Two experiments completed', 'Changed one variable at a time');
        setRound(1); setPrediction(null); setTrial(0);
      }}>{round === 0 ? 'Swap jobs and test something new' : 'Finish lab'}</button>}
    </div>
    <Feedback>{trial > 0 && (prediction === winner ? 'Your prediction matched. ' : 'The result surprised us. ') + 'In this virtual test, ' + experiment.variants[winner].toLowerCase() + ' went farther. ' + experiment.finding}</Feedback>
  </>;
}
