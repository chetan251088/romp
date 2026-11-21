import { useEffect, useState } from 'react';
import { Choice, complete, Feedback, playerName, Role, Speak, type FamilyProps } from './shell.tsx';
import { winterClues, winterRescues } from './swedish.ts';

const items = [
  { icon: '🧤', label: 'Mitten' }, { icon: '🧣', label: 'Scarf' },
  { icon: '🎩', label: 'Hat' }, { icon: '🗝️', label: 'Key' },
  { icon: '🔦', label: 'Flashlight' }, { icon: '🔔', label: 'Bell' },
];
const places = [
  { icon: '🌲', label: 'Fir tree' }, { icon: '🏠', label: 'Cabin' },
  { icon: '🌉', label: 'Bridge' },
];
const quests = [
  { animal: 'Fox', icon: '🦊', trouble: 'Fox is cold and shivering.', helpful: 'Offer a warm blanket', outcome: 'Fox snuggles into the blanket and warms up.' },
  { animal: 'Hare', icon: '🐇', trouble: 'Hare feels scared to cross the bridge alone.', helpful: 'Offer to cross together', outcome: 'Hare takes a small breath and crosses beside you.' },
  { animal: 'Owl', icon: '🦉', trouble: 'Owl feels left out of the winter party.', helpful: 'Ask Owl to come with you', outcome: 'Owl smiles and helps you hang the first lantern.' },
  { animal: 'Mouse', icon: '🐭', trouble: 'Mouse drops the scarf in a deep snowbank.', helpful: 'Ask the cabin keeper for help', outcome: 'The keeper brings a long rake. Asking for help works!' },
  { animal: 'Bear', icon: '🐻', trouble: 'Bear looks lonely but says she needs a little quiet.', helpful: 'Ask if she would like company later', outcome: 'Bear feels heard and invites you to come back after a rest.' },
  { animal: 'Squirrel', icon: '🐿️', trouble: 'Squirrel is sad because the party bell broke.', helpful: 'Listen and look for a way to fix it together', outcome: 'Squirrel feels better and you find a loose piece you can reattach.' },
];
const scarfColors = ['#fa729c', '#c8acff', '#71e5d2', '#ffd775', '#87d4ff'];
const colorNames = ['Rose', 'Lilac', 'Mint', 'Gold', 'Sky'];
const optionKey = 'romp.family.snow';
type ClueLevel = 'stage' | 'short' | 'long';
const defaultSisters = [
  { name: 'Flinga', coat: 4, clue: 'stage' as ClueLevel },
  { name: 'Stjärna', coat: 0, clue: 'stage' as ClueLevel },
];

function loadSisters() {
  try {
    const saved = JSON.parse(localStorage.getItem(optionKey) ?? 'null');
    if (Array.isArray(saved)) return defaultSisters.map((sister, i) => {
      const value = saved[i];
      return {
        name: typeof value?.name === 'string' ? value.name.slice(0, 18) : sister.name,
        coat: Number.isInteger(value?.coat) && scarfColors[value.coat] ? value.coat as number : sister.coat,
        clue: value?.clue === 'short' || value?.clue === 'long' ? value.clue as ClueLevel : sister.clue,
      };
    });
  } catch { /* Play with the default sisters when storage is unavailable. */ }
  return defaultSisters;
}

export default function SnowSisters(game: FamilyProps) {
  const [round, setRound] = useState(0);
  const [step, setStep] = useState(0);
  const [hint, setHint] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [scarf, setScarf] = useState<number | null>(null);
  const [sisters, setSisters] = useState(loadSisters);
  const [customize, setCustomize] = useState(false);
  const questIndex = (game.stage - 1 + round) % quests.length;
  const quest = quests[questIndex], { item: itemIndex, place } = winterRescues[questIndex], item = items[itemIndex];
  const role = game.n === 2 ? (round + Number(step === 1)) % 2 : 0;
  const clueLevel = sisters[role].clue;
  const clues = winterClues(questIndex, clueLevel === 'long' || (clueLevel === 'stage' && game.stage > 2));
  const clue = step === 0 ? clues.item : clues.trail;
  const choices = [itemIndex, (itemIndex + 2) % items.length, (itemIndex + 4) % items.length].sort((a, b) => a - b);
  const editSister = (index: number, changes: Partial<(typeof sisters)[number]>) =>
    setSisters(sisters.map((sister, i) => i === index ? { ...sister, ...changes } : sister));
  const advance = () => { setStep(step + 1); setHint(false); setFeedback(''); };
  const next = () => {
    if (round === 1) return complete(game, 1, 'Two winter rescues', 'Swedish clues solved together');
    setRound(1); setStep(0); setScarf(null); setFeedback('');
  };
  useEffect(() => { try { localStorage.setItem(optionKey, JSON.stringify(sisters)); } catch { /* Keeps the current round playable. */ } }, [sisters]);
  return <>
    <div className="family-strip">
      <Role name={playerName(game, role)}>{step === 0 ? 'Ice Builder' : step === 1 ? 'Trail Guide' : 'Help together'}</Role>
      <span>Rescue {round + 1} / 2</span>
      <button className="ghost" aria-expanded={customize} onClick={() => setCustomize(!customize)}>Customize sisters</button>
    </div>
    {customize && <div className="family-customize">
      {sisters.map((sister, i) => <div className="family-custom-player" key={i}>
        <label>Sister {i + 1}<input value={sister.name} maxLength={18} onChange={(e) => editSister(i, { name: e.currentTarget.value })} /></label>
        <label>Clues<select value={sister.clue} onChange={(e) => editSister(i, { clue: e.currentTarget.value as ClueLevel })}>
          <option value="stage">Match stage</option><option value="short">Short phrases</option><option value="long">Full sentences</option>
        </select></label>
        <div className="family-swatches" role="group" aria-label={'Coat colors for sister ' + (i + 1)}>
          {scarfColors.map((color, j) => <button key={color} title={colorNames[j]} aria-label={colorNames[j] + ' coat'} aria-pressed={sister.coat === j} style={{ background: color }} onClick={() => editSister(i, { coat: j })} />)}
        </div>
      </div>)}
    </div>}
    <div className="snow-scene">
      {sisters.map((sister, i) => <div key={i} className={'snow-sister sister-' + i + (role === i && step < 2 ? ' current' : '')} style={{ '--coat': scarfColors[sister.coat] } as React.CSSProperties}>
        <span className="snow-portrait" aria-hidden="true"><span className="snow-face" /><b>{i === 0 ? '✦' : '❄'}</b></span>
        <span className="snow-sister-name">{sister.name || 'Sister ' + (i + 1)}</span>
      </div>)}
      <span className="snow-animal" role="img" aria-label={quest.animal}>{quest.icon}{scarf !== null && <i style={{ background: scarfColors[scarf] }} />}</span>
    </div>
    {step < 2 && <>
      <h2>{step === 0 ? 'Find what ' + quest.animal + ' lost' : 'Follow the trail to ' + quest.animal}</h2>
      <p className="family-clue" lang="sv">{clue}</p>
      <div className="family-actions"><Speak key={clue} text={clue} /><button onClick={() => setHint(!hint)} aria-expanded={hint}>English hint</button></div>
      {hint && <p>{step === 0 ? 'Find a ' + item.label.toLowerCase() + '!' : quest.animal + ' is waiting by the ' + places[place].label.toLowerCase() + '.'}</p>}
      <div className="family-choices">
        {(step === 0 ? choices.map((i) => ({ i, ...items[i] })) : places.map((place, i) => ({ i, ...place }))).map((choice) =>
          <Choice key={choice.i} label={choice.label} onClick={() => choice.i === (step === 0 ? itemIndex : place) ? advance() : setFeedback('Try another picture, or listen to the clue again.')}>{choice.icon}</Choice>
        )}
      </div>
    </>}
    {step === 2 && <>
      <h2>{quest.trouble}</h2>
      <div className="family-actions">
        <button onClick={() => setFeedback(quest.animal + ' still needs someone to check in. What could you try?')}>Hurry past</button>
        <button className="primary" onClick={advance}>{quest.helpful}</button>
      </div>
    </>}
    {step === 3 && <>
      <h2>{quest.outcome}</h2>
      <p>Color {quest.animal}’s scarf together.</p>
      <div className="family-swatches" role="group" aria-label="Scarf colors">
        {scarfColors.map((color, i) => <button key={color} title={colorNames[i]} aria-label={colorNames[i] + ' scarf'} aria-pressed={scarf === i} style={{ background: color }} onClick={() => setScarf(i)} />)}
      </div>
      <button className="primary" disabled={scarf === null} onClick={next}>{round === 0 ? 'Swap jobs and help again' : 'Finish the rescue'}</button>
    </>}
    <Feedback>{feedback}</Feedback>
  </>;
}
