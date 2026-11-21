import { useRef, useState } from 'react';
import { Choice, complete, Feedback, Role, Speak, type FamilyProps } from './shell.tsx';
import { Sketch, type SketchHandle } from './sketch.tsx';
import { familyClues } from './swedish.ts';

const clues = [
  { choices: ['☀️', '🌙', '⭐'], labels: ['Sun', 'Moon', 'Star'], correct: 0 },
  { choices: ['☀️', '🌙', '⭐'], labels: ['Sun', 'Moon', 'Star'], correct: 1 },
  { choices: ['🐭', '🐿️', '🐇'], labels: ['Mouse', 'Squirrel', 'Rabbit'], correct: 2 },
  { choices: ['⛄', '🧤', '🪨'], labels: ['Snowman', 'Mitten', 'Rock'], correct: 0 },
  { choices: ['🧦', '🎩', '🧤'], labels: ['Sock', 'Hat', 'Mitten'], correct: 1 },
];
const doodles = ['A snowman on a skateboard', 'A fox on the moon', 'A robot eating pancakes', 'A castle made of ice cream', 'A penguin teaching math'];
const moves = ['A tree in a snowstorm', 'A sleepy space alien', 'A robot learning to dance', 'A penguin on invisible ice', 'A superhero looking for her gloves'];

export default function DadQuest(game: FamilyProps) {
  const [round, setRound] = useState(0), [ink, setInk] = useState(false), [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState(''), [encouragement, setEncouragement] = useState('');
  const canvas = useRef<SketchHandle>(null);
  const family = [game.names?.[0] ?? 'Daughter 1', 'Dad', game.names?.[1] ?? 'Daughter 2'];
  const captain = family[round], challenger = family[(round + 1) % 3], coach = family[(round + 2) % 3];
  const index = game.stage - 1, clue = clues[index];
  const next = () => {
    if (round === 2) return complete(game, 1, 'Everyone took a turn leading', 'Three family challenges completed');
    setRound(round + 1); setInk(false); setDone(false); setFeedback(''); setEncouragement('');
  };
  return <>
    <div className="family-strip"><Role name={captain}>Captain</Role><Role name={challenger}>Challenger</Role><Role name={coach}>Coach</Role><span>Challenge {round + 1} / 3</span></div>
    {round === 0 && <>
      <h2>Give {challenger} a Swedish clue</h2>
      <p className="family-clue" lang="sv">{familyClues[index]}</p>
      <Speak text={familyClues[index]} />
      <div className="family-choices">{clue.choices.map((icon, i) => <Choice key={icon} label={clue.labels[i]} disabled={done} selected={done && i === clue.correct} onClick={() => {
        if (i === clue.correct) { setDone(true); setFeedback('Snyggt! Nicely done.'); }
        else setFeedback('Coach, give one small hint and try again.');
      }}>{icon}</Choice>)}</div>
    </>}
    {round === 1 && <>
      <h2>Draw it together and see if {coach} can guess</h2>
      <details className="secret-prompt"><summary>Captain and challenger, peek at the prompt</summary><p>{doodles[index]}</p></details>
      <div className="family-small-sketch"><Sketch ref={canvas} onInk={setInk} /></div>
      <div className="family-actions"><button onClick={() => canvas.current?.undo()}>Undo</button><button className="primary" disabled={!ink || done} onClick={() => { setDone(true); setFeedback('Coach, share one detail you liked.'); }}>We made a drawing</button></div>
    </>}
    {round === 2 && <>
      <h2>Make a family freeze pose</h2>
      <div className="dad-pose" aria-hidden="true">🕺 🧍 💃</div>
      <p className="family-clue">{moves[index]}</p>
      <p>{captain}, demonstrate. {challenger}, copy it. {coach}, count to three and join in.</p>
      <button className="primary" disabled={done} onClick={() => { setDone(true); setFeedback('You did it together!'); }}>We held the pose</button>
    </>}
    {done && <>
      <h3>Coach, give the team a cheer</h3>
      <div className="family-actions">
        {['You made me laugh!', 'Thanks for helping!', 'I liked how you tried!'].map((cheer) => <button key={cheer} aria-pressed={encouragement === cheer} onClick={() => setEncouragement(cheer)}>{cheer}</button>)}
        <button className="primary" disabled={!encouragement} onClick={next}>{round === 2 ? 'Finish family quest' : 'Rotate roles'}</button>
      </div>
    </>}
    <Feedback>{feedback}</Feedback>
  </>;
}
