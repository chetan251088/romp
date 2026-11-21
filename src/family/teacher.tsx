import { useRef, useState } from 'react';
import { Choice, complete, Feedback, playerName, Role, Speak, type FamilyProps } from './shell.tsx';
import { Sketch, type SketchHandle } from './sketch.tsx';
import { classroomClues } from './swedish.ts';

const subjects = [
  { name: 'Math', icon: '🔢' }, { name: 'Swedish', icon: '🇸🇪' },
  { name: 'Patterns', icon: '🧩' }, { name: 'Drawing', icon: '✏️' },
];
const words = [
  { hint: 'Choose the cat.', choices: ['🐶', '🐱', '🐇'], answer: 1 },
  { hint: 'Choose the dog.', choices: ['🐶', '🐱', '🐇'], answer: 0 },
  { hint: 'Where is the blue star?', choices: ['💛', '🟣', '🌟', '🔷', '⭐', '★'], answer: 5 },
  { hint: 'Choose two hearts.', choices: ['♥', '♥♥♥', '♥♥'], answer: 2 },
  { hint: 'Which animal can fly?', choices: ['🐿️', '🦉', '🐭'], answer: 1 },
  { hint: 'Choose a red flower.', choices: ['🌻', '🌷', '🌹'], answer: 2 },
].map((word, index) => ({ ...word, question: classroomClues[index] }));
const patterns = [
  { question: '🔵 🟡 🔵 🟡 🔵 …', hint: 'The colors switch back and forth.', choices: ['🔵', '🟣', '🟡'], answer: 2 },
  { question: '▲ ▲ ● ▲ ▲ ● ▲ …', hint: 'Find the group of three that repeats.', choices: ['▲', '●', '■'], answer: 0 },
  { question: '2, 4, 6, 8, …', hint: 'Add the same number each time.', choices: ['9', '10', '12'], answer: 1 },
  { question: '2, 4, 8, 16, …', hint: 'Double each number.', choices: ['20', '24', '32'], answer: 2 },
  { question: '1, 4, 9, 16, …', hint: '1×1, 2×2, 3×3, 4×4. What is next?', choices: ['25', '24', '20'], answer: 0 },
  { question: '1, 3, 6, 10, …', hint: 'Add 2, then 3, then 4. Then add one more than last time.', choices: ['13', '14', '15'], answer: 2 },
];
const drawings = ['Draw a house with a round window.', 'Draw an animal with a very long tail.', 'Draw a robot using three different shapes.', 'Draw a rocket with a repeating pattern.', 'Draw a map from school to an ice castle.', 'Draw a kind act someone did for you.'];
const cheers = ['Good use of a clue!', 'I saw you keep trying.', 'I liked how you explained it.'];

function math(index: number) {
  const a = index + 3, b = index + 2, multiply = index >= 3, correct = multiply ? a * b : a + b;
  const choices = [String(correct - 1), String(correct), String(correct + 2)];
  return {
    question: a + (multiply ? ' × ' : ' + ') + b + ' = ?', choices, answer: 1,
    hint: multiply ? 'Think of ' + a + ' groups of ' + b + '.' : 'Start with ' + a + ' and count up ' + b + ' more.',
  };
}

export default function Teacher(game: FamilyProps) {
  const [round, setRound] = useState(0), [subject, setSubject] = useState<number | null>(null);
  const [hint, setHint] = useState(false), [solved, setSolved] = useState(false), [encouragement, setEncouragement] = useState('');
  const [ink, setInk] = useState(false), [feedback, setFeedback] = useState('');
  const canvas = useRef<SketchHandle>(null);
  const teacher = game.n === 2 ? round : 0, student = game.n === 2 ? 1 - round : 0;
  const index = game.stage - 1 + round;
  const problem = subject === 0 ? math(index) : subject === 1 ? words[index] : patterns[index];
  return <>
    <div className="family-strip"><Role name={playerName(game, teacher)}>Teacher</Role><Role name={playerName(game, student)}>Student</Role><span>Class {round + 1} / 2</span></div>
    {subject === null && <>
      <h2>Teacher, choose an assignment</h2>
      <div className="family-choices">{subjects.map((item, i) => <Choice key={item.name} label={item.name} onClick={() => setSubject(i)}>{item.icon}</Choice>)}</div>
    </>}
    {subject !== null && <>
      <h2 lang={subject === 1 ? 'sv' : undefined}>{subject === 3 ? drawings[index] : problem.question}</h2>
      {subject === 3 ? <>
        <div className="family-small-sketch"><Sketch ref={canvas} onInk={setInk} /></div>
        {!solved && <div className="family-actions"><button onClick={() => canvas.current?.undo()}>Undo</button><button className="primary" disabled={!ink} onClick={() => setSolved(true)}>Show my drawing</button></div>}
      </> : <>
        <div className="family-actions">
          {subject === 1 && <Speak text={problem.question} />}
          {!solved && <button onClick={() => setHint(!hint)} aria-expanded={hint}>Ask for a hint</button>}
        </div>
        {hint && <p>{problem.hint}</p>}
        <div className="family-choices">{problem.choices.map((choice, i) =>
          <Choice key={choice} label={subject === 1 && index === 2 && i === 5 ? 'Blue star' : undefined} selected={solved && i === problem.answer} disabled={solved} onClick={() => {
            if (i === problem.answer) { setSolved(true); setFeedback('You worked it out!'); }
            else setFeedback('Try again. Your teacher can read the clue with you.');
          }}><span style={subject === 1 && index === 2 && i === 5 ? { color: '#49bdff' } : undefined}>{choice}</span></Choice>
        )}</div>
      </>}
      {solved && <>
        <h3>Teacher, give your student some encouragement</h3>
        <div className="family-actions">{cheers.map((cheer) => <button key={cheer} aria-pressed={encouragement === cheer} onClick={() => setEncouragement(cheer)}>{cheer}</button>)}</div>
        <button className="primary" disabled={!encouragement} onClick={() => {
          if (round === 1) return complete(game, 1, 'Taught and tried two assignments');
          setRound(1); setSubject(null); setHint(false); setSolved(false); setInk(false); setEncouragement(''); setFeedback('');
        }}>{round === 0 ? 'Swap teacher and student' : 'Finish class'}</button>
      </>}
    </>}
    <Feedback>{feedback}</Feedback>
  </>;
}
